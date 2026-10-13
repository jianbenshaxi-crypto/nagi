// 「今日のコンディション」を、点数やランキングではなく短い一文で伝える。
// suggestNextAction.jsと判断基準は近いが、こちらは「何をするか」ではなく
// 「今日の自分をどう捉えるとよさそうか」という一段階手前の言葉を返す。

export function computeTodayCondition({ moodScore, stressLevel, energyLevel, sleepLevel } = {}) {
  if (typeof moodScore !== 'number') return null;

  if (moodScore <= 2 || stressLevel === 3 || sleepLevel === 1) return 'needsRest';
  if (moodScore === 3 || energyLevel === 1) return 'takeItEasy';
  return 'steady';
}
