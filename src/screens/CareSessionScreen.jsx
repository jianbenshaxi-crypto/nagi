import { useLocale } from '../i18n/LocaleContext.jsx';
import BreathingCare from './care/BreathingCare.jsx';
import NatureSoundCare from './care/NatureSoundCare.jsx';
import BreathingSoundCare from './care/BreathingSoundCare.jsx';
import WordsCare from './care/WordsCare.jsx';
import MoveCare from './care/MoveCare.jsx';

const CARE_COMPONENTS = {
  breathing: BreathingCare,
  nature_sound: NatureSoundCare,
  breathing_sound: BreathingSoundCare,
  words: WordsCare,
  move: MoveCare,
};

export default function CareSessionScreen({ careType, session, onFinish }) {
  const { t } = useLocale();
  const CareComponent = CARE_COMPONENTS[careType] ?? WordsCare;

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <CareComponent session={session} />
      <div className="exit-link">
        <button className="btn btn-primary" onClick={onFinish}>
          {t('careSession.finish')}
        </button>
      </div>
    </div>
  );
}
