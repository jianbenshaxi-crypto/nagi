import { useEffect, useRef, useState } from 'react';
import { getClientToken, resetClientToken } from './hooks/useClientToken.js';
import { useMemoryConsent } from './hooks/useMemoryConsent.js';
import { saveDraft, loadDraft, clearDraft } from './hooks/useLocalDraft.js';
import { isSameLocalDay, daysBetweenLocalDates } from './lib/dateUtils.js';
import { getJourneyDay, resetFirstUse } from './lib/journeyDay.js';
import {
  fetchCurrentSession,
  fetchMoodHistory,
  fetchJournalEntries,
  createSession,
  updateSession,
  deleteAllData,
} from './api/client.js';
import { useLocale } from './i18n/LocaleContext.jsx';
import LocaleToggle from './i18n/LocaleToggle.jsx';
import BottomNav from './components/BottomNav.jsx';
import TopActions from './components/TopActions.jsx';
import { clearChatLog } from './hooks/useChatLog.js';
import HomeScreen from './screens/HomeScreen.jsx';
import ResumePrompt from './screens/ResumePrompt.jsx';
import MoodInputScreen from './screens/MoodInputScreen.jsx';
import CrisisScreen from './screens/CrisisScreen.jsx';
import CareSelectionScreen from './screens/CareSelectionScreen.jsx';
import CareSessionScreen from './screens/CareSessionScreen.jsx';
import AfterCareScreen from './screens/AfterCareScreen.jsx';
import EndScreen from './screens/EndScreen.jsx';
import TrendsScreen from './screens/TrendsScreen.jsx';
import ChatScreen from './screens/ChatScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import JournalScreen from './screens/JournalScreen.jsx';
import WeeklyReflectionScreen from './screens/WeeklyReflectionScreen.jsx';

const NAV_PHASES = ['home', 'care', 'trends', 'consult'];
const NO_NAV_PHASES = ['loading', 'care_session', 'crisis'];

// サーバー（DB）に保存できなくても、その場の体験は止めない。
// 保存は「次回の続きから」のための補助であり、今この瞬間のケアを妨げてはならない。
async function safeUpdate(id, patch) {
  try {
    return await updateSession(id, patch);
  } catch (err) {
    console.warn('セッションの保存に失敗しました（体験は継続します）', err);
    return null;
  }
}

