import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext.jsx';

const PHASES = [
  { key: 'inhale', labelKey: 'breathing.inhale', ms: 4000 },
  { key: 'hold', labelKey: 'breathing.hold', ms: 4000 },
  { key: 'exhale', labelKey: 'breathing.exhale', ms: 6000 },
];
const DURATIONS_MIN = [1, 3, 5, 10];
const VOICE_SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window;

function formatRemaining(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BreathingCare() {
  const { t, locale } = useLocale();
  const [minutes, setMinutes] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const phase = PHASES[phaseIndex];

  function chooseMinutes(m) {
    setMinutes(m);
    setEndAt(Date.now() + m * 60 * 1000);
  }

  useEffect(() => {
    if (minutes === null || done) return undefined;
    const timer = setTimeout(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, PHASES[phaseIndex].ms);
    return () => clearTimeout(timer);
  }, [phaseIndex, minutes, done]);

  useEffect(() => {
    if (minutes === null) return undefined;
    const endTimer = setTimeout(() => setDone(true), minutes * 60 * 1000);
    return () => clearTimeout(endTimer);
  }, [minutes]);

  // 残り時間の表示のみを1秒ごとに更新する（呼吸のフェーズ切り替えとは別軸）
  useEffect(() => {
    if (endAt === null || done) return undefined;
    const update = () => setRemainingSec(Math.max(0, Math.round((endAt - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endAt, done]);

  // 音声ガイド（任意・追加ライブラリ無しでブラウザ標準のspeechSynthesisのみ使う）。
  // フェーズが変わるたびに読み上げ、離脱時・OFF時は必ずcancelして声が残らないようにする。
  useEffect(() => {
    if (!voiceEnabled || !VOICE_SUPPORTED || minutes === null || done) return undefined;
    const utterance = new SpeechSynthesisUtterance(t(phase.labelKey));
    utterance.lang = locale === 'en' ? 'en-US' : 'ja-JP';
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIndex, voiceEnabled, minutes, done, locale]);

  if (minutes === null) {
    return (
      <div>
        <p className="lead">{t('breathing.chooseDuration')}</p>
        <div className="range-tabs">
          {DURATIONS_MIN.map((m) => (
            <button
              key={m}
              type="button"
              className={`range-tab${m === 1 ? ' featured' : ''}`}
              onClick={() => chooseMinutes(m)}
            >
              {t('breathing.minutes', { count: m })}
            </button>
          ))}
        </div>
        {VOICE_SUPPORTED && (
          <button
            type="button"
            className={`btn btn-secondary${voiceEnabled ? ' active' : ''}`}
            style={{ marginTop: 16 }}
            onClick={() => setVoiceEnabled((v) => !v)}
            aria-pressed={voiceEnabled}
          >
            {t('breathing.voiceGuide')}：{voiceEnabled ? t('common.on') : t('common.off')}
          </button>
        )}
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <div className="breathing-circle">🌙</div>
        <h2>{t('breathing.doneTitle')}</h2>
        <p className="lead">{t('breathing.doneLead')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={`breathing-circle ${phase.key}`}>{t(phase.labelKey)}</div>
      {remainingSec != null && <p className="hint" style={{ textAlign: 'center' }}>{formatRemaining(remainingSec)}</p>}
      <p className="lead">{t('breathing.lead')}</p>
    </div>
  );
}
