package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.service.SmartRecommendService;
import com.formdesigner.vo.FieldRecommendationVO;
import com.formdesigner.vo.FormRecommendationVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/smart-recommend")
@RequiredArgsConstructor
public class SmartRecommendController {

    private final SmartRecommendService smartRecommendService;

    @GetMapping("/form/{templateId}")
    public R<FormRecommendationVO> getFormRecommendations(
            @PathVariable Long templateId,
            @RequestParam(required = false) String submitterId) {
        return R.ok(smartRecommendService.getRecommendations(templateId, submitterId));
    }

    @GetMapping("/field")
    public R<List<FieldRecommendationVO>> getFieldRecommendations(
            @RequestParam Long templateId,
            @RequestParam String fieldName,
            @RequestParam(required = false) String submitterId) {
        FieldRecommendationVO vo = smartRecommendService.getFieldRecommendations(templateId, fieldName, submitterId);
        return R.ok(vo != null ? List.of(vo) : List.of());
    }

    @PostMapping("/rebuild/{templateId}")
    public R<Void> rebuildStats(@PathVariable Long templateId) {
        smartRecommendService.rebuildStats(templateId);
        return R.ok();
    }
}
