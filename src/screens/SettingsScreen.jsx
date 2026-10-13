import { useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { useGentleReminder } from '../hooks/useGentleReminder.js';
import { computeTopCareType, computeWeeklyMoodMode } from '../lib/personalInsights.js';
import { MOOD_EMOJI } from '../components/MoodScale.jsx';
import { fetchMemoryNotes, createMemoryNote, deleteMemoryNote } from '../api/client.js';

const MEMORY_NOTE_MAX_LENGTH = 200;

const REMINDER_HOURS = [20, 21, 22];
const PROFILE_DAYS = 30;

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 'idle' | 'confirming' | 'deleting' | 'done' | 'error'
export default function SettingsScreen({ clientToken, history, memoryEnabled, onToggleMemory, onDelete, onBack }) {
  const { t } = useLocale();
  const [step, setStep] = useState('idle');
  const recordCount = history?.length ?? 0;
  const { reminderEnabled, reminderHour, reminderPermission, enableReminder, disableReminder, setReminderHour } =
    useGentleReminder();
  const topCareType = computeTopCareType(history, PROFILE_DAYS);
  const moodMode = computeWeeklyMoodMode(history, PROFILE_DAYS);
  const hasProfileData = Boolean(topCareType || moodMode);

  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [noteError, setNoteError] = useState(null);
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  useEffect(() => {
    if (!clientToken) return;
    fetchMemoryNotes(clientToken)
      .then((list) => setNotes(list ?? []))
      .catch(() => setNotes([]));
  }, [clientToken]);

  async function handleAddNote(e) {
    e.preventDefault();
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      const note = await createMemoryNote(clientToken, noteInput);
      setNotes((list) => [note, ...list]);
      setNoteInput('');
    } catch (err) {
      setNoteError(err.message);
    } finally {
      setNoteSubmitting(false);
    }
  }

  async function handleDeleteNote(id) {
    setNotes((list) => list.filter((n) => n.id !== id));
    try {
      await deleteMemoryNote(id, clientToken);
    } catch {
      fetchMemoryNotes(clientToken)
        .then((list) => setNotes(list ?? []))
        .catch(() => {});
    }
  }

  async function handleConfirmDelete() {
    setStep('deleting');
    try {
      await onDelete();
      setNotes([]);
      setStep('done');
    } catch {
      setStep('error');
    }
  }

  return (
    <div className="card">
      <p className="brand">{t('common.brand')}</p>
      <h2>{t('settings.title')}</h2>

      <div className="settings-section">
        <p className="title">{t('settings.profileTitle')}</p>
        {hasProfileData ? (
          <>
            {moodMode && (
              <p className="lead" style={{ marginBottom: 8 }}>
                {t('settings.profileMoodMode', { emoji: MOOD_EMOJI[moodMode.score], label: t(`moodScale.levels.${moodMode.score}`) })}
              </p>
            )}
            {topCareType && (
              <p className="lead">
                {t('settings.profileTopCareType', { type: t(`trends.careTypeNoun.${topCareType.type}`), count: topCareType.count })}
              </p>
            )}
          </>
        ) : (
          <p className="lead">{t('settings.profileEmpty')}</p>
        )}
        <p className="hint" style={{ marginTop: hasProfileData ? 12 : 0 }}>{t('settings.profileNote')}</p>
      </div>

      <div className="settings-section">
        <p className="title">{t('settings.dataTitle')}</p>
        <p className="lead">{t('settings.dataBody')}</p>
        <p className="hint">
          {recordCount > 0
            ? t('settings.recordCount', { count: recordCount, since: formatDate(history[0].createdAt) })
            : t('settings.recordCountEmpty')}
        </p>
      </div>

      <div className="settings-section">
        <p className="title">{t('settings.aiTitle')}</p>
        <p className="lead">{t('settings.aiBody')}</p>
      </div>

      <div className="settings-section">
        <p className="title">{t('settings.memoryTitle')}</p>
        <p className="lead">{t('settings.memoryBody')}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onToggleMemory(!memoryEnabled)}
          aria-pressed={memoryEnabled}
        >
          {memoryEnabled ? t('settings.memoryOn') : t('settings.memoryOff')}
        </button>
      </div>

      <div className="settings-section">
        <p className="title">{t('settings.notesTitle')}</p>
        <p className="lead">{t('settings.notesBody')}</p>

        {notes.length > 0 && (
          <ul className="memory-note-list">
            {notes.map((note) => (
              <li key={note.id} className="memory-note-item">
                <span>{note.content}</span>
                <button
                  type="button"
                  className="memory-note-delete"
                  onClick={() => handleDeleteNote(note.id)}
                  aria-label={t('settings.notesDelete')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddNote}>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => {
              setNoteInput(e.target.value);
              if (noteError) setNoteError(null);
            }}
            placeholder={t('settings.notesPlaceholder')}
            maxLength={MEMORY_NOTE_MAX_LENGTH}
          />
          {noteError && <div className="error-box">{noteError}</div>}
          <button className="btn btn-secondary" type="submit" disabled={noteSubmitting || !noteInput.trim()}>
            {t('settings.notesAdd')}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <p className="title">{t('settings.reminderTitle')}</p>
        <p className="lead">{t('settings.reminderBody')}</p>

        {reminderPermission === 'unsupported' && <p className="hint">{t('settings.reminderUnsupported')}</p>}
        {reminderPermission === 'denied' && <p className="hint">{t('settings.reminderDenied')}</p>}

        {reminderPermission !== 'unsupported' && (
          <>
            <p className="hint" style={{ margin: '0 0 6px' }}>{t('settings.reminderTimeLabel')}</p>
            <div className="range-tabs" style={{ marginBottom: 12 }}>
              {REMINDER_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`range-tab${reminderEnabled && reminderHour === h ? ' active' : ''}`}
                  onClick={() => (reminderEnabled ? setReminderHour(h) : enableReminder(h))}
                  aria-pressed={reminderEnabled && reminderHour === h}
                >
                  {h}:00
                </button>
              ))}
            </div>
            {reminderEnabled && (
              <button type="button" className="btn btn-secondary" onClick={disableReminder}>
                {t('settings.reminderOn')}
              </button>
            )}
          </>
        )}
      </div>

      <div className="settings-section">
        <p className="title">{t('settings.deleteTitle')}</p>
        <p className="lead">{t('settings.deleteBody')}</p>

        {step === 'idle' && (
          <button className="btn btn-secondary" onClick={() => setStep('confirming')}>
            {t('settings.deleteButton')}
          </button>
        )}

        {step === 'confirming' && (
          <>
            <div className="error-box">{t('settings.deleteConfirm')}</div>
            <div className="btn-stack">
              <button className="btn btn-secondary" onClick={handleConfirmDelete}>
                {t('settings.deleteButton')}
              </button>
              <button className="btn btn-ghost" onClick={() => setStep('idle')}>
                {t('common.back')}
              </button>
            </div>
          </>
        )}

        {step === 'deleting' && <p className="lead">{t('common.preparing')}</p>}
        {step === 'done' && <p className="lead">{t('settings.deleteDone')}</p>}
        {step === 'error' && <div className="error-box">{t('settings.deleteError')}</div>}
      </div>

      {step !== 'deleting' && step !== 'done' && (
        <button className="btn btn-ghost" onClick={onBack}>
          {t('common.back')}
        </button>
      )}
    </div>
  );
}
