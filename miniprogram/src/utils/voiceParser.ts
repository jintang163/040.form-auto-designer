import type { MobileField } from '@/types'

export interface ParsedVoiceResult {
  fieldKey: string
  value: any
  confidence: number
  rawText: string
  matchedField: MobileField
}

export interface VoiceParseOptions {
  strictMatch?: boolean
  enableFuzzyMatch?: boolean
}

const FIELD_KEYWORD_MAP: Record<string, string[]> = {
  name: ['姓名', '名字', '名称', '称呼', '您的名字'],
  phone: ['电话', '手机', '手机号', '联系电话', '电话号码', '联系方式'],
  email: ['邮箱', '邮件', '电子邮箱', 'email', 'mail'],
  idCard: ['身份证', '身份证号', '证件号', '身份证号码'],
  age: ['年龄', '岁数', '多大'],
  gender: ['性别', '男', '女'],
  address: ['地址', '住址', '家庭地址', '居住地址', '联系地址', '家住哪里'],
  company: ['公司', '单位', '工作单位', '所在公司'],
  position: ['职位', '职务', '岗位', '工作岗位'],
  date: ['日期', '时间', '年月日', '什么时候'],
  birthday: ['生日', '出生日期', '出生年月日', '出生年月'],
  remark: ['备注', '说明', '其他', '补充'],
  description: ['描述', '详情', '详细说明', '情况说明'],
}

const COMMON_STOP_WORDS = [
  '是', '为', '等于', '填写', '填', '写', '输入', '说一下',
  '请输入', '请填写', '我的', '我叫', '我是', '的'
]

const NUMBER_MAP: Record<string, string> = {
  '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
  '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
  '十': '10', '十一': '11', '十二': '12', '十三': '13',
  '十四': '14', '十五': '15', '十六': '16', '十七': '17',
  '十八': '18', '十九': '19', '二十': '20', '三十': '30',
  '四十': '40', '五十': '50', '六十': '60', '七十': '70',
  '八十': '80', '九十': '90', '一百': '100'
}

function chineseToNumber(text: string): string {
  let result = text
  for (const [chinese, num] of Object.entries(NUMBER_MAP)) {
    result = result.replace(new RegExp(chinese, 'g'), num)
  }
  return result
}

function cleanText(text: string): string {
  let cleaned = text.trim()
  for (const word of COMMON_STOP_WORDS) {
    cleaned = cleaned.replace(new RegExp(word, 'g'), '')
  }
  return cleaned.trim()
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  const longerLength = longer.length
  if (longerLength === 0) return 1

  const editDistance = levenshteinDistance(longer, shorter)
  return (longerLength - editDistance) / longerLength
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[str2.length][str1.length]
}

