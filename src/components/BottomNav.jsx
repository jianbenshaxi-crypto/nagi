import { useLocale } from '../i18n/LocaleContext.jsx';

// 旧版NAGIと同じ4タブ・絵文字。設定は右上の ⚙️ から開く（TopActions）。
const ITEMS = [
  { key: 'home', icon: '🏡' },
  { key: 'care', icon: '🌿' },
  { key: 'trends', icon: '🧭' },
  { key: 'consult', icon: '💬' },
];

// ケア体験中・危機画面では表示しない（集中を妨げないため）。App.jsx側で出し分ける。
export default function BottomNav({ active, onNavigate }) {
  const { t } = useLocale();

  return (
    <nav className="bottom-nav" aria-label={t('nav.home')}>
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`bottom-nav-item${active === item.key ? ' active' : ''}`}
          onClick={() => onNavigate(item.key)}
          aria-current={active === item.key ? 'page' : undefined}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="bottom-nav-label">{t(`nav.${item.key}`)}</span>
        </button>
      ))}
    </nav>
  );
}
