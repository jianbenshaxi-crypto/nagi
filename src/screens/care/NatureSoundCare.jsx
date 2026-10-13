import { useLocale } from '../../i18n/LocaleContext.jsx';
import { SOUND_EMOJI, useNatureSoundEngine } from './useNatureSoundEngine.js';
import { suggestSound } from '../../lib/suggestSound.js';
import SoundPicker from './SoundPicker.jsx';

export default function NatureSoundCare({ session }) {
  const { t } = useLocale();
  const engine = useNatureSoundEngine();
  const primaryType = engine.activeTypes[0];
  const suggestedType = suggestSound({
    moodInput: session?.moodInput,
    moodScore: session?.moodScore,
    stressLevel: session?.stressLevel,
    sleepLevel: session?.sleepLevel,
  });

  return (
    <div>
      <div className="sound-visual">{primaryType ? SOUND_EMOJI[primaryType] : '🌊'}</div>
      <SoundPicker {...engine} suggestedType={suggestedType} />
      {!engine.unsupported && (
        <p className="lead" style={{ marginTop: 16 }}>
          {t('natureSound.lead')}
        </p>
      )}
    </div>
  );
}
