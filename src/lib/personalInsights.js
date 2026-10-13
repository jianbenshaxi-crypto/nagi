import { CONTEXT_TAGS } from '../../shared/tags.js';
import { isSameLocalDay } from './dateUtils.js';

const MIN_TOTAL_ENTRIES = 8; // 全体としてこれ未満なら、まだ傾向を語れるほどのデータが無いとみなす
const MIN_GROUP_SIZE = 3; // 比較する両グループが最低これだけ無いと比較しない
const MIN_DIFF = 0.6; // 平均の差がこれ未満なら「傾向」として出さない
const EVENING_HOUR = 18;

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function tagInsight(history) {
  const entries = (history ?? []).filter((h) => typeof h.moodScore === 'number');
  if (entries.length < MIN_TOTAL_ENTRIES) return null;

  let best = null;
  for (const tag of CONTEXT_TAGS) {
    const withTag = entries.filter((h) => h.contextTags?.includes(tag)).map((h) => h.moodScore);
    const withoutTag = entries.filter((h) => !h.contextTags?.includes(tag)).map((h) => h.moodScore);
    if (withTag.length < MIN_GROUP_SIZE || withoutTag.length < MIN_GROUP_SIZE) continue;

    const diff = mean(withTag) - mean(withoutTag);
    if (Math.abs(diff) < MIN_DIFF) continue;

    if (!best || Math.abs(diff) > Math.abs(best.diff)) {
      best = { kind: 'tag', tag, direction: diff > 0 ? 'higher' : 'lower', magnitude: Math.abs(diff) };
    }
  }
  return best;
}

// 「夜にストレスが高くなりやすい」傾向のみを扱う（逆方向は特に伝える意味が薄いため）。
function timeOfDayInsight(history) {
  const entries = (history ?? []).filter((h) => typeof h.stressLevel === 'number');
  if (entries.length < MIN_TOTAL_ENTRIES) return null;

  const evening = entries.filter((h) => new Date(h.createdAt).getHours() >= EVENING_HOUR).map((h) => h.stressLevel);
  const daytime = entries.filter((h) => new Date(h.createdAt).getHours() < EVENING_HOUR).map((h) => h.stressLevel);
  if (evening.length < MIN_GROUP_SIZE || daytime.length < MIN_GROUP_SIZE) return null;

  const diff = mean(evening) - mean(daytime);
  if (diff < MIN_DIFF) return null;
  return { kind: 'timeOfDay', magnitude: diff };
}

// 「睡眠が少なかった翌日はストレスが高い傾向」。前日→翌日という1日のラグを見る。
function sleepLagInsight(history) {
  const byDay = new Map();
  for (const h of history ?? []) {
    const date = new Date(h.createdAt);
    const key = date.toDateString();
    if (!byDay.has(key)) byDay.set(key, { date, sleepLevels: [], stressLevels: [] });
    const day = byDay.get(key);
    if (typeof h.sleepLevel === 'number') day.sleepLevels.push(h.sleepLevel);
    if (typeof h.stressLevel === 'number') day.stressLevels.push(h.stressLevel);
  }
  const days = [...byDay.values()].sort((a, b) => a.date - b.date);
  if (days.length < MIN_TOTAL_ENTRIES) return null;

  const afterLowSleep = [];
  const afterOkSleep = [];
  for (let i = 0; i < days.length - 1; i++) {
    const today = days[i];
    const tomorrow = days[i + 1];
    if (Math.round((tomorrow.date - today.date) / (24 * 60 * 60 * 1000)) !== 1) continue;
    if (today.sleepLevels.length === 0 || tomorrow.stressLevels.length === 0) continue;

    const avgStressNextDay = mean(tomorrow.stressLevels);
    if (mean(today.sleepLevels) <= 1.5) afterLowSleep.push(avgStressNextDay);
    else afterOkSleep.push(avgStressNextDay);
  }
  if (afterLowSleep.length < MIN_GROUP_SIZE || afterOkSleep.length < MIN_GROUP_SIZE) return null;

  const diff = mean(afterLowSleep) - mean(afterOkSleep);
  if (diff < MIN_DIFF) return null;
  return { kind: 'sleepLag', magnitude: diff };
}

const MIN_CARE_TYPE_SAMPLES = 3; // このケアの前後比較データが最低これだけ無いと出さない

// 「このケアを使った日は、ケア後に気分が軽くなっていることがある」という傾向のみを扱う
// （逆方向＝「このケアは気分を下げる」は、断定するとケアそのものを避ける方向に働きかねず、
// NAGIの「何を選んでも良い」という方針に反するため、あえて検出・表示しない）。
// postCareMoodScore - moodScore の平均差が最も大きい（プラス方向の）ケアタイプを1つ返す。
function careTypeEffectInsight(history) {
  const entries = (history ?? []).filter(
    (h) => h.careType && typeof h.moodScore === 'number' && typeof h.postCareMoodScore === 'number'
  );
  if (entries.length < MIN_TOTAL_ENTRIES) return null;

  const byType = {};
  for (const h of entries) {
    (byType[h.careType] ??= []).push(h.postCareMoodScore - h.moodScore);
  }

  let best = null;
  for (const [careType, diffs] of Object.entries(byType)) {
    if (diffs.length < MIN_CARE_TYPE_SAMPLES) continue;
    const avgDiff = mean(diffs);
    if (avgDiff < MIN_DIFF) continue;
    if (!best || avgDiff > best.magnitude) {
      best = { kind: 'careTypeEffect', careType, magnitude: avgDiff };
    }
  }
  return best;
}

