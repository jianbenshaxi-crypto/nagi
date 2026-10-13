// 「今のあなたにはこれ」の提案ロジック。ホーム画面（タップのみ）と
// ケア選択画面（自由記述あり）の両方から使う共通の判断基準。
// 戻り値は { type, reason }。reasonがあれば suggestions.reasons.{reason} を、
// 無ければ suggestions.{type} を表示文言として使う（呼び出し側の役目）。

export const CARE_EMOJI = {
  breathing: '🌬️',
  nature_sound: '🌊',
  breathing_sound: '🌬️🌊',
  words: '💬',
};

export function suggestNextAction({ moodInput, moodScore, stressLevel, energyLevel, sleepLevel, crisis } = {}) {
  const text = moodInput ?? '';

  // 自由記述・危機フラグが最も具体的な手がかりのため最優先
  if (crisis) return { type: 'breathing', reason: null };
  if (/眠れ|疲れ|だるい|限界/.test(text)) return { type: 'breathing', reason: null };
  if (/不安|焦り|心配|怖/.test(text)) return { type: 'words', reason: null };

  // 次にストレス/睡眠/エネルギー（ホームの軽量任意入力、1=低〜3=高）
  if (stressLevel === 3) return { type: 'breathing', reason: 'stressHigh' };
  if (sleepLevel === 1) return { type: 'nature_sound', reason: 'sleepLow' };
  if (energyLevel === 1) return { type: 'nature_sound', reason: null };

  // 最後にタップだけの気分5段階（1=大荒れ 〜 5=凪）。
  // 1点だけでは「危機」とは判定しない（誤検知を避けるため。危機判定は自由記述の
  // キーワード検出＝evaluateMoodInputのcrisisフラグのみで行う）。
  if (typeof moodScore === 'number') {
    if (moodScore <= 2) return { type: moodScore === 1 ? 'breathing' : 'breathing_sound', reason: 'moodLow' };
    if (moodScore === 3) return { type: 'words', reason: null };
  }

  return { type: 'nature_sound', reason: null };
}
