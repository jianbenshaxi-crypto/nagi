// 朝・昼・夜で提案の言い回しを少しだけ変える（NAGI DAILY PLAN）。
// 「毎日必ず実行させない」という方針のため、これは提案カードに添えるだけの一言であり、
// 何かを強制するものではない（既存の提案カード自体が常にスキップ可能）。

export function getTimeOfDay(now = new Date()) {
  const hour = now.getHours();
  if (hour < 11) return 'morning';
  if (hour < 18) return 'midday';
  return 'evening';
}
