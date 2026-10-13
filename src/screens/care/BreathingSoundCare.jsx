import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import { useNatureSoundEngine } from './useNatureSoundEngine.js';
import { suggestSound } from '../../lib/suggestSound.js';
import SoundPicker from './SoundPicker.jsx';

const PHASES = [
  { key: 'inhale', labelKey: 'breathing.inhale', ms: 4000 },
  { key: 'hold', labelKey: 'breathing.hold', ms: 4000 },
  { key: 'exhale', labelKey: 'breathing.exhale', ms: 6000 },
];

// 呼吸ガイドと自然音を同時に体験できる統合ケア。
// 音のエンジンは自然音ケアと共通（useNatureSoundEngine）。
export default function BreathingSoundCare({ session }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const { t } = useLocale();
  const engine = useNatureSoundEngine();
  const suggestedType = suggestSound({
    moodInput: session?.moodInput,
    moodScore: session?.moodScore,
    stressLevel: session?.stressLevel,
    sleepLevel: session?.sleepLevel,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, PHASES[phaseIndex].ms);
    return () => clearTimeout(timer);
  }, [phaseIndex]);

  const phase = PHASES[phaseIndex];

  return (
    <div>
      <div className={`breathing-circle ${phase.key}`}>{t(phase.labelKey)}</div>
      <p className="lead">{t('breathingSound.lead')}</p>
      <SoundPicker {...engine} suggestedType={suggestedType} />
    </div>
  );
}
