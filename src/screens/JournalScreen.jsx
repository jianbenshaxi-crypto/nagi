import { useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { EXCESSIVE_LENGTH } from '../../shared/moderation.js';
import { EMOTION_TAGS } from '../../shared/tags.js';
import { fetchJournalEntries, createJournalEntry, deleteJournalEntry } from '../api/client.js';

const PROMPTS = ['tiring', 'accomplished', 'worried', 'toTomorrowSelf'];

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ジャーナリング。4つの質問から選んで短く書く→保存→過去の日記を振り返れる。
// 危機ワード検出は気分入力と全く同じ基準（evaluateMoodInput）をAPI側で適用している。
export default function JournalScreen({ clientToken, onCrisis, onBack }) {
  const { t, locale } = useLocale();
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [prompt, setPrompt] = useState(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState(null);
  const [emotionTags, setEmotionTags] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function toggleEmotionTag(tag) {
    setEmotionTags((list) => (list.includes(tag) ? list.filter((t2) => t2 !== tag) : [...list, tag]));
  }

  useEffect(() => {
    fetchJournalEntries(clientToken)
      .then((list) => setEntries(list ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoadingEntries(false));
  }, [clientToken]);

  async function handleDeleteEntry(id) {
    setDeletingId(id);
    try {
      await deleteJournalEntry(id, clientToken);
      setEntries((list) => list.filter((e) => e.id !== id));
    } catch {
      /* 削除に失敗しても記録は残る。次回開いた時にまた削除できる */
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const entry = await createJournalEntry(clientToken, prompt, value, locale, emotionTags);
      if (entry.flag === 'crisis') {
        onCrisis();
        return;
      }
      setEntries((list) => [entry, ...list]);
      setSavedPrompt(prompt);
      setPrompt(null);
      setValue('');
      setEmotionTags([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>

      {prompt ? (
        <>
          <h2>{t(`journal.prompts.${prompt}`)}</h2>
          <p className="lead">{t('journal.lead')}</p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t('journal.placeholder')}
              maxLength={2000}
            />
            <p className="hint">{t('moodInput.hint', { count: value.trim().length, limit: EXCESSIVE_LENGTH })}</p>

            <p className="hint" style={{ margin: '12px 0 8px' }}>
              {t('journal.emotionTagsPrompt')}
            </p>
            <div className="tag-picker" style={{ marginBottom: 12 }}>
              {EMOTION_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip${emotionTags.includes(tag) ? ' active' : ''}`}
                  onClick={() => toggleEmotionTag(tag)}
                  aria-pressed={emotionTags.includes(tag)}
                >
                  {t(`journal.emotionTags.${tag}`)}
                </button>
              ))}
            </div>

            {error && <div className="error-box">{error}</div>}
            <div className="btn-stack">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? t('journal.submitting') : t('journal.submit')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPrompt(null);
                  setEmotionTags([]);
                }}
                disabled={submitting}
              >
                {t('common.back')}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h2>{t('journal.title')}</h2>
          <p className="lead">{t('journal.intro')}</p>

          {savedPrompt && <p className="hint">{t('journal.savedLead')}</p>}

          <div className="care-grid">
            {PROMPTS.map((key) => (
              <button key={key} className="care-option" onClick={() => setPrompt(key)}>
                <span>
                  <p className="title">{t(`journal.prompts.${key}`)}</p>
                </span>
              </button>
            ))}
          </div>

          {!loadingEntries && entries.length > 0 && (
            <div className="settings-section">
              <p className="title">{t('journal.historyTitle')}</p>
              <div className="journal-history">
                {entries.map((entry) => (
                  <div key={entry.id} className="journal-entry">
                    <p className="journal-entry-meta">
                      {formatDate(entry.createdAt)} ・ {t(`journal.prompts.${entry.prompt}`)}
                    </p>
                    <p className="journal-entry-body">{entry.summary ?? entry.content}</p>
                    {entry.emotionTags?.length > 0 && (
                      <div className="tag-picker" style={{ marginTop: 6 }}>
                        {entry.emotionTags.map((tag) => (
                          <span key={tag} className="tag-chip active" style={{ pointerEvents: 'none' }}>
                            {t(`journal.emotionTags.${tag}`)}
                          </span>
                        ))}
                      </div>
                    )}
                    {deleteConfirmId === entry.id ? (
                      <div className="journal-entry-delete-confirm">
                        <span className="hint" style={{ margin: 0 }}>{t('journal.deleteConfirm')}</span>
                        <button
                          type="button"
                          className="journal-entry-delete-btn"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={deletingId === entry.id}
                        >
                          {deletingId === entry.id ? t('journal.deleting') : t('journal.deleteConfirmYes')}
                        </button>
                        <button type="button" className="journal-entry-delete-btn" onClick={() => setDeleteConfirmId(null)}>
                          {t('common.back')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="journal-entry-delete-btn"
                        style={{ marginTop: 6 }}
                        onClick={() => setDeleteConfirmId(entry.id)}
                      >
                        {t('journal.delete')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: 16 }}>
            {t('common.back')}
          </button>
        </>
      )}
    </div>
  );
}
