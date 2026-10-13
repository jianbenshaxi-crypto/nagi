import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import MoodScale from '../components/MoodScale.jsx';

function compareKey(before, after) {
  if (before == null || after == null) return null;
  if (after > before) return 'compareUp';
  if (after < before) return 'compareDown';
  return 'compareSame';
}

const BREATHING_TYPES = ['breathing', 'breathing_sound'];

// ケア終了後のフォロー。達成/未達成は一切問わない —
// できたかどうかではなく、今どう感じているかだけを聞く。スキップも常に選べる。
// ケア前後の比較は「改善しました」のような断定を避け、慎重な言い回しのみ表示する。
export default function AfterCareScreen({ beforeScore, careType, onSubmit, onSkip }) {
  const { t } = useLocale();
  const [score, setScore] = useState(null);
  const cmpKey = compareKey(beforeScore, score);

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t('afterCare.title')}</h2>
      <p className="lead">{t('afterCare.lead')}</p>
      {BREATHING_TYPES.includes(careType) && <p className="hint">{t('afterCare.breathingNote')}</p>}
      <MoodScale value={score} onSelect={setScore} />

      {cmpKey && (
        <div className="suggestion-card">
          <p className="suggestion-body" style={{ marginBottom: 4 }}>
            {t('afterCare.beforeLabel')}：{t(`moodScale.levels.${beforeScore}`)}　→　{t('afterCare.afterLabel')}：
            {t(`moodScale.levels.${score}`)}
          </p>
          <p className="hint" style={{ margin: 0 }}>{t(`afterCare.${cmpKey}`)}</p>
        </div>
      )}

      <div className="btn-stack">
        {score && (
          <button className="btn btn-primary" onClick={() => onSubmit(score)}>
            {t('afterCare.next')}
          </button>
        )}
        <button className="btn btn-ghost" onClick={onSkip}>
          {t('afterCare.skip')}
        </button>
      </div>
    </div>
  );
}
