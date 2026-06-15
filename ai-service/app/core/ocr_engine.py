import io
from typing import List, Optional

import cv2
import numpy as np
from loguru import logger
from paddleocr import PaddleOCR

from app.schemas.models import TableCell


class TableOCR:
    def __init__(self, lang: str = "ch", use_angle_cls: bool = True, use_gpu: bool = False,
                 table_model_dir: Optional[str] = None, table_char_dict_path: Optional[str] = None):
        self._lang = lang
        self._use_angle_cls = use_angle_cls
        self._use_gpu = use_gpu
        self._table_model_dir = table_model_dir
        self._table_char_dict_path = table_char_dict_path
        self._ocr: Optional[PaddleOCR] = None

    def _get_ocr(self) -> PaddleOCR:
        if self._ocr is None:
            kwargs = {
                "lang": self._lang,
                "use_angle_cls": self._use_angle_cls,
                "use_gpu": self._use_gpu,
                "show_log": False,
            }
            if self._table_model_dir:
                kwargs["table_model_dir"] = self._table_model_dir
            if self._table_char_dict_path:
                kwargs["table_char_dict_path"] = self._table_char_dict_path
            logger.info("Initializing PaddleOCR with params: {}", kwargs)
            self._ocr = PaddleOCR(**kwargs)
            logger.info("PaddleOCR initialized successfully")
        return self._ocr

    def recognize_table_image(self, image_bytes: bytes) -> List[TableCell]:
        ocr = self._get_ocr()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Failed to decode image")
            return []

        result = ocr.ocr(img, cls=True)

        if not result or not result[0]:
            logger.warning("OCR returned empty result, trying table recognition")
            return self._recognize_table_structure(img, ocr)

        cells = []
        if isinstance(result[0], list):
            for line in result[0]:
                if len(line) >= 2:
                    bbox_points = line[0]
                    text_info = line[1]
                    text = text_info[0] if isinstance(text_info, (list, tuple)) else str(text_info)
                    bbox = self._bbox_to_rect(bbox_points)
                    cells.append(TableCell(
                        text=text.strip(),
                        row=0,
                        col=0,
                        row_span=1,
                        col_span=1,
                        bbox=bbox,
                    ))

        if cells:
            cells = self._assign_grid_positions(cells)

        return cells

    def _recognize_table_structure(self, img: np.ndarray, ocr: PaddleOCR) -> List[TableCell]:
        try:
            table_result = ocr.ocr(img, cls=True)
            if not table_result or not table_result[0]:
                return []
            cells = []
            for line in table_result[0]:
                if len(line) >= 2:
                    bbox_points = line[0]
                    text_info = line[1]
                    text = text_info[0] if isinstance(text_info, (list, tuple)) else str(text_info)
                    bbox = self._bbox_to_rect(bbox_points)
                    cells.append(TableCell(
                        text=text.strip(),
                        row=0,
                        col=0,
                        bbox=bbox,
                    ))
            if cells:
                cells = self._assign_grid_positions(cells)
            return cells
        except Exception as e:
            logger.error("Table structure recognition failed: {}", e)
            return []

    @staticmethod
    def _bbox_to_rect(bbox_points) -> List[int]:
        if isinstance(bbox_points, (list, tuple)) and len(bbox_points) >= 4:
            xs = [p[0] for p in bbox_points] if isinstance(bbox_points[0], (list, tuple)) else []
            ys = [p[1] for p in bbox_points] if isinstance(bbox_points[0], (list, tuple)) else []
            if xs and ys:
                return [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))]
        return [0, 0, 0, 0]

    @staticmethod
    def _assign_grid_positions(cells: List[TableCell]) -> List[TableCell]:
        if not cells:
            return cells

        sorted_by_y = sorted(cells, key=lambda c: (c.bbox[1] if c.bbox else 0))
        row_groups = []
        current_row = [sorted_by_y[0]]
        threshold = 15

        for cell in sorted_by_y[1:]:
            prev_y = current_row[0].bbox[1] if current_row[0].bbox else 0
            curr_y = cell.bbox[1] if cell.bbox else 0
            if abs(curr_y - prev_y) <= threshold:
                current_row.append(cell)
            else:
                row_groups.append(current_row)
                current_row = [cell]
        row_groups.append(current_row)

        for row_idx, row in enumerate(row_groups):
            sorted_row = sorted(row, key=lambda c: (c.bbox[0] if c.bbox else 0))
            for col_idx, cell in enumerate(sorted_row):
                cell.row = row_idx
                cell.col = col_idx

        return cells


_table_ocr: Optional[TableOCR] = None


def get_table_ocr() -> TableOCR:
    global _table_ocr
    if _table_ocr is None:
        from app.core.config import settings
        _table_ocr = TableOCR(
            lang=settings.ocr_lang,
            use_angle_cls=settings.ocr_use_angle_cls,
            use_gpu=settings.ocr_use_gpu,
            table_model_dir=settings.table_model_dir,
            table_char_dict_path=settings.table_char_dict_path,
        )
    return _table_ocr
