package com.formdesigner.vo;

import lombok.Data;

@Data
public class SpeechResultVO {

    private String text;
    private Double confidence;
    private String source;
    private Long duration;

    public SpeechResultVO() {
    }

    public SpeechResultVO(String text, Double confidence) {
        this.text = text;
        this.confidence = confidence;
    }
}
