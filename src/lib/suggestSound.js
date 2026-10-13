// 自然音の「今のあなたにはこれ」提案。自動再生はせず、チップを控えめにハイライトするだけに使う
// （ブラウザの自動再生ポリシー上そもそも音は自動で鳴らせないし、
//  「提案は必ず選択制」というNAGI全体の方針とも一致する）。
// 明確な手がかりが無い場合はnullを返し、その場合は何もハイライトしない。

const EVENING_HOUR = 18;

export function suggestSound({ moodInput, moodScore, stressLevel, sleepLevel, now = new Date() } = {}) {
  const text = moodInput ?? '';
  const isEvening = now.getHours() >= EVENING_HOUR;

  if (/不安|焦り|心配|怖/.test(text)) return 'rain';
  if (/疲れ|だるい|限界/.test(text)) return 'forest';
  if (isEvening && sleepLevel === 1) return 'rain';
  if (stressLevel === 3) return 'rain';
  if (sleepLevel === 1) return 'rain';
  if (typeof moodScore === 'number' && moodScore <= 2) return 'rain';
  if (isEvening) return 'rain';

  return null;
}
