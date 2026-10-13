import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { fetchMemoryNotes, sendChatMessage } from '../api/client.js';
import { useChatLog, clearChatLog, isOverDailyLimit, incrementTodayCount } from '../hooks/useChatLog.js';

const MODES = [
  { key: 'organize_feelings', emoji: '💭' },
  { key: 'hard_time', emoji: '😞' },
  { key: 'stress', emoji: '😣' },
  { key: 'before_sleep', emoji: '🌙' },
  { key: 'organize_thoughts', emoji: '📝' },
  { key: 'open_ended', emoji: '💬' },
];
const HISTORY_TURNS = 6;

let nextId = Date.now();
const newId = () => String(nextId++);

// 旧版NAGIの「少し話してみる」をReactに移植した相談チャット。
// AIがケアを勝手に始めることはなく、提案カードからユーザー自身が選んだ場合のみ移動する。
export default function ChatScreen({ clientToken, memoryEnabled, onStartCare }) {
  const { t, locale } = useLocale();
  const [log, setLog] = useChatLog();
  const [mode, setMode] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [memoryNotes, setMemoryNotes] = useState([]);
  const logRef = useRef(null);

  // NAGI MEMORYがオンの時だけ、本人が書いたメモをAIに渡す（オフなら取得もしない）
  useEffect(() => {
    if (!memoryEnabled) {
      setMemoryNotes([]);
      return;
    }
    fetchMemoryNotes(clientToken)
      .then((notes) => setMemoryNotes((notes ?? []).map((n) => n.content).filter(Boolean)))
      .catch(() => setMemoryNotes([]));
  }, [clientToken, memoryEnabled]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log, sending]);

  function addEntry(entry) {
    setLog((prev) => [...prev, { id: newId(), ...entry }]);
  }

  async function sendMessage(text, nextMode = mode) {
    const userEntry = { id: newId(), role: 'user', content: text };
    const conversation = [...log, userEntry];
    setLog(conversation);

    if (isOverDailyLimit()) {
      addEntry({ role: 'assistant', content: t('chat.dailyLimitMessage') });
      return;
    }
    incrementTodayCount();
    setSending(true);

    const history = conversation
      .filter((e) => (e.role === 'user' || e.role === 'assistant') && e.content)
      .slice(-HISTORY_TURNS)
      .map((e) => ({ role: e.role, content: e.content }));

    try {
      const data = await sendChatMessage({
        message: text,
        history,
        mode: nextMode,
        lang: locale,
        region: 'jp',
        memoryNotes,
      });
      const reply = data?.reply || t('chat.replyFallback');
      addEntry({ role: 'assistant', content: reply, resources: data?.crisis ? data.resources : null });
      if (!data?.crisis && (data?.suggestedCare === 'breathing' || data?.suggestedCare === 'journaling')) {
        addEntry({ role: 'care', careType: data.suggestedCare, short: !!data.short });
      }
    } catch (err) {
      addEntry({ role: 'notice', content: err?.name === 'AbortError' ? t('chat.timeoutError') : t('chat.networkError') });
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    sendMessage(text);
  }

  function handlePickMode(key) {
    if (sending) return;
    setMode(key);
    sendMessage(t(`chat.modes.${key}`), key);
  }

  function handleReset() {
    if (!window.confirm(t('chat.resetConfirm'))) return;
    clearChatLog();
    setLog([]);
    setMode('');
  }

  function dismiss(id) {
    setLog((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="card chat-card">
      <h2 className="section-title">
        <span aria-hidden="true">💬</span> {t('chat.title')}
      </h2>
      <p className="chat-subtitle">{t('chat.subtitle')}</p>
      <p className="chat-intro">{t('chat.introText')}</p>

      <div className="chat-suggestions">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`tag-chip${mode === m.key ? ' active' : ''}`}
            onClick={() => handlePickMode(m.key)}
            disabled={sending}
            aria-pressed={mode === m.key}
          >
            <span aria-hidden="true">{m.emoji}</span> {t(`chat.modes.${m.key}`)}
          </button>
        ))}
      </div>
      {mode && <p className="chat-mode-status">{t('chat.modeStatusTemplate', { modeLabel: t(`chat.modes.${mode}`) })}</p>}

      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label={t('chat.logAria')}>
        <div className="chat-msg bot">{t('chat.greeting')}</div>
        {log.map((entry) => {
          if (entry.role === 'user') {
            return (
              <div key={entry.id} className="chat-msg user">
                {entry.content}
              </div>
            );
          }
          if (entry.role === 'care') {
            const copyKey = entry.careType === 'breathing' && entry.short ? 'breathingShort' : entry.careType;
            return (
              <div key={entry.id} className="chat-msg bot care-suggestion">
                <p className="chat-care-suggestion-title">{t(`chat.careSuggestion.${copyKey}.title`)}</p>
                <div className="btn-stack">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onStartCare(entry.careType === 'journaling' ? 'journal' : 'breathing')}
                  >
                    {t(`chat.careSuggestion.${copyKey}.startButton`)}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => dismiss(entry.id)}>
                    {t('chat.careSuggestion.keepTalkingButton')}
                  </button>
                </div>
              </div>
            );
          }
          if (entry.resources?.length) {
            return (
              <div key={entry.id} className="chat-msg bot crisis">
                <p>{entry.content}</p>
                <ul>
                  {entry.resources.map((r) => (
                    <li key={r.href}>
                      <a href={r.href} {...(r.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
                        {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div key={entry.id} className="chat-msg bot">
              {entry.content}
            </div>
          );
        })}
        {sending && (
          <div className="chat-msg bot typing" aria-hidden="true">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          {t('chat.inputAria')}
        </label>
        <input
          id="chat-input"
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder={t('chat.inputPlaceholder')}
          autoComplete="off"
        />
        <button type="submit" className="chat-send" disabled={sending || !input.trim()}>
          {t('chat.sendButton')}
        </button>
      </form>

      <div className="chat-reset-row">
        <button type="button" className="btn btn-ghost" onClick={handleReset}>
          {t('chat.resetButton')}
        </button>
      </div>
      <p className="footer-note">{t('chat.aiNotice')}</p>
    </div>
  );
}
