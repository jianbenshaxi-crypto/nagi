// 「今の気分」入力に対するバリデーション／モデレーション。
// クライアント（即時フィードバック）とサーバー（保存前の最終チェック）の両方から
// 同じロジックを使うことで、表示と記録の判断がズレないようにする。

const EXPECTED_LENGTH = 40; // 「一言」入力として想定する目安の長さ
export const EXCESSIVE_LENGTH = EXPECTED_LENGTH * 10; // イレギュラーケース2の「想定の10倍」

const CRISIS_KEYWORDS = [
  // 日本語
  '死にたい', '死のう', '死んで', '自殺', '消えたい', '消えてしまいたい',
  '生きてる意味', '生きている意味', 'リストカット', 'リスカ', '終わりにしたい',
  '飛び降り', '首を吊', 'もう無理', '限界を超え',
  // English
  'want to die', 'kill myself', 'end my life', 'suicide', 'suicidal',
  'self harm', 'self-harm', "can't go on", 'no reason to live', 'better off dead',
];

// 直接的な暴言・スパム・スクリプト注入などを想定した最小限のリスト。
// 「辛い」「嫌」等のネガティブな感情語は対象外（それを受け止めるためのアプリのため）。
const INAPPROPRIATE_PATTERNS = [
  /<\s*script/i,
  /https?:\/\/\S+/i, // 記録欄への外部リンク・宣伝の混入を防ぐ
  /死ね|殺すぞ|きも[いい]?ね/,
  /\bkill yourself\b|\bkys\b/i,
];

const MESSAGES = {
  ja: {
    empty: '今の気持ちを一言だけでも大丈夫です。',
    gibberish: 'うまく読み取れませんでした。思っていることを、そのままの言葉で書いてみてください。',
    inappropriate: 'その内容は記録できません。表現を変えて、もう一度聞かせてください。',
  },
  en: {
    empty: "It's okay to write just a word about how you're feeling.",
    gibberish: "We couldn't quite make sense of that. Try writing what you're feeling in your own words.",
    inappropriate: "That content can't be saved. Please try rephrasing and let us know again.",
  },
};

export function evaluateMoodInput(rawInput, locale = 'ja') {
  const messages = MESSAGES[locale] ?? MESSAGES.ja;
  const trimmed = (rawInput ?? '').trim();

  // イレギュラーケース1：空っぽ
  if (trimmed.length === 0) {
    return {
      ok: false,
      code: 'empty',
      message: messages.empty,
    };
  }

  // イレギュラーケース3：無意味な文字列（AI処理・記録しない）
  if (isGibberish(trimmed)) {
    return {
      ok: false,
      code: 'gibberish',
      record: false,
      message: messages.gibberish,
    };
  }

  // イレギュラーケース3：不適切な入力（エラー表示）
  if (isInappropriate(trimmed)) {
    return {
      ok: false,
      code: 'inappropriate',
      message: messages.inappropriate,
    };
  }

  const crisis = containsCrisisSignal(trimmed);

  // イレギュラーケース2：過剰入力（要約して記録）
  const excessive = trimmed.length > EXCESSIVE_LENGTH;
  const moodSummary = excessive ? summarize(trimmed) : trimmed;

  return {
    ok: true,
    code: crisis ? 'crisis' : null,
    crisis,
    excessive,
    moodInput: trimmed,
    moodSummary,
  };
}

function isGibberish(text) {
  const noSpace = text.replace(/\s/g, '');
  if (noSpace.length === 0) return false;

  // 同じ文字の連続（例:「あああああ」「aaaaaaa」）
  if (/^(.)\1{4,}$/.test(noSpace)) return true;

  // 日本語（ひらがな・カタカナ・漢字）を含む文章は、文字種の少なさだけでは
  // 判定しない（同じ言い回しの繰り返しでも正当な内容でありうるため）。
  const hasJapanese = /[぀-ヿ一-鿿]/.test(noSpace);
  if (hasJapanese) return false;

  // 日本語も英単語らしき母音パターンも一切含まない、記号・子音の羅列
  // （例:「asdkfjaslkdfj」）はキーボード連打とみなす。
  const hasVowelPattern = /[aeiouAEIOU]/.test(noSpace);
  const isLongAsciiJumble = /^[a-zA-Z0-9!-/:-@[-`{-~]+$/.test(noSpace) && noSpace.length >= 12;
  if (!hasVowelPattern && isLongAsciiJumble) return true;

  // それ以外の非日本語の短い文字列は、ユニーク文字比率が極端に低ければ雑音とみなす
  const uniqueChars = new Set(noSpace).size;
  if (noSpace.length >= 8 && noSpace.length <= 60 && uniqueChars / noSpace.length < 0.2) return true;

  return false;
}

// NAGI MEMORY NOTES等、気分の吐露ではない短い自由記述（危機ワード検出の対象外にしたいもの）に、
// スクリプト混入・スパムリンクだけを弾くための最小限のチェックとして再利用する。
export function isInappropriate(text) {
  return INAPPROPRIATE_PATTERNS.some((pattern) => pattern.test(text));
}

function containsCrisisSignal(text) {
  return CRISIS_KEYWORDS.some((keyword) => text.includes(keyword));
}

// AI APIを使わず、句読点区切りで先頭・末尾の文を残す簡易要約。
// 先頭は状況、末尾は結論（今の気持ち）を含みやすいという経験則に基づく。
function summarize(text, maxLength = 120) {
  const sentences = text
    .split(/(?<=[。！？\n])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  let summary = sentences[0];
  if (sentences.length > 1) {
    const last = sentences[sentences.length - 1];
    if (!summary.includes(last)) summary += last;
  }

  if (summary.length > maxLength) summary = `${summary.slice(0, maxLength)}…`;
  return summary;
}

const CRISIS_SUPPORT_MESSAGES = {
  ja:
    'そう感じるくらい、しんどい状況なんですね。それを話してくれてありがとう。\n' +
    'ひとりで抱えなくて大丈夫です。今すぐ話せる場所があります。\n\n' +
    'よりそいホットライン: 0120-279-338（24時間・無料）\n' +
    'いのちの電話: 0570-064-556\n\n' +
    '緊急の場合は 110番/119番 に連絡してください。',
  en:
    'Feeling that way means things must be really hard right now. Thank you for telling me.\n' +
    "You don't have to carry this alone. There are places you can talk to right now.\n\n" +
    'If you are in Japan — Yorisoi Hotline: 0120-279-338 (24h, free) / TELL Lifeline: 03-5774-0992\n' +
    'Outside Japan, you can find a local helpline at findahelpline.com\n\n' +
    'In an emergency, please contact your local emergency number.',
};

export function getCrisisSupportMessage(locale = 'ja') {
  return CRISIS_SUPPORT_MESSAGES[locale] ?? CRISIS_SUPPORT_MESSAGES.ja;
}
