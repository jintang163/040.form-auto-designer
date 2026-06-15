import type { FieldConfig, FormSchema, RecognitionResult } from '@/types';

const inputTypeComponentMap: Record<string, { component: string; type?: string }> = {
  text: { component: 'Input' },
  number: { component: 'NumberPicker' },
  date: { component: 'DatePicker' },
  select: { component: 'Select' },
  multiSelect: { component: 'Select' },
  fileUpload: { component: 'Upload' },
  textarea: { component: 'TextArea' },
};

const fieldTypeMap: Record<string, string> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  array: 'array',
  object: 'object',
  date: 'string',
};

export function fieldToSchemaProperty(field: FieldConfig) {
  const mapping = inputTypeComponentMap[field.inputType] || { component: 'Input' };
  const property: any = {
    type: fieldTypeMap[field.fieldType] || 'string',
    title: field.fieldLabel,
    required: field.required,
    'x-decorator': 'FormItem',
    'x-component': mapping.component,
    'x-decorator-props': {},
    'x-component-props': {},
  };

  if (field.defaultValue !== undefined && field.defaultValue !== '') {
    property.default = field.defaultValue;
  }

  if (field.inputType === 'multiSelect') {
    property.type = 'array';
    property['x-component-props'] = { mode: 'multiple' };
  }

  if (field.inputType === 'number') {
    property['x-component-props'] = { style: { width: '100%' } };
  }

  if (field.inputType === 'date') {
    property['x-component-props'] = { style: { width: '100%' } };
  }

  if (field.inputType === 'fileUpload') {
    property.type = 'array';
    property['x-component-props'] = { listType: 'card' };
  }

  if (field.inputType === 'textarea') {
    property['x-component-props'] = { rows: 4 };
  }

  if ((field.inputType === 'select' || field.inputType === 'multiSelect') && field.options?.length) {
    property.enum = field.options;
  }

  const validators: any[] = [];
  if (field.validationRules?.length) {
    for (const rule of field.validationRules) {
      if (rule.type === 'regex') {
        validators.push({ pattern: rule.value, message: rule.message });
      } else if (rule.type === 'lengthRange') {
        if (rule.min !== undefined) validators.push({ min: rule.min, message: rule.message });
        if (rule.max !== undefined) validators.push({ max: rule.max, message: rule.message });
      }
    }
  }
  if (validators.length) {
    property['x-validator'] = validators;
  }

  if (field.linkageCondition?.length) {
    property['x-reactions'] = field.linkageCondition.map((cond) => ({
      dependencies: [cond.field],
      fulfill: {
        state: {
          visible: `{{$deps[0] ${cond.operator === 'eq' ? '===' : cond.operator === 'ne' ? '!==' : '&& $deps[0].includes'} '${cond.value}'}}`,
        },
      },
    }));
  }

  if (field.layoutConfig) {
    const { row, col, rowSpan, colSpan } = field.layoutConfig;
    property['x-decorator-props'] = {
      ...property['x-decorator-props'],
      gridSpan: colSpan || 1,
    };
  }

  return property;
}

export function recognitionResultToFormSchema(result: RecognitionResult): FormSchema {
  return generateFormSchema(result.fields);
}

export function generateFormSchema(fields: FieldConfig[]): FormSchema {
  const properties: FormSchema['properties'] = {};
  for (const field of fields) {
    properties[field.fieldName] = fieldToSchemaProperty(field);
  }
  return { type: 'object', properties };
}

export function generateGridLayout(fields: FieldConfig[]) {
  const maxRow = Math.max(...fields.map((f) => f.layoutConfig?.row || 1), 1);
  const maxCol = Math.max(...fields.map((f) => f.layoutConfig?.col || 1), 1);
  const gridCols = Math.min(maxCol + 1, 4);

  const grid: (string | null)[][] = Array.from({ length: maxRow }, () =>
    Array.from({ length: gridCols }, () => null),
  );

  const sorted = [...fields].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  for (const field of sorted) {
    const row = (field.layoutConfig?.row || 1) - 1;
    const col = (field.layoutConfig?.col || 1) - 1;
    const rowSpan = field.layoutConfig?.rowSpan || 1;
    const colSpan = field.layoutConfig?.colSpan || 1;

    for (let r = row; r < Math.min(row + rowSpan, maxRow); r++) {
      for (let c = col; c < Math.min(col + colSpan, gridCols); c++) {
        grid[r][c] = field.fieldName;
      }
    }
  }

  return { gridCols, grid };
}
