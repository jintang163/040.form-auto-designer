#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试字段类型智能推荐功能测试脚本
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.field_type_recommender import (
    FieldTypeRecommender,
    SemanticFieldDef,
    generate_field_recommendations,
)


def test_single_field_recommendation():
    """测试单个字段推荐"""
    print("=" * 60)
    print("测试1: 单个字段推荐")
    print("=" * 60)

    recommender = FieldTypeRecommender()

    test_cases = [
        {"field_name": "applyDate", "field_label": "申请日期", "input_type": "date"},
        {"field_name": "startDate", "field_label": "开始日期", "input_type": "date"},
        {"field_name": "birthday", "field_label": "出生日期", "input_type": "date"},
        {"field_name": "year", "field_label": "年份", "input_type": "text"},
        {"field_name": "month", "field_label": "月份", "input_type": "number"},
        {"field_name": "quarter", "field_label": "季度", "input_type": "select"},
        {"field_name": "createTime", "field_label": "创建时间", "input_type": "date"},
        {"field_name": "country", "field_label": "国家", "input_type": "select"},
        {"field_name": "nationality", "field_label": "民族", "input_type": "select"},
        {"field_name": "quantity", "field_label": "数量", "input_type": "number"},
        {"field_name": "priority", "field_label": "优先级", "input_type": "select"},
        {"field_name": "status", "field_label": "状态", "input_type": "select"},
        {"field_name": "phone", "field_label": "手机号", "input_type": "text"},
        {"field_name": "idCard", "field_label": "身份证号", "input_type": "text"},
        {"field_name": "email", "field_label": "邮箱", "input_type": "text"},
        {"field_name": "age", "field_label": "年龄", "input_type": "number"},
        {"field_name": "gender", "field_label": "性别", "input_type": "select"},
        {"field_name": "remark", "field_label": "备注", "input_type": "textarea"},
        {"field_name": "reason", "field_label": "申请原因", "input_type": "textarea"},
    ]

    for tc in test_cases:
        field_def = SemanticFieldDef(
            field_name=tc["field_name"],
            field_label=tc["field_label"],
            input_type=tc["input_type"],
        )
        rec = recommender.recommend_for_field(field_def)
        if rec:
            print(f"\n字段: {tc['field_label']} ({tc['field_name']})")
            print(f"  类型: {tc['input_type']}")
            print(f"  推荐值: {rec.suggested_value}")
            print(f"  置信度: {rec.confidence}")
            print(f"  来源: {rec.source}")
            print(f"  说明: {rec.explanation}")
            print(f"  填写提示: {rec.fill_hint}")
            if rec.example_values:
                print(f"  示例值: {', '.join(rec.example_values[:3])}")
        else:
            print(f"\n字段: {tc['field_label']} - 无推荐")


def test_context_aware_recommendation():
    """测试上下文感知推荐"""
    print("\n" + "=" * 60)
    print("测试2: 上下文感知推荐（根据已填字段推断")
    print("=" * 60)

    recommender = FieldTypeRecommender()

    filled_fields = {
        "name": "张伟",
        "idCard": "110101199001011234",
        "address": "北京市朝阳区建国路88号",
    }

    test_fields = [
        {"field_name": "gender", "field_label": "性别", "input_type": "select"},
        {"field_name": "age", "field_label": "年龄", "input_type": "number"},
        {"field_name": "birthday", "field_label": "出生日期", "input_type": "date"},
        {"field_name": "hometown", "field_label": "籍贯", "input_type": "text"},
        {"field_name": "zipcode", "field_label": "邮编", "input_type": "text"},
        {"field_name": "email", "field_label": "邮箱", "input_type": "text"},
    ]

    for tc in test_fields:
        field_def = SemanticFieldDef(
            field_name=tc["field_name"],
            field_label=tc["field_label"],
            input_type=tc["input_type"],
        )
        rec = recommender.recommend_for_field(field_def, filled_fields)
        if rec and rec.suggested_value:
            print(f"\n字段: {tc['field_label']}")
            print(f"  推荐值: {rec.suggested_value}")
            print(f"  置信度: {rec.confidence}")
            print(f"  来源: {rec.source}")
            print(f"  说明: {rec.explanation}")
            if rec.related_fields:
                print(f"  关联字段: {', '.join(rec.related_fields)}")


