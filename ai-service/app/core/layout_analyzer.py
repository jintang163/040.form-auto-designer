import re
from typing import List, Optional

from loguru import logger

from app.schemas.models import FieldDefinition, InputType, LayoutPosition, TableCell, ValidationRule, TableStructure

_TYPE_KEYWORDS = {
    InputType.PHONE: ["手机", "电话", "联系方式", "手机号", "联系电话", "tel", "phone", "mobile"],
    InputType.EMAIL: ["邮箱", "email", "邮件", "e-mail", "电子邮件"],
    InputType.DATE: ["日期", "时间", "date", "time", "出生日期", "入职日期", "截止日期", "生效日期", "开始日期", "结束日期", "申请日期"],
    InputType.NUMBER: ["数量", "金额", "价格", "数量", "年龄", "工资", "薪金", "编号", "序号", "count", "amount", "price", "age", "salary", "no", "num"],
    InputType.FILE: ["附件", "文件", "上传", "照片", "图片", "file", "upload", "attachment", "照片"],
    InputType.SELECT: ["性别", "类型", "类别", "等级", "状态", "级别", "部门", "岗位", "职务", "学历", "民族", "婚否", "是否", "gender", "type", "category", "status", "level"],
    InputType.MULTI_SELECT: ["多选", "多种", "勾选", "multi", "multiple"],
    InputType.ID_CARD: ["身份证", "证件号", "身份证号", "idcard", "id_card", "身份号"],
    InputType.TEXTAREA: ["描述", "说明", "备注", "详情", "简介", "地址", "住址", "详细地址", "description", "remark", "address", "detail", "summary"],
}

_SELECT_OPTIONS = {
    "性别": ["男", "女"],
    "婚否": ["是", "否"],
    "是否": ["是", "否"],
    "学历": ["小学", "初中", "高中", "大专", "本科", "硕士", "博士"],
    "状态": ["启用", "禁用"],
}

_REQUIRED_KEYWORDS = ["必填", "必选", "required", "*", "（必填）", "(必填)", "【必填】"]

_LABEL_NOISE = re.compile(r"[:：*＊\s]+$")


def analyze_layout(cells: List[TableCell], table_structure: Optional[TableStructure] = None) -> List[FieldDefinition]:
    if not cells:
        return []

    fields: List[FieldDefinition] = []
    label_cells, value_cells = _classify_cells(cells)

    if _is_label_value_layout(cells):
        fields = _process_label_value_layout(label_cells, value_cells, cells)
    else:
        fields = _process_grid_layout(cells)

    return fields


def _classify_cells(cells: List[TableCell]):
    label_cells = []
    value_cells = []
    for cell in cells:
        text = cell.text.strip()
        if not text:
            value_cells.append(cell)
            continue
        is_label = _looks_like_label(text)
        if is_label:
            label_cells.append(cell)
        else:
            value_cells.append(cell)
    return label_cells, value_cells


def _looks_like_label(text: str) -> bool:
    clean = _LABEL_NOISE.sub("", text)
    if not clean:
        return False
    if clean.endswith(("：", ":", "：")):
        return True
    for kw in _REQUIRED_KEYWORDS:
        if kw in text:
            return True
    if len(clean) <= 8 and not re.search(r'\d{4,}', clean):
        return True
    return False


def _is_label_value_layout(cells: List[TableCell]) -> bool:
    if not cells:
        return False
    max_col = max(c.col for c in cells)
    if max_col < 1:
        return False
    col_0_texts = [c for c in cells if c.col == 0 and c.text.strip()]
    if not col_0_texts:
        return False
    label_ratio = sum(1 for c in col_0_texts if _looks_like_label(c.text)) / len(col_0_texts)
    return label_ratio > 0.5


def _process_label_value_layout(label_cells, value_cells, all_cells) -> List[FieldDefinition]:
    fields = []
    for label_cell in label_cells:
        label_text = _LABEL_NOISE.sub("", label_cell.text.strip())
        if not label_text:
            continue

        input_type = _infer_input_type(label_text)
        is_required = _check_required(label_cell.text)
        validation_rules = _infer_validation_rules(label_text, input_type)
        options = _infer_options(label_text)

        field_name = _generate_field_name(label_text)
        position = LayoutPosition(
            row=label_cell.row,
            col=label_cell.col,
            row_span=label_cell.row_span,
            col_span=label_cell.col_span,
        )

        field = FieldDefinition(
            name=field_name,
            label=label_text,
            input_type=input_type,
            required=is_required,
            validation_rules=validation_rules,
            layout_position=position,
            options=options,
            placeholder=f"请输入{label_text}",
        )
        fields.append(field)

    return fields


