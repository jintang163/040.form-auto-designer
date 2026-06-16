package com.formdesigner.service;

import com.formdesigner.entity.SysTenant;
import com.formdesigner.entity.SysTenantQuota;
import com.formdesigner.entity.SysTenantUser;

import java.util.List;

public interface SysTenantService {

    SysTenant getById(Long id);

    SysTenant getByCode(String tenantCode);

    List<SysTenant> listAll();

    List<SysTenant> listByStatus(String status);

    SysTenant createTenant(com.formdesigner.dto.TenantCreateDTO dto);

    SysTenant updateTenant(Long id, com.formdesigner.dto.TenantUpdateDTO dto);

    void deleteTenant(Long id);

    SysTenantQuota getQuotaByTenantId(Long tenantId);

    SysTenantQuota updateQuota(Long tenantId, com.formdesigner.dto.TenantQuotaUpdateDTO dto);

    List<SysTenantUser> getTenantUsers(Long tenantId);

    SysTenantUser addUserToTenant(Long tenantId, String userId, String userName, String role);

    void removeUserFromTenant(Long tenantId, String userId);

    List<SysTenantUser> getUserTenants(String userId);

    boolean checkQuota(Long tenantId, String quotaType);

    void incrementTemplateCount(Long tenantId, int delta);

    void incrementFormSubmissionCount(Long tenantId, int delta);

    void incrementApiCallCount(Long tenantId);

    void assertTemplateQuota(Long tenantId, int fieldCount);

    void assertFormSubmissionQuota(Long tenantId);

    void assertWebhookRuleQuota(Long tenantId);
}