def test_form_recommendation():
    """测试表单级推荐"""
    print("\n" + "=" * 60)
    print("测试3: 表单级批量推荐")
    print("=" * 60)

    field_definitions = [
        {"fieldName": "applyDate", "fieldLabel": "申请日期", "inputType": "date"},
        {"fieldName": "name", "fieldLabel": "姓名", "inputType": "text"},
        {"fieldName": "idCard", "fieldLabel": "身份证号", "inputType": "text"},
        {"fieldName": "gender", "fieldLabel": "性别", "inputType": "select"},
        {"fieldName": "age", "fieldLabel": "年龄", "inputType": "number"},
        {"fieldName": "phone", "fieldLabel": "手机号", "inputType": "text"},
        {"fieldName": "email", "fieldLabel": "邮箱", "inputType": "text"},
        {"fieldName": "department", "fieldLabel": "部门", "inputType": "select"},
        {"fieldName": "position", "fieldLabel": "职位", "inputType": "text"},
        {"fieldName": "startDate", "fieldLabel": "入职日期", "inputType": "date"},
        {"fieldName": "salary", "fieldLabel": "薪资", "inputType": "number"},
        {"fieldName": "remark", "fieldLabel": "备注", "inputType": "textarea"},
    ]

    filled_fields = {
        "name": "李娜",
        "idCard": "310101199506201234",
    }

    results = generate_field_recommendations(field_definitions, filled_fields)

    print(f"\n已填写字段: {list(filled_fields.keys())}")
    print(f"待推荐字段数量: {len(results)}")

    for rec in results:
        print(f"\n  {rec['targetField']}: {rec['suggestedValue']} "
              f"(置信度: {rec['confidence']}, 来源: {rec['source']})")
        print(f"    说明: {rec['explanation']}")
        if rec['exampleValues']:
            print(f"    示例: {', '.join(rec['exampleValues'][:3])}")


def test_semantic_rules():
    """测试获取所有语义规则"""
    print("\n" + "=" * 60)
    print("测试4: 获取所有语义规则")
    print("=" * 60)

    recommender = FieldTypeRecommender()
    rules = recommender.get_all_semantic_rules()

    print(f"\n共有 {len(rules)} 条语义规则:")
    for rule in rules[:10]:
        print(f"\n  {rule['name']}")
        print(f"    匹配关键词: {', '.join(rule['matchKeywords'])[:50]}...")
        print(f"    匹配类型: {', '.join(rule['matchInputTypes'])}")
        print(f"    置信度: {rule['confidence']}")
        print(f"    说明: {rule['explanation']}")
    print(f"\n... 还有 {len(rules) - 10} 条规则")


def test_type_based_rules():
    """测试基于类型的规则"""
    print("\n" + "=" * 60)
    print("测试5: 基于输入类型的通用规则")
    print("=" * 60)

    test_cases = [
        {"field_name": "field1", "field_label": "日期字段", "input_type": "date"},
        {"field_name": "field2", "field_label": "数字字段", "input_type": "number"},
        {"field_name": "field3", "field_label": "文本字段", "input_type": "text"},
        {"field_name": "field4", "field_label": "多行文本", "input_type": "textarea"},
    ]

    recommender = FieldTypeRecommender()

    for tc in test_cases:
        field_def = SemanticFieldDef(**tc)
        rec = recommender.recommend_for_field(field_def)
        if rec:
            print(f"\n{tc['field_label']} ({tc['input_type']}):")
            print(f"  默认值: {rec.suggested_value}")
            print(f"  置信度: {rec.confidence}")
            print(f"  来源: {rec.source}")
            print(f"  说明: {rec.explanation}")
            print(f"  填写提示: {rec.fill_hint}")


if __name__ == "__main__":
    print("\n" + "#" * 60)
    print("# 字段类型智能推荐功能测试")
    print("#" * 60)
    print()

    try:
        test_single_field_recommendation()
        test_context_aware_recommendation()
        test_form_recommendation()
        test_semantic_rules()
        test_type_based_rules()

        print("\n" + "=" * 60)
        print("所有测试完成!")
        print("=" * 60)

    except Exception as e:
        print(f"\n测试出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
