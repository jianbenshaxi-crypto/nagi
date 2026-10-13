import { useLocale } from '../i18n/LocaleContext.jsx';
import { useTheme } from '../hooks/useTheme.js';

// 旧版NAGIから引き継いだ右上の丸ボタン（⚙️ 設定 / 🌙 テーマ切り替え）
export default function TopActions({ onOpenSettings }) {
  const { t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="top-actions">
      <button type="button" className="round-btn" onClick={onOpenSettings} aria-label={t('header.settingsAria')}>
        <span aria-hidden="true">⚙️</span>
      </button>
      <button
        type="button"
        className="round-btn"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={isDark ? t('header.themeToLight') : t('header.themeToDark')}
      >
        <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
      </button>
    </div>
  );
}
