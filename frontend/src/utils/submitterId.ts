const SUBMITTER_ID_KEY = 'fd_submitter_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateSubmitterId(): string {
  try {
    let id = localStorage.getItem(SUBMITTER_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(SUBMITTER_ID_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

export function setSubmitterId(id: string): void {
  try {
    localStorage.setItem(SUBMITTER_ID_KEY, id);
  } catch {}
}
