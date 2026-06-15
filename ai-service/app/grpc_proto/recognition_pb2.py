from google.protobuf import descriptor_pool
from google.protobuf import symbol_database
from google.protobuf import descriptor_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection

DESCRIPTOR = _descriptor.FileDescriptor(
    name='recognition.proto',
    package='recognition',
    syntax='proto3',
)

_TABLECELLPROTO_FIELDS = [
    {'name': 'text', 'number': 1, 'type': 9, 'label': 1},
    {'name': 'row', 'number': 2, 'type': 5, 'label': 1},
    {'name': 'col', 'number': 3, 'type': 5, 'label': 1},
    {'name': 'row_span', 'number': 4, 'type': 5, 'label': 1},
    {'name': 'col_span', 'number': 5, 'type': 5, 'label': 1},
    {'name': 'bbox', 'number': 6, 'type': 5, 'label': 3},
]

_TABLESTRUCTUREPROTO_FIELDS = [
    {'name': 'rows', 'number': 1, 'type': 5, 'label': 1},
    {'name': 'cols', 'number': 2, 'type': 5, 'label': 1},
    {'name': 'cells', 'number': 3, 'type': 11, 'label': 3, 'type_name': '.recognition.TableCellProto'},
]

_FIELDDEFINITIONPROTO_FIELDS = [
    {'name': 'name', 'number': 1, 'type': 9, 'label': 1},
    {'name': 'label', 'number': 2, 'type': 9, 'label': 1},
    {'name': 'input_type', 'number': 3, 'type': 9, 'label': 1},
    {'name': 'required', 'number': 4, 'type': 8, 'label': 1},
    {'name': 'row', 'number': 5, 'type': 5, 'label': 1},
    {'name': 'col', 'number': 6, 'type': 5, 'label': 1},
    {'name': 'row_span', 'number': 7, 'type': 5, 'label': 1},
    {'name': 'col_span', 'number': 8, 'type': 5, 'label': 1},
    {'name': 'options', 'number': 9, 'type': 9, 'label': 3},
]

_IMAGEREQUEST_FIELDS = [
    {'name': 'image_data', 'number': 1, 'type': 12, 'label': 1},
    {'name': 'format', 'number': 2, 'type': 9, 'label': 1},
]

_WORDREQUEST_FIELDS = [
    {'name': 'file_data', 'number': 1, 'type': 12, 'label': 1},
    {'name': 'filename', 'number': 2, 'type': 9, 'label': 1},
]

_RECOGNITIONRESPONSE_FIELDS = [
    {'name': 'success', 'number': 1, 'type': 8, 'label': 1},
    {'name': 'error', 'number': 2, 'type': 9, 'label': 1},
    {'name': 'schema_json', 'number': 3, 'type': 9, 'label': 1},
    {'name': 'tables', 'number': 4, 'type': 11, 'label': 3, 'type_name': '.recognition.TableStructureProto'},
    {'name': 'fields', 'number': 5, 'type': 11, 'label': 3, 'type_name': '.recognition.FieldDefinitionProto'},
]


def _make_descriptor(name, fields_desc, containing_type=None):
    field_descriptors = []
    for i, f in enumerate(fields_desc):
        fd = _descriptor.FieldDescriptor(
            name=f['name'],
            full_name=f'.recognition.{name}.{f["name"]}',
            index=i,
            number=f['number'],
            type=f['type'],
            cpp_type=_TYPE_TO_CPP.get(f['type'], 9),
            label=f['label'],
            has_default_value=False,
            default_value=_DEFAULTS.get(f['type'], b''),
            message_type=None,
            enum_type=None,
            containing_type=None,
            is_extension=False,
            extension_scope=None,
        )
        field_descriptors.append(fd)

    return _descriptor.Descriptor(
        name=name,
        full_name=f'.recognition.{name}',
        filename='recognition.proto',
        file=DESCRIPTOR,
        containing_type=containing_type,
        fields=field_descriptors,
        nested_types=[],
        enum_types=[],
        extensions=[],
        oneofs=[],
    )


_TYPE_TO_CPP = {5: 1, 8: 7, 9: 9, 12: 9, 11: 10}
_DEFAULTS = {5: 0, 8: False, 9: '', 12: b'', 11: None}

TableCellProto = _make_descriptor('TableCellProto', _TABLECELLPROTO_FIELDS)
TableStructureProto = _make_descriptor('TableStructureProto', _TABLESTRUCTUREPROTO_FIELDS)
FieldDefinitionProto = _make_descriptor('FieldDefinitionProto', _FIELDDEFINITIONPROTO_FIELDS)
ImageRequest = _make_descriptor('ImageRequest', _IMAGEREQUEST_FIELDS)
WordRequest = _make_descriptor('WordRequest', _WORDREQUEST_FIELDS)
RecognitionResponse = _make_descriptor('RecognitionResponse', _RECOGNITIONRESPONSE_FIELDS)

DESCRIPTOR.message_types_by_name['TableCellProto'] = TableCellProto
DESCRIPTOR.message_types_by_name['TableStructureProto'] = TableStructureProto
DESCRIPTOR.message_types_by_name['FieldDefinitionProto'] = FieldDefinitionProto
DESCRIPTOR.message_types_by_name['ImageRequest'] = ImageRequest
DESCRIPTOR.message_types_by_name['WordRequest'] = WordRequest
DESCRIPTOR.message_types_by_name['RecognitionResponse'] = RecognitionResponse

_sym_db = symbol_database.Default()
_sym_db.RegisterFileDescriptor(DESCRIPTOR)

TableCellProto = _reflection.GeneratedProtocolMessageType('TableCellProto', (_message.Message,), {
    'DESCRIPTOR': TableCellProto,
    '__module__': __name__,
})
_sym_db.RegisterMessage(TableCellProto)

TableStructureProto = _reflection.GeneratedProtocolMessageType('TableStructureProto', (_message.Message,), {
    'DESCRIPTOR': TableStructureProto,
    '__module__': __name__,
})
_sym_db.RegisterMessage(TableStructureProto)

FieldDefinitionProto = _reflection.GeneratedProtocolMessageType('FieldDefinitionProto', (_message.Message,), {
    'DESCRIPTOR': FieldDefinitionProto,
    '__module__': __name__,
})
_sym_db.RegisterMessage(FieldDefinitionProto)

ImageRequest = _reflection.GeneratedProtocolMessageType('ImageRequest', (_message.Message,), {
    'DESCRIPTOR': ImageRequest,
    '__module__': __name__,
})
_sym_db.RegisterMessage(ImageRequest)

WordRequest = _reflection.GeneratedProtocolMessageType('WordRequest', (_message.Message,), {
    'DESCRIPTOR': WordRequest,
    '__module__': __name__,
})
_sym_db.RegisterMessage(WordRequest)

RecognitionResponse = _reflection.GeneratedProtocolMessageType('RecognitionResponse', (_message.Message,), {
    'DESCRIPTOR': RecognitionResponse,
    '__module__': __name__,
})
_sym_db.RegisterMessage(RecognitionResponse)
