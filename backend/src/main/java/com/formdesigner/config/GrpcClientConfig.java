package com.formdesigner.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "grpc.client.ai-service")
public class GrpcClientConfig {

    private String host;
    private int port;
}
