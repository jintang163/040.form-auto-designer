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

const STOP_WORDS = [
  '请', '麻烦', '帮我', '给我', '我要', '需要', '把', '将', '给', '对', '向',
  '是', '为', '等于', '填写', '填', '写', '输入', '录入', '设置', '改成',
  '换成', '变为', '设为', '设成', '改成', '修改成', '更新为',
  '说一下', '讲一下', '描述一下', '说明一下',
  '我的', '我叫', '我是', '的', '了', '啊', '呀', '吧', '呢', '哦',
  '一下', '一个', '一些'
]

const SEPARATOR_PATTERN = /[，,。.！!？?；;、\n\r\t]+/g

const VALUE_PREFIX_PATTERNS = [
  '是', '为', '等于', '填写', '填', '写', '输入', '录入', '设置', '设为',
  '设成', '改成', '换成', '变为', '修改成', '更新为', '是多少', '是什么'
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
  const sortedKeys = Object.keys(NUMBER_MAP).sort((a, b) => b.length - a.length)
  for (const chinese of sortedKeys) {
    result = result.replace(new RegExp(chinese, 'g'), NUMBER_MAP[chinese])
  }
  return result
}

function removeStopWords(text: string): string {
  let cleaned = text
  for (const word of STOP_WORDS) {
    cleaned = cleaned.replace(new RegExp(word, 'g'), '')
  }
  return cleaned.trim()
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, '').trim()
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i]
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j
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

function similarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  const longerLength = longer.length
  if (longerLength === 0) return 1
  const editDistance = levenshteinDistance(longer, shorter)
  return (longerLength - editDistance) / longerLength
}

function buildFieldKeywords(field: MobileField): string[] {
  const keywords: string[] = []
  const title = cleanText(field.title)
  keywords.push(title)

  if (field.description) {
    keywords.push(cleanText(field.description))
  }

  if (field.type === 'phone' || field.type === 'text') {
    const lowTitle = title.toLowerCase()
    if (title.includes('姓名') || title.includes('名字') || title.includes('名称') || lowTitle.includes('name')) {
      keywords.push('姓名')
      keywords.push('名字')
    }
    if (title.includes('电话') || title.includes('手机') || title.includes('联系') || title.includes('手机号')) {
      keywords.push('电话')
      keywords.push('手机')
      keywords.push('手机号')
      keywords.push('联系电话')
    }
    if (title.includes('邮箱') || title.includes('邮件') || title.includes('email') || title.includes('mail')) {
      keywords.push('邮箱')
      keywords.push('邮件')
    }
    if (title.includes('身份证') || title.includes('证件号')) {
      keywords.push('身份证')
      keywords.push('身份证号')
    }
    if (title.includes('地址') || title.includes('住址') || title.includes('居住')) {
      keywords.push('地址')
      keywords.push('住址')
    }
    if (title.includes('公司') || title.includes('单位') || title.includes('工作')) {
      keywords.push('公司')
      keywords.push('单位')
    }
    if (title.includes('职位') || title.includes('职务') || title.includes('岗位')) {
      keywords.push('职位')
      keywords.push('职务')
      keywords.push('岗位')
    }
  }

  if (field.type === 'number') {
    if (title.includes('年龄') || title.includes('岁数') || title.includes('多大')) {
      keywords.push('年龄')
      keywords.push('岁数')
    }
  }

  if (field.type === 'date') {
    if (title.includes('生日') || title.includes('出生')) {
      keywords.push('生日')
      keywords.push('出生日期')
    }
    if (title.includes('日期') || title.includes('时间')) {
      keywords.push('日期')
    }
  }

  if (field.type === 'select' || field.type === 'multi_select') {
    if (field.options && field.options.length > 0) {
      field.options.forEach(opt => {
        if (opt.label) keywords.push(opt.label)
      })
    }
  }

  return [...new Set(keywords.filter(k => k.length > 0))]
}

function extractValueByPattern(text: string, fieldKeyword: string): string | null {
  const patterns = [
    `${fieldKeyword}是`,
    `${fieldKeyword}为`,
    `${fieldKeyword}填`,
    `${fieldKeyword}填写`,
    `${fieldKeyword}设为`,
    `${fieldKeyword}改成`,
    `${fieldKeyword}换成`,
    `${fieldKeyword}输入`,
    `${fieldKeyword}:`,
    `${fieldKeyword}：`,
    `${fieldKeyword}等于`,
    `${fieldKeyword}=`
  ]

  for (const pattern of patterns) {
    const idx = text.indexOf(pattern)
    if (idx !== -1) {
      return text.substring(idx + pattern.length)
    }
  }
  return null
}

