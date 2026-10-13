// コンテキストタグの許可リスト。フロントエンド（チップ表示・パーソナルインサイト計算）と
// API（PATCHのバリデーション）の両方から使う単一の定義。
export const CONTEXT_TAGS = ['sleep_short', 'exercise', 'study', 'work', 'relationships', 'rest'];

// ジャーナルの感情タグ許可リスト。診断ではなく、自分の気持ちに名前をつけるための小さな固定セット。
export const EMOTION_TAGS = ['anxious', 'sad', 'angry', 'tired', 'relieved', 'happy'];
