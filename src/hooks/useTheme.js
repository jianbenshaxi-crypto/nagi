import { useEffect, useState } from 'react';

const THEME_KEY = 'nagi_theme';

// 旧版NAGIと同じく、保存された設定 → 端末のダークモード設定 の順で初期テーマを決める。
// index.html の先頭でも同じ判定をして、読み込み直後に一瞬明るく光らないようにしている。
function detectInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* localStorage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(detectInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* localStorage unavailable */
    }
  }

  return { theme, toggleTheme };
}