// 「先週より記録する日数が増えている」傾向。後退方向（減っている）は
// プレッシャーになりかねないため検出しない（careTypeEffectInsightと同じ設計判断）。
function checkInFrequencyInsight(history) {
  const entries = (history ?? []).filter((h) => typeof h.moodScore === 'number');
  if (entries.length < MIN_TOTAL_ENTRIES) return null;

  const distinctDays = (list) => new Set(list.map((h) => new Date(h.createdAt).toDateString())).size;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeekDays = distinctDays(entries.filter((h) => new Date(h.createdAt) >= weekAgo));
  const lastWeekDays = distinctDays(
    entries.filter((h) => new Date(h.createdAt) >= twoWeeksAgo && new Date(h.createdAt) < weekAgo)
  );

  const diff = thisWeekDays - lastWeekDays;
  if (diff < 2) return null; // 「増えている」と言うにはこれくらいの差が欲しい
  return { kind: 'checkInFrequency', magnitude: diff };
}

// 複数の候補（タグ相関・時間帯パターン・翌日への影響・ケアの効果・記録頻度）から、
// 最も差の大きい1件だけを返す（複数出さない＝提案は常に1つの設計哲学と統一）。
// 「原因」「診断」を断定しないため、返すのは種類とラベルのみで、
// 実際の文言は呼び出し側の辞書で固定する。
export function computePersonalInsight(history) {
  const candidates = [
    tagInsight(history),
    timeOfDayInsight(history),
    sleepLagInsight(history),
    careTypeEffectInsight(history),
    checkInFrequencyInsight(history),
  ].filter(Boolean);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.magnitude - a.magnitude);
  return candidates[0];
}

// 「最近のあなた」（NAGI PERSONAL GUIDE）：診断ではなく事実の共有。
// 直近days日間（既定7日＝週、30日＝月として使う）で最も使われたケアの種類と回数を返す
// （journalは別カウントのためここには含めない）。
export function computeTopCareType(history, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const counts = {};
  for (const h of history ?? []) {
    if (!h.careType) continue;
    if (new Date(h.createdAt) < cutoff) continue;
    counts[h.careType] = (counts[h.careType] ?? 0) + 1;
  }

  let top = null;
  for (const [type, count] of Object.entries(counts)) {
    if (!top || count > top.count) top = { type, count };
  }
  return top;
}

// 直近days日間（既定7日）で最も多かった気分スコア（最頻値）。週／月の振り返り用。
// 同数の場合は気分が良い方（数値が大きい方）を優先する（悪い方を強調しないため）。
export function computeWeeklyMoodMode(history, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const counts = {};
  for (const h of history ?? []) {
    if (typeof h.moodScore !== 'number') continue;
    if (new Date(h.createdAt) < cutoff) continue;
    counts[h.moodScore] = (counts[h.moodScore] ?? 0) + 1;
  }

  let top = null;
  for (const [score, count] of Object.entries(counts)) {
    const numericScore = Number(score);
    if (!top || count > top.count || (count === top.count && numericScore > top.score)) {
      top = { score: numericScore, count };
    }
  }
  return top;
}

// NAGI MOOD MAP用：指定した月（既定は今月）を、曜日の列がそろうようにパディングして返す
// （前後月の日は inMonth:false）。各日の気分スコアは複数あれば平均を最も近い整数に丸める。
// データが無い日はscore: nullとし、色ではなく絵文字で表現する前提のため
// 「悪い/良い」の評価軸そのものを持たない。
export function computeMoodCalendarMonth(history, monthDate = new Date()) {
  const entries = (history ?? []).filter((h) => typeof h.moodScore === 'number');
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=日曜始まり
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, i - startWeekday + 1);
    const scores = entries.filter((h) => isSameLocalDay(new Date(h.createdAt), date)).map((h) => h.moodScore);
    const score = scores.length > 0 ? Math.round(mean(scores)) : null;
    cells.push({ date, score, inMonth: date.getMonth() === month });
  }

  return cells;
}

const RECENT_TIRED_DAYS = 3;
const RECENT_TIRED_THRESHOLD = 2.5;
const BREATHING_FAN_MIN_COUNT = 3;

// Home画面の挨拶を3段階にするための信号（NAGI HOME PERSONALIZATION）。
// 「あなたは○○です」と決めつけないため、返すのは軽い分類キーのみで、
// 文言自体は呼び出し側の辞書で慎重な言い回しに固定する。
// 優先順位：直近の疲れの兆候 → よく使うケア → どちらも無ければnull（通常の再訪挨拶）。
export function computeGreetingSignal(history) {
  const entries = (history ?? []).filter((h) => typeof h.moodScore === 'number');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_TIRED_DAYS);
  const recent = entries.filter((h) => new Date(h.createdAt) >= cutoff).map((h) => h.moodScore);
  if (recent.length >= 2 && mean(recent) <= RECENT_TIRED_THRESHOLD) return 'tired';

  const top = computeTopCareType(history, 14);
  if (top?.type === 'breathing' && top.count >= BREATHING_FAN_MIN_COUNT) return 'breathingFan';

  return null;
}

// 今日と昨日、それぞれの気分平均を比べる（週単位の傾向とは別に、直近の変化を伝える）。
export function computeDayOverDayMood(history) {
  const entries = (history ?? []).filter((h) => typeof h.moodScore === 'number');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayScores = entries.filter((h) => isSameLocalDay(new Date(h.createdAt), today)).map((h) => h.moodScore);
  const yesterdayScores = entries
    .filter((h) => isSameLocalDay(new Date(h.createdAt), yesterday))
    .map((h) => h.moodScore);
  if (todayScores.length === 0 || yesterdayScores.length === 0) return null;

  const diff = mean(todayScores) - mean(yesterdayScores);
  if (Math.abs(diff) < 0.5) return null; // ほぼ同じなら何も言わない
  return diff > 0 ? 'lighter' : 'heavier';
}
