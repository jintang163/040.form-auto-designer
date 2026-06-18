package com.formdesigner.util;

import java.util.regex.Pattern;

public class DataMaskingUtil {

    private static final Pattern PHONE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");
    private static final Pattern ID_CARD_18_PATTERN = Pattern.compile("^\\d{17}[\\dXx]$");
    private static final Pattern ID_CARD_15_PATTERN = Pattern.compile("^\\d{15}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern BANK_CARD_PATTERN = Pattern.compile("^\\d{16,19}$");

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    public static String maskIdCard(String idCard) {
        if (idCard == null || idCard.length() < 8) return idCard;
        if (ID_CARD_18_PATTERN.matcher(idCard).matches()) {
            return idCard.substring(0, 6) + "********" + idCard.substring(14);
        }
        if (ID_CARD_15_PATTERN.matcher(idCard).matches()) {
            return idCard.substring(0, 6) + "*****" + idCard.substring(11);
        }
        return maskMiddle(idCard, 4, 4);
    }

    public static String maskEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) return email;
        int atIndex = email.indexOf('@');
        String username = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (username.length() <= 2) {
            return username + "***" + domain;
        }
        return username.charAt(0) + "***" + username.charAt(username.length() - 1) + domain;
    }

    public static String maskName(String name) {
        if (name == null || name.length() <= 1) return name;
        if (name.length() == 2) {
            return name.charAt(0) + "*";
        }
        StringBuilder sb = new StringBuilder();
        sb.append(name.charAt(0));
        for (int i = 1; i < name.length() - 1; i++) {
            sb.append("*");
        }
        sb.append(name.charAt(name.length() - 1));
        return sb.toString();
    }

    public static String maskBankCard(String bankCard) {
        if (bankCard == null || bankCard.length() < 8) return bankCard;
        bankCard = bankCard.replaceAll("\\s", "");
        if (!BANK_CARD_PATTERN.matcher(bankCard).matches()) return maskMiddle(bankCard, 4, 4);
        return bankCard.substring(0, 4) + " **** **** " + bankCard.substring(bankCard.length() - 4);
    }

    public static String maskAddress(String address) {
        if (address == null || address.length() < 6) return address;
        int threshold = Math.min(address.length() / 3, 6);
        return address.substring(0, address.length() - threshold) + "***";
    }

    public static String maskMiddle(String str, int keepStart, int keepEnd) {
        if (str == null) return null;
        int len = str.length();
        if (len <= keepStart + keepEnd) return str;
        StringBuilder sb = new StringBuilder();
        sb.append(str, 0, keepStart);
        for (int i = 0; i < len - keepStart - keepEnd; i++) {
            sb.append("*");
        }
        sb.append(str, len - keepEnd, len);
        return sb.toString();
    }

    public static String autoMask(String fieldName, String fieldLabel, String value) {
        if (value == null || value.isEmpty()) return value;
        String lowerName = fieldName != null ? fieldName.toLowerCase() : "";
        String lowerLabel = fieldLabel != null ? fieldLabel.toLowerCase() : "";

        if (lowerName.contains("phone") || lowerName.contains("mobile")
                || lowerLabel.contains("手机") || lowerLabel.contains("电话")) {
            if (PHONE_PATTERN.matcher(value.replaceAll("\\s", "")).matches()) {
                return maskPhone(value.replaceAll("\\s", ""));
            }
            return maskMiddle(value, 3, 4);
        }

        if (lowerName.contains("idcard") || lowerName.contains("id_card") || lowerName.contains("identity")
                || lowerLabel.contains("身份证") || lowerLabel.contains("证件号")) {
            return maskIdCard(value);
        }

        if (lowerName.contains("email") || lowerName.contains("mail")
                || lowerLabel.contains("邮箱") || lowerLabel.contains("邮件")) {
            return maskEmail(value);
        }

        if (lowerName.contains("bank") || lowerName.contains("card") || lowerName.contains("account")
                || lowerLabel.contains("银行卡") || lowerLabel.contains("账号") || lowerLabel.contains("卡号")) {
            return maskBankCard(value);
        }

        if (lowerName.contains("address") || lowerLabel.contains("地址")) {
            return maskAddress(value);
        }

        if (lowerName.contains("name") || lowerLabel.contains("姓名") || lowerLabel.contains("申请人")) {
            if (value.length() <= 10 && !value.contains(" ")) {
                return maskName(value);
            }
        }

        return maskMiddle(value, 2, 2);
    }
}
