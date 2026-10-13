import { useState } from 'react';

const STORAGE_KEY = 'nagi_memory_enabled';

// NAGI MEMORY：過去の記録からタグ×気分の傾向分析を行ってよいかの同意。
// 既定はオフ（明示的なオプトインのみ有効）。アカウントが無いアプリのため、
// 他の設定（言語など）と同じくこの端末のlocalStorageだけで管理する。
export function useMemoryConsent() {
  const [enabled, setEnabledState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  function setEnabled(next) {
    setEnabledState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* localStorage unavailable */
    }
  }

  return { memoryEnabled: enabled, setMemoryEnabled: setEnabled };
}
