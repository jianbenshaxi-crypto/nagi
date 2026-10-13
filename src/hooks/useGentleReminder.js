import { useEffect, useState } from 'react';

const STORAGE_KEY_ENABLED = 'nagi_reminder_enabled';
const STORAGE_KEY_HOUR = 'nagi_reminder_hour';
const DEFAULT_HOUR = 21;

// 「今日もNAGIを使いましょう！」のような義務感は出さない、静かな一言だけを届ける。
const MESSAGES = ['今日は少し休みませんか？', '眠る前に1分だけ呼吸してみませんか？', 'また来てくれてありがとう。'];

// ローカルリマインダー（Notification API）。アプリ/タブを開いている間だけ届く。
// 本格的なPush通知（閉じても届く）にはService Worker等の別基盤が必要なため、
// 今回はこの範囲に留める（設定画面でもその旨を正直に伝える）。
export function useGentleReminder() {
  const [enabled, setEnabledState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
    } catch {
      return false;
    }
  });
  const [hour, setHourState] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY_HOUR));
      return Number.isInteger(saved) && saved >= 0 && saved <= 23 ? saved : DEFAULT_HOUR;
    } catch {
      return DEFAULT_HOUR;
    }
  });
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  function persistEnabled(next) {
    setEnabledState(next);
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, String(next));
    } catch {
      /* localStorage unavailable */
    }
  }

  function setReminderHour(next) {
    setHourState(next);
    try {
      localStorage.setItem(STORAGE_KEY_HOUR, String(next));
    } catch {
      /* localStorage unavailable */
    }
  }

  async function enableReminder(nextHour) {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setReminderHour(nextHour);
      persistEnabled(true);
    }
  }

  function disableReminder() {
    persistEnabled(false);
  }

  // アプリを開いている間、選んだ時間帯になったら1回だけ通知する。
  // 既に時刻を過ぎていれば今回は何もしない（次にこの画面が開いている時に再スケジュールされる）。
  useEffect(() => {
    if (!enabled || permission !== 'granted') return undefined;
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    if (target <= now) return undefined;

    const timeoutId = setTimeout(() => {
      const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      try {
        // eslint-disable-next-line no-new
        new Notification('NAGI', { body: message });
      } catch {
        /* 通知の生成に失敗しても、アプリ全体は止めない */
      }
    }, target.getTime() - now.getTime());

    return () => clearTimeout(timeoutId);
  }, [enabled, permission, hour]);

  return {
    reminderEnabled: enabled,
    reminderHour: hour,
    reminderPermission: permission,
    enableReminder,
    disableReminder,
    setReminderHour,
  };
}
