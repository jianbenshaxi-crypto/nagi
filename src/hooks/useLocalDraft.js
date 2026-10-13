const STORAGE_KEY = 'nagi_session_draft';

// サーバー保存に失敗しても、進行中の記録がリロードで消えないようにするための
// ローカル下書き。サーバー（DB）が真実の情報源であることは変えず、あくまで
// 「サーバーに問い合わせられなかったとき」だけの保険として使う。
export function saveDraft(session) {
  try {
    if (session && session.status === 'IN_PROGRESS') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* localStorage unavailable */
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage unavailable */
  }
}
