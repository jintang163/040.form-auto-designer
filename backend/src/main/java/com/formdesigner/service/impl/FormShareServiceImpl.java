package com.formdesigner.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.FormShareDTO;
import com.formdesigner.entity.FormShare;
import com.formdesigner.entity.FormTemplate;
import com.formdesigner.mapper.FormShareMapper;
import com.formdesigner.mapper.FormTemplateMapper;
import com.formdesigner.service.FormShareService;
import com.formdesigner.vo.FormShareVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FormShareServiceImpl implements FormShareService {

    private final FormShareMapper formShareMapper;
    private final FormTemplateMapper formTemplateMapper;

    @Value("${form.share.base-url:http://localhost:5173}")
    private String shareBaseUrl;

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    private String generateShareCode() {
        return RandomUtil.randomString(8).toUpperCase();
    }

    private FormShareVO toVO(FormShare share) {
        if (share == null) return null;
        FormShareVO vo = new FormShareVO();
        vo.setShareCode(share.getShareCode());
        vo.setShareUrl(shareBaseUrl + "/share/" + share.getShareCode());
        vo.setQrCodeUrl("/api/form-share/" + share.getShareCode() + "/qrcode");
        vo.setTemplateId(share.getTemplateId());
        vo.setShareType(share.getShareType());
        vo.setExpireAt(share.getExpireAt());
        vo.setHasPassword(share.getPassword() != null && !share.getPassword().isEmpty());
        vo.setAllowEdit(share.getAllowEdit());
        vo.setCreatedBy(share.getCreatedBy());
        vo.setCreatedAt(share.getCreatedAt());

        FormTemplate template = formTemplateMapper.selectById(share.getTemplateId(), share.getTenantId());
        if (template != null) {
            vo.setTemplateName(template.getTemplateName());
        }
        return vo;
    }

    @Override
    public FormShareVO createShare(FormShareDTO dto) {
        FormShare share = new FormShare();
        share.setShareCode(generateShareCode());
        share.setTemplateId(dto.getTemplateId());
        share.setShareType(dto.getShareType() != null ? dto.getShareType() : "VIEW");
        share.setAllowEdit(dto.getAllowEdit() != null ? dto.getAllowEdit() : false);
        share.setCreatedBy(dto.getCreatedBy());
        share.setTenantId(currentTenantId());
        share.setRevoked(false);
        share.setCreatedAt(LocalDateTime.now());
        share.setUpdatedAt(LocalDateTime.now());

        if (dto.getExpireHours() != null && dto.getExpireHours() > 0) {
            share.setExpireAt(LocalDateTime.now().plusHours(dto.getExpireHours()));
        }

        if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
            share.setPassword(BCrypt.hashpw(dto.getPassword()));
        }

        formShareMapper.insert(share);
        log.info("创建表单分享成功, shareCode={}, templateId={}", share.getShareCode(), dto.getTemplateId());
        return toVO(share);
    }

    @Override
    public FormShareVO getShareByCode(String shareCode) {
        FormShare share = formShareMapper.selectByShareCode(shareCode);
        if (share == null || Boolean.TRUE.equals(share.getRevoked())) {
            return null;
        }
        if (share.getExpireAt() != null && share.getExpireAt().isBefore(LocalDateTime.now())) {
            return null;
        }
        return toVO(share);
    }

    @Override
    public boolean validateShare(String shareCode, String password) {
        FormShare share = formShareMapper.selectByShareCode(shareCode);
        if (share == null || Boolean.TRUE.equals(share.getRevoked())) {
            return false;
        }
        if (share.getExpireAt() != null && share.getExpireAt().isBefore(LocalDateTime.now())) {
            return false;
        }
        if (share.getPassword() != null && !share.getPassword().isEmpty()) {
            if (password == null || password.isEmpty()) {
                return false;
            }
            return BCrypt.checkpw(password, share.getPassword());
        }
        return true;
    }

    @Override
    public boolean revokeShare(String shareCode) {
        int result = formShareMapper.revokeByShareCode(shareCode);
        log.info("撤销表单分享, shareCode={}, result={}", shareCode, result);
        return result > 0;
    }

    @Override
    public List<FormShareVO> listSharesByTemplateId(Long templateId) {
        List<FormShare> shares = formShareMapper.selectByTemplateId(templateId, currentTenantId());
        if (shares == null || shares.isEmpty()) {
            return new ArrayList<>();
        }
        return shares.stream()
                .filter(s -> !Boolean.TRUE.equals(s.getRevoked()))
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public FormShareVO refreshShareCode(String shareCode) {
        FormShare oldShare = formShareMapper.selectByShareCode(shareCode);
        if (oldShare == null) {
            return null;
        }
        String newCode = generateShareCode();
        FormShare newShare = new FormShare();
        newShare.setShareCode(newCode);
        newShare.setTemplateId(oldShare.getTemplateId());
        newShare.setShareType(oldShare.getShareType());
        newShare.setExpireAt(oldShare.getExpireAt());
        newShare.setPassword(oldShare.getPassword());
        newShare.setAllowEdit(oldShare.getAllowEdit());
        newShare.setCreatedBy(oldShare.getCreatedBy());
        newShare.setTenantId(oldShare.getTenantId());
        newShare.setRevoked(false);
        newShare.setCreatedAt(LocalDateTime.now());
        newShare.setUpdatedAt(LocalDateTime.now());

        formShareMapper.revokeByShareCode(shareCode);
        formShareMapper.insert(newShare);

        log.info("刷新分享码成功, oldCode={}, newCode={}", shareCode, newCode);
        return toVO(newShare);
    }
}
