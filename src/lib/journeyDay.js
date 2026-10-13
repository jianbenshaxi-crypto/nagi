import { daysBetweenLocalDates } from './dateUtils.js';

const FIRST_USE_KEY = 'nagi_first_use';

function readFirstUse() {
  try {
    const stored = localStorage.getItem(FIRST_USE_KEY);
    const date = stored ? new Date(stored) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

function writeFirstUse(date) {
  try {
    localStorage.setItem(FIRST_USE_KEY, date.toISOString());
  } catch {
    /* localStorage unavailable */
  }
}

// 「🌱 ○日目」バッジ用。この端末で初めて使った日を1日目として数える。
// 既にDBに記録がある場合（この機能より前から使っている人）は、最も古い記録の日も考慮する。
export function getJourneyDay(history) {
  const today = new Date();
  const candidates = [readFirstUse(), ...(history ?? []).map((h) => new Date(h.createdAt))].filter(
    (d) => d && !Number.isNaN(d.getTime()) && d <= today
  );
  const firstUse = candidates.length ? new Date(Math.min(...candidates.map((d) => d.getTime()))) : today;
  writeFirstUse(firstUse);
  return daysBetweenLocalDates(firstUse, today) + 1;
}

// 全データ削除時に、利用開始日もリセットする
export function resetFirstUse() {
  try {
    localStorage.removeItem(FIRST_USE_KEY);
  } catch {
    /* localStorage unavailable */
  }
}
