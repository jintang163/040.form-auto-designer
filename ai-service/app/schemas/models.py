from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class InputType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    FILE = "file"
    TEXTAREA = "textarea"
    PHONE = "phone"
    EMAIL = "email"
    ID_CARD = "id_card"


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class LayoutPosition(BaseModel):
    row: int
    col: int
    row_span: int = 1
    col_span: int = 1


class ValidationRule(BaseModel):
    rule_type: str
    params: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class TableCell(BaseModel):
    text: str = ""
    row: int
    col: int
    row_span: int = 1
    col_span: int = 1
    bbox: Optional[List[int]] = Field(None, description="[x1, y1, x2, y2]")


class TableStructure(BaseModel):
    rows: int
    cols: int
    cells: List[TableCell] = Field(default_factory=list)
    merged_cells: List[Dict[str, Any]] = Field(default_factory=list)


class FieldDefinition(BaseModel):
    name: str
    label: str
    input_type: InputType = InputType.TEXT
    required: bool = False
    validation_rules: List[ValidationRule] = Field(default_factory=list)
    layout_position: LayoutPosition
    options: Optional[List[str]] = None
    default_value: Optional[Any] = None
    placeholder: Optional[str] = None


class FormSchema(BaseModel):
    type: str = "object"
    title: str = ""
    properties: Dict[str, Any] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)
    x_component: Optional[str] = None
    x_component_props: Optional[Dict[str, Any]] = None
    x_decorator: Optional[str] = None
    x_decorator_props: Optional[Dict[str, Any]] = None


class RecognitionTask(BaseModel):
    task_id: str
    file_type: str
    status: TaskStatus = TaskStatus.PENDING
    progress: int = 0
    created_at: str = ""
    updated_at: str = ""


class RecognitionResult(BaseModel):
    task_id: str
    status: TaskStatus
    progress: int = 0
    schema: Optional[Dict[str, Any]] = None
    table_structures: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
