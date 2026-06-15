import io
from typing import List

from docx import Document
from docx.table import Table as DocxTable
from loguru import logger

from app.schemas.models import TableCell, TableStructure


def parse_word_tables(file_bytes: bytes) -> List[TableStructure]:
    try:
        doc = Document(io.BytesIO(file_bytes))
    except Exception as e:
        logger.error("Failed to parse Word document: {}", e)
        return []

    tables: List[TableStructure] = []
    for table in doc.tables:
        structure = _parse_single_table(table)
        if structure:
            tables.append(structure)
    return tables


def _parse_single_table(table: DocxTable) -> TableStructure:
    rows = len(table.rows)
    cols = len(table.columns)
    if rows == 0 or cols == 0:
        return TableStructure(rows=0, cols=0)

    grid = [[None for _ in range(cols)] for _ in range(rows)]
    cells: List[TableCell] = []
    merged_cells = []

    for row_idx, row in enumerate(table.rows):
        for cell in row.cells:
            grid_pos = _find_cell_position(grid, row_idx, cols)
            if grid_pos is None:
                continue

            actual_row, start_col = grid_pos
            text = cell.text.strip() if cell.text else ""

            row_span = 1
            col_span = 1

            tc = cell._tc
            grid_span = tc.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}gridSpan")
            if grid_span is not None:
                val = grid_span.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val")
                if val:
                    col_span = int(val)

            v_merge = tc.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}vMerge")
            if v_merge is not None:
                restart = v_merge.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val")
                if restart == "restart":
                    row_span = _count_vertical_merge(table, row_idx, start_col)
                elif restart is None:
                    continue

            for r in range(actual_row, min(actual_row + row_span, rows)):
                for c in range(start_col, min(start_col + col_span, cols)):
                    grid[r][c] = True

            cell_model = TableCell(
                text=text,
                row=actual_row,
                col=start_col,
                row_span=row_span,
                col_span=col_span,
            )
            cells.append(cell_model)

            if row_span > 1 or col_span > 1:
                merged_cells.append({
                    "row": actual_row,
                    "col": start_col,
                    "row_span": row_span,
                    "col_span": col_span,
                    "text": text,
                })

    return TableStructure(rows=rows, cols=cols, cells=cells, merged_cells=merged_cells)


def _find_cell_position(grid, start_row: int, max_cols: int):
    for r in range(start_row, len(grid)):
        for c in range(max_cols):
            if grid[r][c] is None:
                return r, c
    return None


def _count_vertical_merge(table: DocxTable, start_row: int, col: int) -> int:
    count = 1
    for r in range(start_row + 1, len(table.rows)):
        if col < len(table.rows[r].cells):
            tc = table.rows[r].cells[col]._tc
            v_merge = tc.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}vMerge")
            if v_merge is not None:
                restart = v_merge.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val")
                if restart == "restart":
                    break
                count += 1
            else:
                break
        else:
            break
    return count
