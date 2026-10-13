// アファーメーションの状態別セット選択。「絶対大丈夫」のような無責任な励ましは避け、
// 今の状態に寄り添う言葉だけを選ぶ（実際の文言はi18n辞書 words.sets 側に固定する）。

export function selectAffirmationState({ moodInput, moodScore, stressLevel } = {}) {
  const text = moodInput ?? '';

  if (/受験|入試|志望校|合格|模試/.test(text)) return 'examStress';
  if (/頑張りすぎ|がんばりすぎ|限界|無理し|休めない/.test(text)) return 'overworking';
  if (/不安|焦り|心配|怖/.test(text)) return 'anxious';
  if (/疲れ|だるい|眠れ/.test(text)) return 'tired';

  if (stressLevel === 3) return 'overworking';
  if (typeof moodScore === 'number') {
    if (moodScore <= 2) return 'tired';
    if (moodScore === 3) return 'anxious';
  }

  return 'general';
}
