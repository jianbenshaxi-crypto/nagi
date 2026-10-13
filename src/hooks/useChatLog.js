import { useEffect, useState } from 'react';

const LOG_KEY = 'nagi_chat_log';
const COUNT_KEY = 'nagi_chat_count';
const DAILY_SOFT_LIMIT = 40;

// 相談の会話はサーバーに保存しない。タブを切り替えても消えないよう、
// このブラウザのタブを閉じるまでだけ sessionStorage に残す。
function loadLog() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(LOG_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useChatLog() {
  const [log, setLog] = useState(loadLog);

  useEffect(() => {
    try {
      sessionStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch {
      /* sessionStorage unavailable */
    }
  }, [log]);

  return [log, setLog];
}

export function clearChatLog() {
  try {
    sessionStorage.removeItem(LOG_KEY);
    localStorage.removeItem(COUNT_KEY);
  } catch {
    /* storage unavailable */
  }
}

// 1日に送れる回数のゆるい上限（旧版と同じ40回）。使いすぎ・依存を防ぐためのもので、厳密な制限ではない。
function todayKey() {
  return new Date().toLocaleDateString('ja-JP');
}

function readTodayCount() {
  try {
    const data = JSON.parse(localStorage.getItem(COUNT_KEY) || '{}');
    return data.date === todayKey() ? data.count : 0;
  } catch {
    return 0;
  }
}

export function isOverDailyLimit() {
  return readTodayCount() >= DAILY_SOFT_LIMIT;
}

export function incrementTodayCount() {
  try {
    localStorage.setItem(COUNT_KEY, JSON.stringify({ date: todayKey(), count: readTodayCount() + 1 }));
  } catch {
    /* localStorage unavailable */
  }
}
