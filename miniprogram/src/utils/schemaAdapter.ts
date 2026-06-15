import type { FormSchema, FormField, MobileSchema, MobileSchemaPage, MobileField, FieldValidation } from '@/types'

const FIELD_TYPE_MAP: Record<string, string> = {
  text: 'u-input',
  number: 'u-input',
  date: 'u-datetime-picker',
  select: 'u-picker',
  multi_select: 'u-checkbox-group',
  switch: 'u-switch',
  textarea: 'u-textarea',
  file: 'FileUploader'
}

const FIELDS_PER_PAGE = 10

function toMobileField(field: FormField): MobileField {
  return {
    key: field.key,
    title: field.title,
    type: field.type,
    componentType: FIELD_TYPE_MAP[field.type] || 'u-input',
    required: field.required ?? false,
    placeholder: field.placeholder || `请输入${field.title}`,
    defaultValue: field.defaultValue ?? null,
    options: field.options || [],
    validation: field.validation || (field.required ? { required: true, message: `${field.title}不能为空` } : {}),
    description: field.description || '',
    disabled: field.disabled ?? false,
    visible: field.visible ?? true,
    condition: field.condition
  }
}

function buildValidationMap(fields: FormField[]): Record<string, FieldValidation> {
  const map: Record<string, FieldValidation> = {}
  fields.forEach((f) => {
    if (f.required || f.validation) {
      map[f.key] = f.validation || { required: true, message: `${f.title}不能为空` }
    }
  })
  return map
}

function paginateFields(schema: FormSchema, mobileFields: MobileField[]): MobileSchemaPage[] {
  if (schema.groups && schema.groups.length > 0) {
    return schema.groups.map((group) => ({
      title: group.title,
      fields: group.fieldKeys
        .map((key) => mobileFields.find((f) => f.key === key))
        .filter(Boolean) as MobileField[]
    }))
  }

  const pages: MobileSchemaPage[] = []
  for (let i = 0; i < mobileFields.length; i += FIELDS_PER_PAGE) {
    const chunk = mobileFields.slice(i, i + FIELDS_PER_PAGE)
    pages.push({
      title: `第${pages.length + 1}部分`,
      fields: chunk
    })
  }
  return pages
}

export function adaptToMobileSchema(schema: FormSchema): MobileSchema {
  const mobileFields = schema.fields.map(toMobileField)
  const pages = paginateFields(schema, mobileFields)
  const validationMap = buildValidationMap(schema.fields)

  return {
    templateId: schema.id,
    templateName: schema.name,
    pages,
    validationMap
  }
}
