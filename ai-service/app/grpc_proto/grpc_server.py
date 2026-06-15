import json
from concurrent import futures
from typing import Optional

import grpc
from loguru import logger

from app.core.config import settings
from app.core.document_parser import parse_word_tables
from app.core.layout_analyzer import analyze_layout
from app.core.ocr_engine import get_table_ocr
from app.core.schema_generator import generate_form_schema


class RecognitionServicer:
    def __init__(self):
        pass

    def RecognizeImage(self, request, context):
        try:
            ocr = get_table_ocr()
            cells = ocr.recognize_table_image(request.image_data)

            from app.schemas.models import TableStructure
            max_row = max((c.row for c in cells), default=0) + 1 if cells else 0
            max_col = max((c.col for c in cells), default=0) + 1 if cells else 0
            table_structure = TableStructure(rows=max_row, cols=max_col, cells=cells)

            fields = analyze_layout(cells, table_structure)
            schema = generate_form_schema(fields, table_structure)

            response = _build_response(schema, [table_structure], fields)
            return response

        except Exception as e:
            logger.exception("RecognizeImage failed")
            from app.grpc_proto import recognition_pb2
            return recognition_pb2.RecognitionResponse(success=False, error=str(e))

    def RecognizeWord(self, request, context):
        try:
            tables = parse_word_tables(request.file_data)

            all_schemas = []
            all_fields = []
            for table in tables:
                fields = analyze_layout(table.cells, table)
                schema = generate_form_schema(fields, table)
                all_schemas.append(schema)
                all_fields.extend(fields)

            if not tables:
                schema = {"type": "object", "title": "自动识别表单", "properties": {}, "required": []}
                response = _build_response(schema, [], [])
            elif len(tables) == 1:
                response = _build_response(all_schemas[0], tables, all_fields)
            else:
                combined_schema = {
                    "type": "object",
                    "title": "自动识别表单",
                    "properties": {f"table_{i}": s for i, s in enumerate(all_schemas)},
                    "required": [],
                }
                response = _build_response(combined_schema, tables, all_fields)

            return response

        except Exception as e:
            logger.exception("RecognizeWord failed")
            from app.grpc_proto import recognition_pb2
            return recognition_pb2.RecognitionResponse(success=False, error=str(e))


def _build_response(schema: dict, tables, fields):
    from app.grpc_proto import recognition_pb2

    table_protos = []
    for t in tables:
        cells_protos = []
        for c in t.cells:
            cell_proto = recognition_pb2.TableCellProto(
                text=c.text,
                row=c.row,
                col=c.col,
                row_span=c.row_span,
                col_span=c.col_span,
                bbox=c.bbox if c.bbox else [],
            )
            cells_protos.append(cell_proto)
        table_proto = recognition_pb2.TableStructureProto(
            rows=t.rows,
            cols=t.cols,
            cells=cells_protos,
        )
        table_protos.append(table_proto)

    field_protos = []
    for f in fields:
        field_proto = recognition_pb2.FieldDefinitionProto(
            name=f.name,
            label=f.label,
            input_type=f.input_type.value if hasattr(f.input_type, 'value') else str(f.input_type),
            required=f.required,
            row=f.layout_position.row,
            col=f.layout_position.col,
            row_span=f.layout_position.row_span,
            col_span=f.layout_position.col_span,
            options=f.options if f.options else [],
        )
        field_protos.append(field_proto)

    return recognition_pb2.RecognitionResponse(
        success=True,
        schema_json=json.dumps(schema, ensure_ascii=False),
        tables=table_protos,
        fields=field_protos,
    )


_grpc_server: Optional[grpc.Server] = None


def start_grpc_server(port: Optional[int] = None) -> grpc.Server:
    global _grpc_server

    try:
        from app.grpc_proto import recognition_pb2_grpc
    except ImportError:
        logger.warning("gRPC proto modules not generated. Run: python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. app/grpc_proto/recognition.proto")
        return None

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    recognition_pb2_grpc.add_RecognitionServiceServicer_to_server(
        RecognitionServicer(), server
    )

    listen_port = port or settings.grpc_port
    server.add_insecure_port(f"[::]:{listen_port}")
    server.start()
    _grpc_server = server
    logger.info("gRPC server started on port {}", listen_port)
    return server


def stop_grpc_server():
    global _grpc_server
    if _grpc_server:
        _grpc_server.stop(grace=5)
        _grpc_server = None
        logger.info("gRPC server stopped")