function extractValueAfterKeyword(text: string, keyword: string): string | null {
  const idx = text.indexOf(keyword)
  if (idx === -1) return null
  const afterKeyword = text.substring(idx + keyword.length)

  for (const prefix of VALUE_PREFIX_PATTERNS) {
    if (afterKeyword.startsWith(prefix)) {
      return afterKeyword.substring(prefix.length)
    }
  }

  return afterKeyword || null
}

function parseValueByType(rawValue: string, field: MobileField): { value: any; confidence: number } {
  const cleaned = rawValue.trim()

  switch (field.type) {
    case 'number': {
      const numStr = chineseToNumber(cleaned)
      const numMatch = numStr.match(/\d+(\.\d+)?/)
      if (numMatch) {
        return { value: Number(numMatch[0]), confidence: 0.95 }
      }
      return { value: null, confidence: 0 }
    }

    case 'phone': {
      const phoneMatch = cleaned.match(/1[3-9]\d{9}/)
      if (phoneMatch) {
        return { value: phoneMatch[0], confidence: 1.0 }
      }
      const digitsMatch = cleaned.replace(/\D/g, '')
      if (digitsMatch.length >= 7 && digitsMatch.length <= 15) {
        return { value: digitsMatch, confidence: 0.7 }
      }
      return { value: cleaned || null, confidence: 0.4 }
    }

    case 'date': {
      let dateValue = ''
      const p1 = cleaned.match(/(\d{4})[年\-\/\.](\d{1,2})[月\-\/\.](\d{1,2})[日号]?/)
      const p2 = cleaned.match(/(\d{1,2})[月\-\/\.](\d{1,2})[日\-\/号]?(\d{4})?/)
      const p3 = cleaned.match(/(\d{4})(\d{2})(\d{2})/)

      if (p1) {
        const [, y, m, d] = p1
        dateValue = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        return { value: dateValue, confidence: 1.0 }
      } else if (p3) {
        const [, y, m, d] = p3
        dateValue = `${y}-${m}-${d}`
        return { value: dateValue, confidence: 0.9 }
      } else if (p2) {
        const [, m, d, y] = p2
        const year = y || new Date().getFullYear()
        dateValue = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        return { value: dateValue, confidence: 0.85 }
      }
      return { value: cleaned || null, confidence: 0.3 }
    }

    case 'select': {
      if (field.options && field.options.length > 0) {
        let bestMatch: { value: any; confidence: number } | null = null
        for (const opt of field.options) {
          const label = opt.label
          const sim = similarity(cleaned, label)
          if (sim > 0.6) {
            if (!bestMatch || sim > bestMatch.confidence) {
              bestMatch = { value: opt.value, confidence: sim }
            }
          }
          if (cleaned.includes(label) || label.includes(cleaned)) {
            const conf = Math.min(1, 0.7 + Math.abs(label.length - cleaned.length) * 0.02)
            if (!bestMatch || conf > bestMatch.confidence) {
              bestMatch = { value: opt.value, confidence: conf }
            }
          }
        }
        if (bestMatch) return bestMatch
      }
      return { value: cleaned || null, confidence: 0.5 }
    }

    case 'multi_select': {
      const results: any[] = []
      if (field.options && field.options.length > 0) {
        for (const opt of field.options) {
          if (cleaned.includes(opt.label)) {
            results.push(opt.value)
          }
        }
      }
      if (results.length > 0) {
        return { value: results, confidence: 0.8 }
      }
      return { value: [cleaned], confidence: 0.4 }
    }

    case 'switch': {
      const lowerVal = cleaned.toLowerCase()
      const trueWords = ['是', '对', '有', 'true', 'yes', '1', '打开', '开启', '启用', '同意', '接受']
      const falseWords = ['否', '不对', '没有', 'false', 'no', '0', '关闭', '关掉', '禁用', '不同意', '不接受']

      if (trueWords.some(w => lowerVal.includes(w))) {
        return { value: true, confidence: 0.9 }
      }
      if (falseWords.some(w => lowerVal.includes(w))) {
        return { value: false, confidence: 0.9 }
      }
      return { value: null, confidence: 0.2 }
    }

    case 'textarea':
    case 'text':
    default:
      return { value: cleaned || null, confidence: 0.8 }
  }
}

