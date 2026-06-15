import grpc

from app.grpc_proto.recognition_pb2 import (
    ImageRequest,
    WordRequest,
    RecognitionResponse,
)

RECOGNITION_SERVICE_NAME = "recognition.RecognitionService"


class RecognitionServiceServicer(object):
    def RecognizeImage(self, request, context):
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Method not implemented!")
        raise NotImplementedError("Method RecognizeImage not implemented!")

    def RecognizeWord(self, request, context):
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Method not implemented!")
        raise NotImplementedError("Method RecognizeWord not implemented!")


def add_RecognitionServiceServicer_to_server(servicer, server):
    rpc_method_handlers = {
        "RecognizeImage": grpc.method_stream_stream(
            RECOGNITION_SERVICE_NAME + ".RecognizeImage",
            request_deserializer=ImageRequest.FromString,
            response_serializer=RecognitionResponse.SerializeToString,
        ) if False else grpc.method_unary_unary(
            RECOGNITION_SERVICE_NAME + ".RecognizeImage",
            request_deserializer=ImageRequest.FromString,
            response_serializer=RecognitionResponse.SerializeToString,
        ),
        "RecognizeWord": grpc.method_unary_unary(
            RECOGNITION_SERVICE_NAME + ".RecognizeWord",
            request_deserializer=WordRequest.FromString,
            response_serializer=RecognitionResponse.SerializeToString,
        ),
    }
    generic_handler = grpc.method_service_handler(
        RECOGNITION_SERVICE_NAME,
        rpc_method_handlers,
    )
    server.add_generic_rpc_handlers((generic_handler,))


class RecognitionServiceStub(object):
    def __init__(self, channel):
        self.RecognizeImage = channel.unary_unary(
            RECOGNITION_SERVICE_NAME + ".RecognizeImage",
            request_serializer=ImageRequest.SerializeToString,
            response_deserializer=RecognitionResponse.FromString,
        )
        self.RecognizeWord = channel.unary_unary(
            RECOGNITION_SERVICE_NAME + ".RecognizeWord",
            request_serializer=WordRequest.SerializeToString,
            response_deserializer=RecognitionResponse.FromString,
        )