def _process_grid_layout(cells: List[TableCell]) -> List[FieldDefinition]:
    fields = []
    row_groups: dict = {}
    for cell in cells:
        if cell.row not in row_groups:
            row_groups[cell.row] = []
        row_groups[cell.row].append(cell)

    for row_idx in sorted(row_groups.keys()):
        row_cells = sorted(row_groups[row_idx], key=lambda c: c.col)
        for i in range(0, len(row_cells) - 1, 2):
            label_cell = row_cells[i]
            label_text = _LABEL_NOISE.sub("", label_cell.text.strip())
            if not label_text:
                continue

            input_type = _infer_input_type(label_text)
            is_required = _check_required(label_cell.text)
            validation_rules = _infer_validation_rules(label_text, input_type)
            options = _infer_options(label_text)
            field_name = _generate_field_name(label_text)

            position = LayoutPosition(
                row=label_cell.row,
                col=label_cell.col,
                row_span=label_cell.row_span,
                col_span=label_cell.col_span,
            )

            field = FieldDefinition(
                name=field_name,
                label=label_text,
                input_type=input_type,
                required=is_required,
                validation_rules=validation_rules,
                layout_position=position,
                options=options,
                placeholder=f"请输入{label_text}",
            )
            fields.append(field)

        if len(row_cells) % 2 == 1:
            last = row_cells[-1]
            label_text = _LABEL_NOISE.sub("", last.text.strip())
            if label_text and _looks_like_label(label_text):
                input_type = _infer_input_type(label_text)
                is_required = _check_required(last.text)
                validation_rules = _infer_validation_rules(label_text, input_type)
                options = _infer_options(label_text)
                field_name = _generate_field_name(label_text)
                position = LayoutPosition(row=last.row, col=last.col, row_span=last.row_span, col_span=last.col_span)
                fields.append(FieldDefinition(
                    name=field_name, label=label_text, input_type=input_type,
                    required=is_required, validation_rules=validation_rules,
                    layout_position=position, options=options,
                    placeholder=f"请输入{label_text}",
                ))

    return fields


def _infer_input_type(label: str) -> InputType:
    label_lower = label.lower()
    for input_type, keywords in _TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in label_lower:
                return input_type
    return InputType.TEXT


def _check_required(text: str) -> bool:
    for kw in _REQUIRED_KEYWORDS:
        if kw in text:
            return True
    return False


def _infer_validation_rules(label: str, input_type: InputType) -> List[ValidationRule]:
    rules = []
    if input_type == InputType.PHONE:
        rules.append(ValidationRule(
            rule_type="pattern",
            params={"pattern": "^1[3-9]\\d{9}$"},
            message="请输入正确的手机号",
        ))
    elif input_type == InputType.EMAIL:
        rules.append(ValidationRule(
            rule_type="pattern",
            params={"pattern": "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$"},
            message="请输入正确的邮箱地址",
        ))
    elif input_type == InputType.ID_CARD:
        rules.append(ValidationRule(
            rule_type="pattern",
            params={"pattern": "^\\d{17}[\\dXx]$"},
            message="请输入正确的身份证号",
        ))
    elif input_type == InputType.NUMBER:
        rules.append(ValidationRule(rule_type="type", params={"type": "number"}, message="请输入数字"))
    return rules


def _infer_options(label: str) -> Optional[List[str]]:
    for key, opts in _SELECT_OPTIONS.items():
        if key in label:
            return opts
    return None


def _generate_field_name(label: str) -> str:
    clean = _LABEL_NOISE.sub("", label.strip())
    pinyin_map = {
        "姓名": "name", "名称": "name", "名字": "name",
        "手机": "phone", "电话": "phone", "联系方式": "phone",
        "邮箱": "email", "邮件": "email",
        "性别": "gender",
        "年龄": "age",
        "地址": "address", "住址": "address",
        "日期": "date", "时间": "time",
        "备注": "remark", "说明": "remark",
        "数量": "count", "金额": "amount", "价格": "price",
        "部门": "department",
        "岗位": "position", "职务": "position",
        "学历": "education",
        "身份证": "id_card", "证件号": "id_card",
        "附件": "attachment", "文件": "file",
        "描述": "description", "详情": "description",
        "状态": "status",
        "类型": "type", "类别": "category",
        "等级": "level", "级别": "level",
        "婚否": "marital",
        "民族": "ethnicity",
        "出生日期": "birth_date",
        "入职日期": "entry_date",
        "工资": "salary", "薪金": "salary",
    }
    if clean in pinyin_map:
        return pinyin_map[clean]

    import hashlib
    h = hashlib.md5(clean.encode()).hexdigest()[:8]
    return f"field_{h}"
