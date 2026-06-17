package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.dto.FormI18nDTO;
import com.formdesigner.service.FormI18nService;
import com.formdesigner.vo.FormI18nVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/form-i18n")
@RequiredArgsConstructor
public class FormI18nController {

    private final FormI18nService i18nService;

    @PostMapping
    public R<Void> saveTranslation(@Valid @RequestBody FormI18nDTO dto) {
        i18nService.saveTranslation(dto);
        return R.ok();
    }

    @PostMapping("/batch/{templateId}/{language}")
    public R<Void> saveBatchTranslations(
            @PathVariable Long templateId,
            @PathVariable String language,
            @RequestBody Map<String, String> translations) {
        i18nService.saveBatchTranslations(templateId, language, translations);
        return R.ok();
    }

    @GetMapping("/translate")
    public R<String> translate(
            @RequestParam String key,
            @RequestParam String language,
            @RequestParam(required = false) String defaultValue) {
        String result = i18nService.translate(key, language, defaultValue);
        return R.ok(result);
    }

    @GetMapping("/template/{templateId}/{language}")
    public R<Map<String, String>> getTranslations(
            @PathVariable Long templateId,
            @PathVariable String language) {
        return R.ok(i18nService.getTranslations(templateId, language));
    }

    @GetMapping("/template/{templateId}")
    public R<Map<String, Map<String, String>>> getAllTranslations(@PathVariable Long templateId) {
        return R.ok(i18nService.getAllTranslations(templateId));
    }

    @GetMapping("/list/{templateId}")
    public R<List<FormI18nVO>> listTranslations(@PathVariable Long templateId) {
        return R.ok(i18nService.listTranslations(templateId));
    }

    @GetMapping("/list/{templateId}/{language}")
    public R<List<FormI18nVO>> listTranslationsByLanguage(
            @PathVariable Long templateId,
            @PathVariable String language) {
        return R.ok(i18nService.listTranslationsByLanguage(templateId, language));
    }

    @DeleteMapping("/{resourceKey}/{language}")
    public R<Void> deleteTranslation(
            @PathVariable String resourceKey,
            @PathVariable String language) {
        i18nService.deleteTranslation(resourceKey, language);
        return R.ok();
    }

    @DeleteMapping("/template/{templateId}")
    public R<Void> deleteTemplateTranslations(@PathVariable Long templateId) {
        i18nService.deleteTemplateTranslations(templateId);
        return R.ok();
    }

    @GetMapping("/supported-languages")
    public R<List<String>> getSupportedLanguages() {
        return R.ok(i18nService.getSupportedLanguages());
    }
}
