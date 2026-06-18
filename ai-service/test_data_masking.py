#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据脱敏功能测试脚本
验证各种敏感字段的脱敏规则是否正确
"""

import re

def mask_phone(phone):
    """手机号脱敏"""
    if phone is None or len(phone) < 7:
        return phone
    return phone[:3] + "****" + phone[-4:]

def mask_id_card(id_card):
    """身份证脱敏"""
    if id_card is None or len(id_card) < 8:
        return id_card
    if re.match(r'^\d{17}[\dXx]$', id_card):
        return id_card[:6] + "********" + id_card[14:]
    if re.match(r'^\d{15}$', id_card):
        return id_card[:6] + "*****" + id_card[11:]
    return mask_middle(id_card, 4, 4)

def mask_email(email):
    """邮箱脱敏"""
    if email is None or not re.match(r'^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$', email):
        return email
    at_index = email.index('@')
    username = email[:at_index]
    domain = email[at_index:]
    if len(username) <= 2:
        return username + "***" + domain
    return username[0] + "***" + username[-1] + domain

def mask_name(name):
    """姓名脱敏"""
    if name is None or len(name) <= 1:
        return name
    if len(name) == 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]

def mask_bank_card(bank_card):
    """银行卡脱敏"""
    if bank_card is None or len(bank_card) < 8:
        return bank_card
    bank_card = bank_card.replace(" ", "")
    if re.match(r'^\d{16,19}$', bank_card):
        return bank_card[:4] + " **** **** " + bank_card[-4:]
    return mask_middle(bank_card, 4, 4)

def mask_address(address):
    """地址脱敏"""
    if address is None or len(address) < 6:
        return address
    threshold = min(len(address) // 3, 6)
    return address[:-threshold] + "***"

def mask_middle(s, keep_start, keep_end):
    """中间脱敏"""
    if s is None:
        return None
    length = len(s)
    if length <= keep_start + keep_end:
        return s
    return s[:keep_start] + "*" * (length - keep_start - keep_end) + s[-keep_end:]

def auto_mask(field_name, field_label, value):
    """根据字段名/标签自动脱敏"""
    if value is None or value == "":
        return value
    lower_name = field_name.lower() if field_name else ""
    lower_label = field_label.lower() if field_label else ""

    if "phone" in lower_name or "mobile" in lower_name or "手机" in lower_label or "电话" in lower_label:
        if re.match(r'^1[3-9]\d{9}$', value.replace(" ", "")):
            return mask_phone(value.replace(" ", ""))
        return mask_middle(value, 3, 4)

    if "idcard" in lower_name or "id_card" in lower_name or "identity" in lower_name or "身份证" in lower_label or "证件号" in lower_label:
        return mask_id_card(value)

    if "email" in lower_name or "mail" in lower_name or "邮箱" in lower_label or "邮件" in lower_label:
        return mask_email(value)

    if "bank" in lower_name or "card" in lower_name or "account" in lower_name or "银行卡" in lower_label or "账号" in lower_label or "卡号" in lower_label:
        return mask_bank_card(value)

    if "address" in lower_name or "地址" in lower_label:
        return mask_address(value)

    if "name" in lower_name or "姓名" in lower_label or "申请人" in lower_label:
        if len(value) <= 10 and " " not in value:
            return mask_name(value)

    return mask_middle(value, 2, 2)

def run_tests():
    print("=" * 60)
    print("数据脱敏功能测试")
    print("=" * 60)

    test_cases = [
        # (测试名称, 字段名, 字段标签, 原始值, 期望脱敏结果)
        ("手机号脱敏", "phone", "手机号", "13800138000", "138****8000"),
        ("手机号脱敏2", "mobile", "联系电话", "13912345678", "139****5678"),
        ("身份证18位", "idCard", "身份证号", "110101199001011234", "110101********1234"),
        ("身份证15位", "id_card", "身份证", "110101900101123", "110101*****1123"),
        ("邮箱脱敏", "email", "邮箱", "zhangsan@example.com", "z***n@example.com"),
        ("邮箱短用户名", "mail", "电子邮件", "ab@test.com", "ab***@test.com"),
        ("姓名脱敏2字", "name", "姓名", "张三", "张*"),
        ("姓名脱敏3字", "userName", "申请人", "王小明", "王*明"),
        ("姓名脱敏4字", "fullName", "真实姓名", "欧阳振华", "欧**华"),
        ("银行卡脱敏", "bankCard", "银行卡号", "6222021234567890123", "6222 **** **** 0123"),
        ("地址脱敏", "address", "家庭住址", "北京市朝阳区建国路88号", "北京市朝阳区****"),
        ("通用脱敏", "unknown", "其他", "abcdefghij", "ab******ij"),
        ("空值不处理", "phone", "手机号", "", ""),
        ("None不处理", "phone", "手机号", None, None),
        ("短值不处理", "phone", "手机号", "123", "123"),
    ]

    print(f"\n共 {len(test_cases)} 个测试用例")
    print("-" * 60)

    passed = 0
    failed = 0

    for i, (name, field_name, field_label, original, expected) in enumerate(test_cases, 1):
        result = auto_mask(field_name, field_label, original)
        status = "✓" if result == expected else "✗"
        if result == expected:
            passed += 1
            print(f"{status} {i:2d}. {name}: PASS")
            print(f"    原始: {original} → 脱敏: {result}")
        else:
            failed += 1
            print(f"{status} {i:2d}. {name}: FAIL")
            print(f"    原始: {original}")
            print(f"    期望: {expected}")
            print(f"    实际: {result}")

    print("-" * 60)
    print(f"测试结果: 通过 {passed}/{len(test_cases)}, 失败 {failed}/{len(test_cases)}")
    print("=" * 60)

    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