function findBestFieldMatch(
  segment: string,
  fields: MobileField[]
): { field: MobileField; keyword: string; score: number; startIdx: number } | null {
  let bestMatch: { field: MobileField; keyword: string; score: number; startIdx: number } | null = null

  for (const field of fields) {
    const keywords = buildFieldKeywords(field)
    for (const keyword of keywords) {
      const idx = segment.indexOf(keyword)
      if (idx !== -1) {
        const score = keyword.length / Math.max(segment.length, 1)
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { field, keyword, score, startIdx: idx }
        }
      }
    }

    const titleSim = similarity(segment.substring(0, Math.min(segment.length, field.title.length + 2)), field.title)
    if (titleSim > 0.6) {
      if (!bestMatch || titleSim > bestMatch.score) {
        bestMatch = { field, keyword: field.title, score: titleSim, startIdx: 0 }
      }
    }
  }

  return bestMatch
}

function parseSegment(
  segment: string,
  fields: MobileField[]
): ParsedVoiceResult | null {
  const cleanSegment = cleanText(segment)
  if (cleanSegment.length < 2) return null

  const bestMatch = findBestFieldMatch(cleanSegment, fields)
  if (!bestMatch) return null

  const { field, keyword, startIdx } = bestMatch
  let rawValue = ''
  let confidence = 0.6

  const patternValue = extractValueByPattern(cleanSegment, keyword)
  if (patternValue !== null) {
    rawValue = patternValue
    confidence = 0.9
  } else {
    const afterKeyword = extractValueAfterKeyword(cleanSegment, keyword)
    if (afterKeyword !== null && afterKeyword.length > 0) {
      rawValue = afterKeyword
      confidence = 0.85
    } else {
      const beforeKeyword = cleanSegment.substring(0, startIdx)
      if (beforeKeyword.length > 0 && beforeKeyword.length < cleanSegment.length) {
        rawValue = beforeKeyword
        confidence = 0.5
      } else {
        rawValue = cleanSegment.replace(keyword, '')
        confidence = 0.4
      }
    }
  }

  rawValue = removeStopWords(rawValue)
  rawValue = rawValue.replace(/[，。！？、；：,.!?;:]/g, '').trim()

  if (!rawValue || rawValue.length === 0) {
    return null
  }

  const { value, confidence: typeConfidence } = parseValueByType(rawValue, field)
  if (value === null || value === undefined) {
    return null
  }

  const finalConfidence = Math.min(1, (confidence * 0.6 + typeConfidence * 0.4))

  return {
    fieldKey: field.key,
    value,
    confidence: finalConfidence,
    rawText: segment,
    matchedField: field
  }
}

export function parseVoiceToField(
  voiceText: string,
  fields: MobileField[],
  options: VoiceParseOptions = {}
): ParsedVoiceResult | null {
  const { strictMatch = false } = options

  if (!voiceText || !voiceText.trim()) {
    return null
  }

  const result = parseSegment(voiceText, fields)

  if (result) {
    if (strictMatch && result.confidence < 0.7) {
      return null
    }
    return result
  }

  return null
}

export function parseMultipleFields(
  voiceText: string,
  fields: MobileField[],
  options: VoiceParseOptions = {}
): ParsedVoiceResult[] {
  const results: ParsedVoiceResult[] = []
  const segments = voiceText.split(SEPARATOR_PATTERN).filter(s => s.trim().length > 0)

  const usedKeys = new Set<string>()

  for (const segment of segments) {
    const result = parseSegment(segment.trim(), fields)
    if (result && !usedKeys.has(result.fieldKey)) {
      if (!options.strictMatch || result.confidence >= 0.7) {
        results.push(result)
        usedKeys.add(result.fieldKey)
      }
    }
  }

  if (results.length === 0 && segments.length > 0) {
    const singleResult = parseSegment(voiceText, fields)
    if (singleResult) {
      results.push(singleResult)
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}

export function formatParsedResult(result: ParsedVoiceResult): string {
  return `【${result.matchedField.title}】: ${result.value} (置信度: ${Math.round(result.confidence * 100)}%)`
}