export default function App() {
  const [phase, setPhase] = useState('loading');
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [journalCount, setJournalCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const clientToken = getClientToken();
  const { t } = useLocale();
  const { memoryEnabled, setMemoryEnabled } = useMemoryConsent();
  const creatingRef = useRef(null);

  // 初回マウント時のみ実行する（依存配列は空）。データ削除後にclientTokenが
  // 入れ替わっても、その時点の状態は既にhandleDeleteAllData側で確定させているため
  // ここで再実行してphaseを巻き戻す必要はない。
  useEffect(() => {
    const FETCH_FAILED = Symbol('fetch_failed');
    Promise.all([
      fetchCurrentSession(clientToken).catch(() => FETCH_FAILED),
      fetchMoodHistory(clientToken).catch(() => []),
    ]).then(([existing, hist]) => {
      setHistory(hist ?? []);

      if (existing === FETCH_FAILED) {
        // サーバーに問い合わせられなかった場合だけ、ローカル下書きを保険として使う
        const draft = loadDraft();
        if (draft) {
          setSession(draft);
          setPhase('resume');
          return;
        }
        setPhase('home');
        return;
      }

      if (existing) {
        setSession(existing);
        setPhase('resume');
      } else {
        clearDraft(); // サーバーが「進行中のセッションは無い」と確定できた場合は、古い下書きも片付ける
        setPhase('home');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // RECORDの「ジャーナルを○回書いています」用。無くても中心体験には影響しないため、
  // 失敗しても静かに諦める（他の読み込みをブロックしない）。
  useEffect(() => {
    fetchJournalEntries(clientToken)
      .then((list) => setJournalCount(list?.length ?? 0))
      .catch(() => {});
  }, [clientToken]);

  // サーバー保存に失敗しても、進行中の記録がリロードで消えないようにする保険。
  useEffect(() => {
    saveDraft(session);
  }, [session]);

  // Home画面でのタップなど、セッションがまだ無い状態からの最初の書き込みで使う。
  // 同時に複数回呼ばれても、進行中の作成を使い回して二重生成を防ぐ。
  async function ensureSession() {
    if (session?.id) return session;
    if (!creatingRef.current) {
      creatingRef.current = createSession(clientToken, { abandonPrevious: true })
        .catch(() => ({ id: null, clientToken, status: 'IN_PROGRESS' }))
        .then((created) => {
          setSession(created);
          return created;
        });
    }
    const created = await creatingRef.current;
    creatingRef.current = null;
    return created;
  }

  async function beginFresh() {
    setBusy(true);
    if (session?.id) {
      await safeUpdate(session.id, { status: 'ABANDONED' });
    }
    setSession(null);
    setPhase('home');
    setBusy(false);
  }

  function resumeFromExisting() {
    if (session.careType) setPhase('care_session');
    else if (session.moodFlag === 'crisis') setPhase('crisis');
    else if (session.moodInput) setPhase('care_selection');
    else if (session.moodScore) setPhase('home');
    else setPhase('mood_input');
  }

  async function handleMoodScore(score) {
    const current = await ensureSession();
    if (current.id) {
      const updated = await safeUpdate(current.id, { moodScore: score });
      setSession(updated ?? { ...current, moodScore: score });
    } else {
      setSession((s) => ({ ...s, moodScore: score }));
    }
  }

  async function handleTags(tags) {
    const current = await ensureSession();
    if (current.id) {
      const updated = await safeUpdate(current.id, { contextTags: tags });
      setSession(updated ?? { ...current, contextTags: tags });
    } else {
      setSession((s) => ({ ...s, contextTags: tags }));
    }
  }

  async function handleHighlight(text) {
    const current = await ensureSession();
    if (current.id) {
      const updated = await safeUpdate(current.id, { highlight: text });
      setSession(updated ?? { ...current, highlight: text });
    } else {
      setSession((s) => ({ ...s, highlight: text }));
    }
  }

  async function handleStressLevel(level) {
    const current = await ensureSession();
    if (current.id) {
      const updated = await safeUpdate(current.id, { stressLevel: level });
      setSession(updated ?? { ...current, stressLevel: level });
    } else {
      setSession((s) => ({ ...s, stressLevel: level }));
    }
  }

  async function handleEnergyLevel(level) {
    const current = await ensureSession();
    if (current.id) {
      const updated = await safeUpdate(current.id, { energyLevel: level });
      setSession(updated ?? { ...current, energyLevel: level });
    } else {
      setSession((s) => ({ ...s, energyLevel: level }));
    }
  }

  async function handleSleepLevel(level) {
    const current = await ensureSession();
    if (current.id) {
      const updated = await safeUpdate(current.id, { sleepLevel: level });
      setSession(updated ?? { ...current, sleepLevel: level });
    } else {
      setSession((s) => ({ ...s, sleepLevel: level }));
    }
  }

  async function handleAfterCareSubmit(score) {
    if (session?.id) {
      await safeUpdate(session.id, { postCareMoodScore: score });
    }
    setPhase('end');
  }

  async function handleMoodSubmit(result) {
    setBusy(true);
    const current = await ensureSession();
    const updated = current.id ? await safeUpdate(current.id, { moodInput: result.moodInput }) : null;
    const merged =
      updated ?? {
        ...current,
        moodInput: result.moodInput,
        moodSummary: result.moodSummary,
        moodFlag: result.code,
      };
    setSession(merged);
    setPhase(result.crisis ? 'crisis' : 'care_selection');
    setBusy(false);
  }

  async function handleCareSelect(careType) {
    if (careType === 'journal') {
      setPhase('journal');
      return;
    }
    setBusy(true);
    const current = await ensureSession();
    const updated = current.id ? await safeUpdate(current.id, { careType }) : null;
    setSession(updated ?? { ...current, careType });
    setPhase('care_session');
    setBusy(false);
  }

  async function handleComplete(accomplishment) {
    if (session?.id) {
      await safeUpdate(session.id, { accomplishment, status: 'COMPLETED' });
    }
    // ローカルの状態もCOMPLETEDにしておく（ローカル下書きが完了済みセッションを
    // 「進行中」のまま保持し続けてしまわないように）
    setSession((s) => (s ? { ...s, accomplishment, status: 'COMPLETED' } : s));
    // 「心の波」がその場で最新の状態を反映できるよう、記録済みの気分スコアを履歴に軽く反映しておく
    if (session?.moodScore) {
      setHistory((h) => [...h, { createdAt: new Date().toISOString(), moodScore: session.moodScore }]);
    }
  }

  async function handleDeleteAllData() {
    await deleteAllData(clientToken);
    resetClientToken();
    resetFirstUse();
    clearChatLog();
    setSession(null);
    setHistory([]);
  }

  const isReturning = history.length > 0;
  const alreadyCheckedInToday = history.some((h) => isSameLocalDay(new Date(h.createdAt), new Date()));
  const priorVisitDates = history
    .map((h) => new Date(h.createdAt))
    .filter((d) => !isSameLocalDay(d, new Date()));
  const daysSinceLastVisit =
    priorVisitDates.length > 0
      ? daysBetweenLocalDates(new Date(Math.max(...priorVisitDates.map((d) => d.getTime()))), new Date())
      : null;
  const journeyDay = phase === 'home' ? getJourneyDay(history) : null;
  const showNav = !NO_NAV_PHASES.includes(phase);
  const navActive = NAV_PHASES.includes(phase) ? phase : null;

  return (
    <div className={`app-shell${showNav ? ' with-nav' : ''}`}>
      <div className="ambient-bg" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <LocaleToggle />
      {showNav && <TopActions onOpenSettings={() => setPhase('settings')} />}
      {phase === 'loading' && (
        <div className="card">
          <p className="brand">{t('common.brand')}</p>
          <p className="lead">{t('common.preparing')}</p>
        </div>
      )}

      {phase === 'home' && (
        <HomeScreen
          isReturning={isReturning}
          alreadyCheckedInToday={alreadyCheckedInToday}
          daysSinceLastVisit={daysSinceLastVisit}
          journeyDay={journeyDay}
          initialScore={session?.moodScore ?? null}
          initialTags={session?.contextTags ?? []}
          initialHighlight={session?.highlight ?? ''}
          initialStressLevel={session?.stressLevel ?? null}
          initialEnergyLevel={session?.energyLevel ?? null}
          initialSleepLevel={session?.sleepLevel ?? null}
          memoryEnabled={memoryEnabled}
          history={history}
          onMoodScore={handleMoodScore}
          onTags={handleTags}
          onHighlight={handleHighlight}
          onStressLevel={handleStressLevel}
          onEnergyLevel={handleEnergyLevel}
          onSleepLevel={handleSleepLevel}
          onPickCare={handleCareSelect}
          onSeeAll={() => setPhase('care_selection')}
          onWriteMore={() => setPhase('mood_input')}
        />
      )}

      {phase === 'resume' && (
        <ResumePrompt onResume={resumeFromExisting} onRestart={beginFresh} loading={busy} />
      )}

      {phase === 'mood_input' && <MoodInputScreen onSubmit={handleMoodSubmit} submitting={busy} />}

      {phase === 'crisis' && (
        <CrisisScreen
          onContinueToCare={() => setPhase('care_selection')}
          onEndForToday={() => setPhase('end')}
        />
      )}

      {(phase === 'care_selection' || phase === 'care') && (
        <CareSelectionScreen
          moodInput={session?.moodInput}
          moodScore={session?.moodScore}
          stressLevel={session?.stressLevel}
          energyLevel={session?.energyLevel}
          sleepLevel={session?.sleepLevel}
          crisis={session?.moodFlag === 'crisis'}
          onSelect={handleCareSelect}
          submitting={busy}
        />
      )}

      {phase === 'care_session' && (
        <CareSessionScreen careType={session?.careType} session={session} onFinish={() => setPhase('after_care')} />
      )}

      {phase === 'journal' && (
        <JournalScreen clientToken={clientToken} onCrisis={() => setPhase('crisis')} onBack={() => setPhase('home')} />
      )}

      {phase === 'after_care' && (
        <AfterCareScreen
          beforeScore={session?.moodScore ?? null}
          careType={session?.careType}
          onSubmit={handleAfterCareSubmit}
          onSkip={() => setPhase('end')}
        />
      )}

      {phase === 'end' && <EndScreen onComplete={handleComplete} onBackHome={() => setPhase('home')} />}

      {phase === 'trends' && (
        <TrendsScreen
          history={history}
          memoryEnabled={memoryEnabled}
          journalCount={journalCount}
          onOpenWeeklyReflection={() => setPhase('weekly_reflection')}
        />
      )}

      {phase === 'weekly_reflection' && (
        <WeeklyReflectionScreen clientToken={clientToken} history={history} onBack={() => setPhase('trends')} />
      )}

      {phase === 'consult' && (
        <ChatScreen clientToken={clientToken} memoryEnabled={memoryEnabled} onStartCare={handleCareSelect} />
      )}

      {phase === 'settings' && (
        <SettingsScreen
          clientToken={clientToken}
          history={history}
          memoryEnabled={memoryEnabled}
          onToggleMemory={setMemoryEnabled}
          onDelete={handleDeleteAllData}
          onBack={() => setPhase('home')}
        />
      )}

      {showNav && <BottomNav active={navActive} onNavigate={setPhase} />}
    </div>
  );
}
