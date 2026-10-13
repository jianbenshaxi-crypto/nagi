import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext.jsx';

const STEPS = [
  { key: 'neck', ms: 20000 },
  { key: 'shoulders', ms: 20000 },
  { key: 'wrists', ms: 15000 },
  { key: 'stretch', ms: 15000 },
  { key: 'forward', ms: 20000 },
];
const DURATIONS_MIN = [1, 3];

function formatRemaining(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// 軽いストレッチ。運動指導ではなく、あくまで「少し体をほぐす」ためのもの。
// 呼吸法(BreathingCare)と同じ設計：時間を選ぶ→順番に案内→途中でやめても失敗扱いしない。
export default function MoveCare() {
  const { t } = useLocale();
  const [minutes, setMinutes] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  function chooseMinutes(m) {
    setMinutes(m);
    setEndAt(Date.now() + m * 60 * 1000);
  }

  useEffect(() => {
    if (minutes === null || done) return undefined;
    const timer = setTimeout(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, STEPS[stepIndex].ms);
    return () => clearTimeout(timer);
  }, [stepIndex, minutes, done]);

  useEffect(() => {
    if (minutes === null) return undefined;
    const endTimer = setTimeout(() => setDone(true), minutes * 60 * 1000);
    return () => clearTimeout(endTimer);
  }, [minutes]);

  useEffect(() => {
    if (endAt === null || done) return undefined;
    const update = () => setRemainingSec(Math.max(0, Math.round((endAt - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endAt, done]);

  if (minutes === null) {
    return (
      <div>
        <p className="lead">{t('move.chooseDuration')}</p>
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
        <p className="hint" style={{ marginTop: 16 }}>{t('move.safetyNote')}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <div className="sound-visual">🙆</div>
        <h2>{t('move.doneTitle')}</h2>
        <p className="lead">{t('move.doneLead')}</p>
      </div>
    );
  }

  const step = STEPS[stepIndex];
  return (
    <div>
      <div className="sound-visual">🙆</div>
      <h2>{t(`move.steps.${step.key}.title`)}</h2>
      {remainingSec != null && <p className="hint" style={{ textAlign: 'center' }}>{formatRemaining(remainingSec)}</p>}
      <p className="lead">{t(`move.steps.${step.key}.desc`)}</p>
    </div>
  );
}
