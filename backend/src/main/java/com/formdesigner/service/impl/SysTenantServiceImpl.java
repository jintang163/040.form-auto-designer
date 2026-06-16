package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.TenantCreateDTO;
import com.formdesigner.dto.TenantQuotaUpdateDTO;
import com.formdesigner.dto.TenantUpdateDTO;
import com.formdesigner.entity.SysTenant;
import com.formdesigner.entity.SysTenantQuota;
import com.formdesigner.entity.SysTenantUser;
import com.formdesigner.mapper.SysTenantMapper;
import com.formdesigner.mapper.SysTenantQuotaMapper;
import com.formdesigner.mapper.SysTenantUserMapper;
import com.formdesigner.service.SysTenantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SysTenantServiceImpl implements SysTenantService {

    private final SysTenantMapper tenantMapper;
    private final SysTenantQuotaMapper quotaMapper;
    private final SysTenantUserMapper tenantUserMapper;

    @Override
    public SysTenant getById(Long id) {
        return tenantMapper.selectById(id);
    }

    @Override
    public SysTenant getByCode(String tenantCode) {
        return tenantMapper.selectByCode(tenantCode);
    }

    @Override
    public List<SysTenant> listAll() {
        return tenantMapper.selectAll();
    }

    @Override
    public List<SysTenant> listByStatus(String status) {
        return tenantMapper.selectByStatus(status);
    }

    @Override
    @Transactional
    public SysTenant createTenant(TenantCreateDTO dto) {
        SysTenant existing = tenantMapper.selectByCode(dto.getTenantCode());
        if (existing != null) {
            throw new IllegalArgumentException("租户编码已存在: " + dto.getTenantCode());
        }

        SysTenant tenant = new SysTenant();
        tenant.setTenantCode(dto.getTenantCode());
        tenant.setTenantName(dto.getTenantName());
        tenant.setDescription(dto.getDescription());
        tenant.setTablePrefix(dto.getTablePrefix() != null ? dto.getTablePrefix() : "");
        tenant.setAdminUser(dto.getAdminUser());
        tenant.setAdminEmail(dto.getAdminEmail());
        tenant.setAdminPhone(dto.getAdminPhone());
        tenant.setStatus("ACTIVE");
        tenant.setIsSystem(0);
        tenant.setIsDeleted(0);
        tenantMapper.insert(tenant);

        SysTenantQuota quota = new SysTenantQuota();
        quota.setTenantId(tenant.getId());
        quota.setMaxTemplates(dto.getMaxTemplates() != null ? dto.getMaxTemplates() : 50);
        quota.setMaxFieldsPerTemplate(dto.getMaxFieldsPerTemplate() != null ? dto.getMaxFieldsPerTemplate() : 30);
        quota.setMaxFormSubmissions(dto.getMaxFormSubmissions() != null ? dto.getMaxFormSubmissions() : 5000);
        quota.setMaxStorageMb(dto.getMaxStorageMb() != null ? dto.getMaxStorageMb() : 512);
        quota.setMaxApiCallsDaily(dto.getMaxApiCallsDaily() != null ? dto.getMaxApiCallsDaily() : 20000);
        quota.setMaxWebhookRules(dto.getMaxWebhookRules() != null ? dto.getMaxWebhookRules() : 10);
        quotaMapper.insert(quota);

        SysTenantUser tenantUser = new SysTenantUser();
        tenantUser.setTenantId(tenant.getId());
        tenantUser.setUserId(dto.getAdminUser());
        tenantUser.setUserName(dto.getAdminUser());
        tenantUser.setRole("TENANT_ADMIN");
        tenantUserMapper.insert(tenantUser);

        log.info("Created tenant: {} [{}], admin: {}", tenant.getTenantName(), tenant.getTenantCode(), dto.getAdminUser());
        return tenant;
    }

    @Override
    @Transactional
    public SysTenant updateTenant(Long id, TenantUpdateDTO dto) {
        SysTenant tenant = tenantMapper.selectById(id);
        if (tenant == null) {
            throw new IllegalArgumentException("租户不存在: " + id);
        }
        tenant.setTenantName(dto.getTenantName());
        tenant.setDescription(dto.getDescription());
        tenant.setAdminEmail(dto.getAdminEmail());
        tenant.setAdminPhone(dto.getAdminPhone());
        if (dto.getStatus() != null) {
            tenant.setStatus(dto.getStatus());
        }
        tenantMapper.updateById(tenant);
        return tenantMapper.selectById(id);
    }

    @Override
    @Transactional
    public void deleteTenant(Long id) {
        SysTenant tenant = tenantMapper.selectById(id);
        if (tenant == null) {
            throw new IllegalArgumentException("租户不存在: " + id);
        }
        if (tenant.getIsSystem() != null && tenant.getIsSystem() == 1) {
            throw new IllegalArgumentException("系统内置租户不可删除");
        }
        tenantMapper.deleteById(id);
        log.info("Deleted tenant: {} [{}]", tenant.getTenantName(), tenant.getTenantCode());
    }

    @Override
    public SysTenantQuota getQuotaByTenantId(Long tenantId) {
        return quotaMapper.selectByTenantId(tenantId);
    }

    @Override
    @Transactional
    public SysTenantQuota updateQuota(Long tenantId, TenantQuotaUpdateDTO dto) {
        SysTenantQuota quota = quotaMapper.selectByTenantId(tenantId);
        if (quota == null) {
            throw new IllegalArgumentException("租户配额不存在: " + tenantId);
        }
        if (dto.getMaxTemplates() != null) quota.setMaxTemplates(dto.getMaxTemplates());
        if (dto.getMaxFieldsPerTemplate() != null) quota.setMaxFieldsPerTemplate(dto.getMaxFieldsPerTemplate());
        if (dto.getMaxFormSubmissions() != null) quota.setMaxFormSubmissions(dto.getMaxFormSubmissions());
        if (dto.getMaxStorageMb() != null) quota.setMaxStorageMb(dto.getMaxStorageMb());
        if (dto.getMaxApiCallsDaily() != null) quota.setMaxApiCallsDaily(dto.getMaxApiCallsDaily());
        if (dto.getMaxWebhookRules() != null) quota.setMaxWebhookRules(dto.getMaxWebhookRules());
        quotaMapper.updateByTenantId(quota);
        return quotaMapper.selectByTenantId(tenantId);
    }

    @Override
    public List<SysTenantUser> getTenantUsers(Long tenantId) {
        return tenantUserMapper.selectByTenantId(tenantId);
    }

    @Override
    @Transactional
    public SysTenantUser addUserToTenant(Long tenantId, String userId, String userName, String role) {
        SysTenantUser existing = tenantUserMapper.selectByTenantIdAndUserId(tenantId, userId);
        if (existing != null) {
            throw new IllegalArgumentException("用户已在租户中: " + userId);
        }
        SysTenantUser tenantUser = new SysTenantUser();
        tenantUser.setTenantId(tenantId);
        tenantUser.setUserId(userId);
        tenantUser.setUserName(userName);
        tenantUser.setRole(role != null ? role : "USER");
        tenantUserMapper.insert(tenantUser);
        return tenantUser;
    }

    @Override
    @Transactional
    public void removeUserFromTenant(Long tenantId, String userId) {
        tenantUserMapper.deleteByTenantIdAndUserId(tenantId, userId);
    }

    @Override
    public List<SysTenantUser> getUserTenants(String userId) {
        return tenantUserMapper.selectByUserId(userId);
    }

    @Override
    public boolean checkQuota(Long tenantId, String quotaType) {
        SysTenantQuota quota = quotaMapper.selectByTenantId(tenantId);
        if (quota == null) {
            return false;
        }
        switch (quotaType) {
            case "templates":
                return quota.getCurrentTemplates() < quota.getMaxTemplates();
            case "formSubmissions":
                return quota.getCurrentFormSubmissions() < quota.getMaxFormSubmissions();
            case "apiCalls":
                return quota.getCurrentApiCallsDaily() < quota.getMaxApiCallsDaily();
            case "storage":
                return quota.getCurrentStorageMb().compareTo(BigDecimal.valueOf(quota.getMaxStorageMb())) < 0;
            default:
                return true;
        }
    }

    @Override
    public void incrementTemplateCount(Long tenantId, int delta) {
        quotaMapper.incrementTemplateCount(tenantId, delta);
    }

    @Override
    public void incrementFormSubmissionCount(Long tenantId, int delta) {
        quotaMapper.incrementFormSubmissionCount(tenantId, delta);
    }

    @Override
    public void incrementApiCallCount(Long tenantId) {
        String today = java.time.LocalDate.now().toString();
        quotaMapper.incrementApiCallCount(tenantId, today);
    }

    @Override
    public void assertTemplateQuota(Long tenantId, int fieldCount) {
        SysTenantQuota quota = quotaMapper.selectByTenantId(tenantId);
        if (quota == null) {
            throw new IllegalArgumentException("租户配额不存在");
        }
        if (quota.getCurrentTemplates() >= quota.getMaxTemplates()) {
            throw new IllegalArgumentException(String.format(
                "模板数量已达上限：当前 %d / 上限 %d",
                quota.getCurrentTemplates(), quota.getMaxTemplates()
            ));
        }
        if (fieldCount > quota.getMaxFieldsPerTemplate()) {
            throw new IllegalArgumentException(String.format(
                "单模板字段数超出上限：当前 %d / 上限 %d",
                fieldCount, quota.getMaxFieldsPerTemplate()
            ));
        }
    }

    @Override
    public void assertFormSubmissionQuota(Long tenantId) {
        SysTenantQuota quota = quotaMapper.selectByTenantId(tenantId);
        if (quota == null) {
            throw new IllegalArgumentException("租户配额不存在");
        }
        if (quota.getCurrentFormSubmissions() >= quota.getMaxFormSubmissions()) {
            throw new IllegalArgumentException(String.format(
                "填报次数已达上限：当前 %d / 上限 %d",
                quota.getCurrentFormSubmissions(), quota.getMaxFormSubmissions()
            ));
        }
    }

    @Override
    public void assertWebhookRuleQuota(Long tenantId) {
        SysTenantQuota quota = quotaMapper.selectByTenantId(tenantId);
        if (quota == null) {
            throw new IllegalArgumentException("租户配额不存在");
        }
    }
}
