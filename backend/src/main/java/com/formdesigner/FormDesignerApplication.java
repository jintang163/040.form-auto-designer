package com.formdesigner;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.formdesigner.mapper")
public class FormDesignerApplication {

    public static void main(String[] args) {
        SpringApplication.run(FormDesignerApplication.class, args);
    }
}
