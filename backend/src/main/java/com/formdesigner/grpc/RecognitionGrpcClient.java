package com.formdesigner.grpc;

import com.formdesigner.config.GrpcClientConfig;
import com.formdesigner.dto.RecognitionResultDTO;
import com.formdesigner.grpc.generated.RecognitionProto;
import com.formdesigner.grpc.generated.RecognitionServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PreDestroy;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class RecognitionGrpcClient {

    private final GrpcClientConfig grpcClientConfig;
    private ManagedChannel channel;

    private ManagedChannel getChannel() {
        if (channel == null || channel.isShutdown()) {
            channel = ManagedChannelBuilder
                    .forAddress(grpcClientConfig.getHost(), grpcClientConfig.getPort())
                    .usePlaintext()
                    .build();
        }
        return channel;
    }

    public RecognitionResultDTO recognize(byte[] imageBytes, String contentType) {
        ManagedChannel ch = getChannel();
        RecognitionServiceGrpc.RecognitionServiceBlockingStub stub = RecognitionServiceGrpc.newBlockingStub(ch);

        RecognitionProto.RecognizeRequest request = RecognitionProto.RecognizeRequest.newBuilder()
                .setImageData(com.google.protobuf.ByteString.copyFrom(imageBytes))
                .setContentType(contentType != null ? contentType : "")
                .build();

        RecognitionProto.RecognizeResponse response = stub.recognizeForm(request);

        RecognitionResultDTO result = new RecognitionResultDTO();
        result.setSuccess(response.getSuccess());
        result.setMessage(response.getMessage());

        List<RecognitionResultDTO.FieldItem> fields = response.getFieldsList().stream()
                .map(this::toFieldItem)
                .collect(Collectors.toList());
        result.setFields(fields);

        return result;
    }

    private RecognitionResultDTO.FieldItem toFieldItem(RecognitionProto.FieldItem item) {
        RecognitionResultDTO.FieldItem field = new RecognitionResultDTO.FieldItem();
        field.setFieldName(item.getFieldName());
        field.setFieldLabel(item.getFieldLabel());
        field.setFieldType(item.getFieldType());
        field.setInputType(item.getInputType());
        field.setRequired(item.getRequired());
        field.setDefaultValue(item.getDefaultValue());
        field.setSortOrder(item.getSortOrder());
        return field;
    }

    @PreDestroy
    public void shutdown() {
        if (channel != null && !channel.isShutdown()) {
            channel.shutdown();
        }
    }
}
