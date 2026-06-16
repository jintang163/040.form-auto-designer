package com.formdesigner.vo;

import com.formdesigner.entity.FormVersion;
import lombok.Data;
import java.util.List;

@Data
public class VersionCompareResultVO {

    private FormVersion sourceVersion;
    private FormVersion targetVersion;
    private List<FieldDiffVO> addedFields;
    private List<FieldDiffVO> removedFields;
    private List<FieldDiffVO> modifiedFields;
}
