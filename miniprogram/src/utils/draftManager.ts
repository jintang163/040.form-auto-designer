import type { DraftData } from '@/types'
import { saveDraft as apiSaveDraft, getDraftList as apiGetDraftList, deleteDraft as apiDeleteDraft } from '@/api'

const DRAFT_STORAGE_KEY = 'form_drafts'

function getLocalDrafts(): DraftData[] {
  const raw = uni.getStorageSync(DRAFT_STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

function setLocalDrafts(drafts: DraftData[]) {
  uni.setStorageSync(DRAFT_STORAGE_KEY, JSON.stringify(drafts))
}

function isOnline(): boolean {
  return uni.getNetworkType
    ? true
    : false
}

export function saveDraft(templateId: string, templateName: string, data: Record<string, any>): DraftData {
  const draft: DraftData = {
    id: `draft_${templateId}_${Date.now()}`,
    templateId,
    templateName,
    data,
    savedAt: new Date().toISOString()
  }

  const drafts = getLocalDrafts()
  const existIdx = drafts.findIndex((d) => d.templateId === templateId)
  if (existIdx >= 0) {
    drafts[existIdx] = draft
  } else {
    drafts.unshift(draft)
  }
  setLocalDrafts(drafts)

  if (isOnline()) {
    apiSaveDraft(draft).catch(() => {})
  }

  return draft
}

export function loadDraft(templateId: string): DraftData | null {
  const drafts = getLocalDrafts()
  return drafts.find((d) => d.templateId === templateId) || null
}

export function getDraftList(): DraftData[] {
  return getLocalDrafts()
}

export function removeDraft(templateId: string): void {
  let drafts = getLocalDrafts()
  const target = drafts.find((d) => d.templateId === templateId)
  drafts = drafts.filter((d) => d.templateId !== templateId)
  setLocalDrafts(drafts)

  if (target && isOnline()) {
    apiDeleteDraft(target.id).catch(() => {})
  }
}

export async function syncDraftsFromServer(): Promise<DraftData[]> {
  try {
    const res = await apiGetDraftList()
    const serverDrafts = res.data || []
    const localDrafts = getLocalDrafts()
    const merged = [...serverDrafts]
    localDrafts.forEach((local) => {
      if (!serverDrafts.find((s) => s.templateId === local.templateId)) {
        merged.push(local)
      }
    })
    setLocalDrafts(merged)
    return merged
  } catch {
    return getLocalDrafts()
  }
}
