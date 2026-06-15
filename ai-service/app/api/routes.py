import os
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from loguru import logger

from app.core.config import settings
from app.core.document_parser import parse_word_tables
from app.core.layout_analyzer import analyze_layout
from app.core.ocr_engine import get_table_ocr
from app.core.schema_generator import generate_form_schema
from app.core.task_manager import get_task_manager
from app.schemas.models import TaskStatus

router = APIRouter(prefix="/api/recognize", tags=["recognize"])

ALLOWED_EXTENSIONS = {".docx", ".doc", ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp", ".pdf"}
WORD_EXTENSIONS = {".docx", ".doc"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}


async def _process_image_task(task_id: str, file_bytes: bytes):
    tm = get_task_manager()
    try:
        tm.update_task_status(task_id, TaskStatus.PROCESSING, progress=10)

        ocr = get_table_ocr()
        tm.update_task_status(task_id, TaskStatus.PROCESSING, progress=30)

        cells = ocr.recognize_table_image(file_bytes)
        tm.update_task_status(task_id, TaskStatus.PROCESSING, progress=60)

        from app.schemas.models import TableStructure
        max_row = max((c.row for c in cells), default=0) + 1 if cells else 0
        max_col = max((c.col for c in cells), default=0) + 1 if cells else 0
        table_structure = TableStructure(rows=max_row, cols=max_col, cells=cells)

        fields = analyze_layout(cells, table_structure)
        tm.update_task_status(task_id, TaskStatus.PROCESSING, progress=80)

        schema = generate_form_schema(fields, table_structure)
        tm.update_task_status(task_id, TaskStatus.COMPLETED, progress=100, result=schema)

    except Exception as e:
        logger.exception("Image processing failed for task {}", task_id)
        tm.update_task_status(task_id, TaskStatus.FAILED, progress=0, error=str(e))


async def _process_word_task(task_id: str, file_bytes: bytes):
    tm = get_task_manager()
    try:
        tm.update_task_status(task_id, TaskStatus.PROCESSING, progress=10)

        tables = parse_word_tables(file_bytes)
        tm.update_task_status(task_id, TaskStatus.PROCESSING, progress=40)

        if not tables:
            tm.update_task_status(task_id, TaskStatus.COMPLETED, progress=100, result={
                "type": "object", "title": "自动识别表单", "properties": {}, "required": []
            })
            return

        all_schemas = []
        for i, table in enumerate(tables):
            tm.update_task_status(task_id, TaskStatus.PROCESSING, progress=40 + int(40 * i / len(tables)))
            fields = analyze_layout(table.cells, table)
            schema = generate_form_schema(fields, table)
            all_schemas.append(schema)

        final_schema = all_schemas[0] if len(all_schemas) == 1 else {
            "type": "object",
            "title": "自动识别表单",
            "properties": {
                f"table_{i}": s for i, s in enumerate(all_schemas)
            },
            "required": [],
        }
        tm.update_task_status(task_id, TaskStatus.COMPLETED, progress=100, result=final_schema)

    except Exception as e:
        logger.exception("Word processing failed for task {}", task_id)
        tm.update_task_status(task_id, TaskStatus.FAILED, progress=0, error=str(e))


@router.post("/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    file_bytes = await file.read()
    if len(file_bytes) > settings.max_upload_size:
        raise HTTPException(status_code=400, detail="File too large")

    file_type = "word" if ext in WORD_EXTENSIONS else "image"

    tm = get_task_manager()
    task_id = tm.create_task(file_type)

    if file_type == "word":
        background_tasks.add_task(_process_word_task, task_id, file_bytes)
    else:
        background_tasks.add_task(_process_image_task, task_id, file_bytes)

    return {"task_id": task_id, "file_type": file_type, "status": "pending"}


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    tm = get_task_manager()
    task = tm.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "task_id": task.task_id,
        "status": task.status.value,
        "progress": task.progress,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


@router.get("/result/{task_id}")
async def get_result(task_id: str):
    tm = get_task_manager()
    result = tm.get_result(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    if result.status == TaskStatus.PENDING or result.status == TaskStatus.PROCESSING:
        raise HTTPException(status_code=202, detail="Task still processing")
    if result.status == TaskStatus.FAILED:
        return {"task_id": task_id, "status": "failed", "error": result.error}
    return {
        "task_id": task_id,
        "status": "completed",
        "schema": result.schema,
    }
