import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import { selectAffirmationState } from '../../lib/affirmations.js';

export default function WordsCare({ session }) {
  const [index, setIndex] = useState(0);
  const { t } = useLocale();
  const stateKey = selectAffirmationState({
    moodInput: session?.moodInput,
    moodScore: session?.moodScore,
    stressLevel: session?.stressLevel,
  });
  const phrases = t(`words.sets.${stateKey}`);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <div>
      <div className="words-card" key={index}>{phrases[index % phrases.length]}</div>
      <button
        className="btn btn-secondary"
        onClick={() => setIndex((i) => (i + 1) % phrases.length)}
      >
        {t('words.next')}
      </button>
    </div>
  );
}
