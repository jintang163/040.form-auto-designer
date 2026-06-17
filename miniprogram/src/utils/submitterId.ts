const SUBMITTER_ID_KEY = 'fd_submitter_id'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getSubmitterId(): string {
  try {
    let id = uni.getStorageSync(SUBMITTER_ID_KEY)
    if (!id) {
      id = generateUUID()
      uni.setStorageSync(SUBMITTER_ID_KEY, id)
    }
    return id
  } catch {
    return generateUUID()
  }
}

export function setSubmitterId(id: string): void {
  try {
    uni.setStorageSync(SUBMITTER_ID_KEY, id)
  } catch {}
}