function extractFieldValue(
  text: string,
  fieldKeyword: string,
  fieldType: MobileField['type']
): { value: any; confidence: number } {
  const cleanedText = cleanText(text)
  const processedText = chineseToNumber(cleanedText)

  let matchPattern = ''
  if (FIELD_KEYWORD_MAP[fieldKeyword]) {
    for (const kw of FIELD_KEYWORD_MAP[fieldKeyword]) {
      const idx = processedText.indexOf(kw)
      if (idx !== -1) {
        matchPattern = kw
        break
      }
    }
  }

  let extractedValue = ''
  let confidence = 0.3

  if (matchPattern) {
    const startIdx = processedText.indexOf(matchPattern) + matchPattern.length
    extractedValue = processedText.substring(startIdx).trim()
    confidence = 0.9
  } else {
    extractedValue = processedText
  }

  extractedValue = extractedValue.replace(/[，。！？、；：]/g, '').trim()

  switch (fieldType) {
    case 'number': {
      const numMatch = extractedValue.match(/\d+(\.\d+)?/)
      if (numMatch) {
        extractedValue = numMatch[0]
        confidence = Math.min(confidence + 0.1, 1)
      }
      if (extractedValue) {
        return { value: Number(extractedValue), confidence }
      }
      return { value: null, confidence: 0 }
    }
    case 'phone': {
      const phoneMatch = extractedValue.match(/1[3-9]\d{9}/)
      if (phoneMatch) {
        extractedValue = phoneMatch[0]
        confidence = 1
      }
      return { value: extractedValue || null, confidence }
    }
    case 'date': {
      let dateValue = extractedValue
      const datePattern1 = extractedValue.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/)
      const datePattern2 = extractedValue.match(/(\d{1,2})[月\-\/](\d{1,2})[日\-\/]?(\d{4})?/)

      if (datePattern1) {
        const [, year, month, day] = datePattern1
        dateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        confidence = 1
      } else if (datePattern2) {
        const [, month, day, year] = datePattern2
        const y = year || new Date().getFullYear()
        dateValue = `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        confidence = 0.9
      }
      return { value: dateValue, confidence }
    }
    case 'select':
    case 'multi_select': {
      return { value: extractedValue, confidence: confidence * 0.8 }
    }
    case 'switch': {
      const lowerVal = extractedValue.toLowerCase()
      if (['是', '对', '有', 'true', 'yes', '1', '打开', '开启'].includes(lowerVal)) {
        return { value: true, confidence: 0.95 }
      }
      if (['否', '不对', '没有', 'false', 'no', '0', '关闭', '关掉'].includes(lowerVal)) {
        return { value: false, confidence: 0.95 }
      }
      return { value: null, confidence: 0.2 }
    }
    case 'textarea':
    case 'text':
    default:
      return { value: extractedValue || null, confidence }
  }
}

function matchFieldByTitle(
  text: string,
  fields: MobileField[]
): { field: MobileField; score: number } | null {
  let bestMatch: { field: MobileField; score: number } | null = null

  for (const field of fields) {
    const title = field.title
    const desc = field.description || ''

    let score = 0

    for (const [fieldKey, keywords] of Object.entries(FIELD_KEYWORD_MAP)) {
      if (text.includes(fieldKey)) {
        score += 0.2
      }
      for (const kw of keywords) {
        if (text.includes(kw)) {
          score += 0.3
        }
      }
    }

    score += calculateSimilarity(text, title) * 0.5

    if (desc) {
      score += calculateSimilarity(text, desc) * 0.2
    }

    if (text.includes(title)) {
      score += 0.5
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { field, score }
    }
  }

  return bestMatch && bestMatch.score > 0.2 ? bestMatch : null
}

function parseVoiceTextWithPattern(
  text: string,
  fields: MobileField[]
): { field: MobileField; value: any; confidence: number } | null {
  const pattern = /^([^\s，。！？：:]+)[是为：:]\s*(.+)$/
  const match = text.match(pattern)

  if (!match) {
    for (const [, keywords] of Object.entries(FIELD_KEYWORD_MAP)) {
      for (const kw of keywords) {
        const kwIdx = text.indexOf(kw)
        if (kwIdx !== -1 && kwIdx < text.length - 1) {
          const fieldMatch = matchFieldByTitle(kw, fields)
          if (fieldMatch) {
            const valuePart = text.substring(kwIdx + kw.length)
            const { value, confidence } = extractFieldValue(
              text,
              fieldMatch.field.key,
              fieldMatch.field.type
            )
            if (value !== null) {
              return {
                field: fieldMatch.field,
                value,
                confidence: Math.max(confidence, fieldMatch.score)
              }
            }
          }
        }
      }
    }
    return null
  }

  const [, fieldName, valueText] = match
  const fieldMatch = matchFieldByTitle(fieldName, fields)

  if (!fieldMatch) {
    return null
  }

  const { value, confidence } = extractFieldValue(
    valueText,
    fieldMatch.field.key,
    fieldMatch.field.type
  )

  return value !== null
    ? {
        field: fieldMatch.field,
        value,
        confidence: Math.min(confidence + fieldMatch.score * 0.5, 1)
      }
    : null
}

export function parseVoiceToField(
  voiceText: string,
  fields: MobileField[],
  options: VoiceParseOptions = {}
): ParsedVoiceResult | null {
  const { strictMatch = false, enableFuzzyMatch = true } = options

  if (!voiceText || !voiceText.trim()) {
    return null
  }

  let result = parseVoiceTextWithPattern(voiceText, fields)

  if (!result && enableFuzzyMatch) {
    const matched = matchFieldByTitle(voiceText, fields)
    if (matched) {
      const { value, confidence } = extractFieldValue(
        voiceText,
        matched.field.key,
        matched.field.type
      )
      if (value !== null) {
        result = {
          field: matched.field,
          value,
          confidence: Math.min(confidence, matched.score)
        }
      }
    }
  }

  if (result) {
    if (strictMatch && result.confidence < 0.7) {
      return null
    }
    return {
      fieldKey: result.field.key,
      value: result.value,
      confidence: result.confidence,
      rawText: voiceText,
      matchedField: result.field
    }
  }

  return null
}

export function parseMultipleFields(
  voiceText: string,
  fields: MobileField[],
  options: VoiceParseOptions = {}
): ParsedVoiceResult[] {
  const results: ParsedVoiceResult[] = []
  const separators = /[；;，,。.！!？?\n]/g
  const segments = voiceText.split(separators).filter(s => s.trim().length > 0)

  for (const segment of segments) {
    const result = parseVoiceToField(segment.trim(), fields, options)
    if (result) {
      results.push(result)
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}

export function formatParsedResult(result: ParsedVoiceResult): string {
  return `【${result.matchedField.title}】: ${result.value} (置信度: ${Math.round(result.confidence * 100)}%)`
}
