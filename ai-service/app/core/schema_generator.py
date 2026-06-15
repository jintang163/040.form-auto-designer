from typing import Any, Dict, List, Optional

from loguru import logger

from app.schemas.models import FieldDefinition, FormSchema, InputType, TableStructure, ValidationRule


_COMPONENT_MAP = {
    InputType.TEXT: "Input",
    InputType.NUMBER: "NumberPicker",
    InputType.DATE: "DatePicker",
    InputType.SELECT: "Select",
    InputType.MULTI_SELECT: "Select",
    InputType.FILE: "Upload",
    InputType.TEXTAREA: "Input.TextArea",
    InputType.PHONE: "Input",
    InputType.EMAIL: "Input",
    InputType.ID_CARD: "Input",
}

_DECORATOR_MAP = {
    InputType.TEXT: "FormItem",
    InputType.NUMBER: "FormItem",
    InputType.DATE: "FormItem",
    InputType.SELECT: "FormItem",
    InputType.MULTI_SELECT: "FormItem",
    InputType.FILE: "FormItem",
    InputType.TEXTAREA: "FormItem",
    InputType.PHONE: "FormItem",
    InputType.EMAIL: "FormItem",
    InputType.ID_CARD: "FormItem",
}


def generate_form_schema(fields: List[FieldDefinition], table_structure: Optional[TableStructure] = None) -> dict:
    if not fields:
        return _empty_schema()

    properties: Dict[str, Any] = {}
    required_fields: List[str] = []
    grid_layout = _build_grid_layout(fields)

    for field in fields:
        prop = _field_to_property(field)
        properties[field.name] = prop
        if field.required:
            required_fields.append(field.name)

    schema = {
        "type": "object",
        "title": "自动识别表单",
        "properties": {
            "layout": {
                "type": "void",
                "x-component": "FormLayout",
                "x-component-props": {
                    "labelCol": 6,
                    "wrapperCol": 16,
                    "layout": "vertical",
                },
                "properties": {
                    "grid": {
                        "type": "void",
                        "x-component": "FormGrid",
                        "x-component-props": {
                            "maxColumns": _get_max_columns(fields),
                            "minColumns": 1,
                            "columnGap": 16,
                            "rowGap": 16,
                        },
                        "properties": properties,
                    }
                },
            }
        },
        "required": required_fields,
        "x-designable-id": "root",
    }

    if grid_layout:
        schema["properties"]["layout"]["properties"]["grid"]["x-component-props"]["gridTemplateColumns"] = grid_layout

    if table_structure:
        schema["x-table-meta"] = {
            "rows": table_structure.rows,
            "cols": table_structure.cols,
            "merged_cells": table_structure.merged_cells,
        }

    return schema


def _empty_schema() -> dict:
    return {
        "type": "object",
        "title": "自动识别表单",
        "properties": {},
        "required": [],
    }


def _field_to_property(field: FieldDefinition) -> dict:
    component = _COMPONENT_MAP.get(field.input_type, "Input")
    decorator = _DECORATOR_MAP.get(field.input_type, "FormItem")

    prop: Dict[str, Any] = {
        "type": _json_type(field.input_type),
        "title": field.label,
        "x-decorator": decorator,
        "x-decorator-props": {},
        "x-component": component,
        "x-component-props": _build_component_props(field),
        "x-designable-id": field.name,
    }

    if field.input_type == InputType.MULTI_SELECT:
        prop["x-component-props"]["multiple"] = True

    if field.options:
        prop["enum"] = [{"label": opt, "value": opt} for opt in field.options]

    if field.default_value is not None:
        prop["default"] = field.default_value

    if field.placeholder:
        prop["x-component-props"]["placeholder"] = field.placeholder

    if field.validation_rules:
        prop["x-validator"] = [_rule_to_validator(r) for r in field.validation_rules]

    if field.layout_position:
        col_span = field.layout_position.col_span
        row_span = field.layout_position.row_span
        if col_span > 1 or row_span > 1:
            prop["x-component-props"]["gridColumnStart"] = f"span {min(col_span, 2)}"
        prop["x-index"] = field.layout_position.row * 100 + field.layout_position.col

    return prop


def _json_type(input_type: InputType) -> str:
    if input_type == InputType.NUMBER:
        return "number"
    if input_type in (InputType.SELECT, InputType.MULTI_SELECT):
        return "string"
    return "string"


def _build_component_props(field: FieldDefinition) -> dict:
    props: Dict[str, Any] = {}

    if field.input_type == InputType.DATE:
        props["format"] = "YYYY-MM-DD"
        props["style"] = {"width": "100%"}
    elif field.input_type == InputType.NUMBER:
        props["style"] = {"width": "100%"}
    elif field.input_type == InputType.FILE:
        props["action"] = "/api/upload"
        props["listType"] = "card"
    elif field.input_type == InputType.PHONE:
        props["maxLength"] = 11
        props["style"] = {"width": "100%"}
    elif field.input_type == InputType.ID_CARD:
        props["maxLength"] = 18
        props["style"] = {"width": "100%"}

    return props


def _build_grid_layout(fields: List[FieldDefinition]) -> Optional[str]:
    if not fields:
        return None
    max_col = max(f.layout_position.col for f in fields)
    col_count = max_col + 1
    col_width = 100 // col_count
    return " ".join([f"{col_width}fr"] * col_count)


def _get_max_columns(fields: List[FieldDefinition]) -> int:
    if not fields:
        return 1
    max_col = max(f.layout_position.col for f in fields)
    return max_col + 1


def _rule_to_validator(rule: ValidationRule) -> dict:
    validator: Dict[str, Any] = {}
    if rule.rule_type == "pattern":
        validator["pattern"] = rule.params.get("pattern", "") if rule.params else ""
    elif rule.rule_type == "type":
        validator["type"] = rule.params.get("type", "string") if rule.params else "string"
    if rule.message:
        validator["message"] = rule.message
    return validator
