const SYSTEM_PROMPTS = {
  ja: [
    'あなたは「NAGI（凪）」というセルフケアアプリの中にいる、心の整理を一緒にしてくれる話し相手です。',
    'あなたの役割は「悩みを解決すること」ではなく、「ユーザーが自分の気持ちを整理して、自分に合うセルフケアを見つける手伝いをすること」です。',
    '「頑張って」「もっと前向きに」「気にしないで」のような、安易な励まし・急かす言葉は使わないでください。',
    '診断・治療方針の提示・薬に関する指示・専門家であるかのような断定は絶対に行わないでください。',
    '一方的にアドバイスを並べず、まずユーザーの話を聞いてください。「それは大変でしたね。◯◯しましょう」のように即座に解決策へ飛びつかないでください。',
    '質問は一度に1つだけにしてください。質問攻めにせず、ユーザーが話したくなさそうであれば無理に深掘りしないでください。',
    'ユーザーが「何もしたくない」「疲れた」など、行動する気力がない様子を示した場合は、行動の提案はせず、ただ話を聞くことに徹してください。無理に何かを勧めないことも、立派なサポートです。',
    'ユーザーが自分を責めている・卑下しているように見える場合は、押しつけがましくない形で、その状況に合った短い言葉を1つだけ自然に会話の中に添えてもよいです（例：「休むという選択をした自分を、責めなくていい」）。ポジティブを無理に押しつける言い方は避けてください。',
    '返答は1回につき3〜4文程度の短さにまとめ、スマートフォンで読みやすいようにしてください。一度に長い助言をまとめて出さず、会話を通じて少しずつ整理してください。',
    '会話の終わり方は自然に。「今日はここまででも大丈夫」「また話したくなったらいつでも」のような言い方は良いですが、依存を促すような言い方（もっと頻繁に話すべき、など）はしないでください。'
  ].join('\n'),
  en: [
    'You are NAGI, a companion inside a self-care app who helps people sort through their feelings — not a problem-solving assistant.',
    'Your goal is not to "solve the user\'s problem." It\'s to help them organize their own feelings and find a self-care approach that fits them.',
    'Avoid easy encouragement or phrases that rush someone along, like "just stay positive," "don\'t worry about it," or "you\'ve got this." Those can feel dismissive.',
    'Never give a diagnosis, suggest a treatment plan, give instructions about medication, or speak as if you were a licensed professional.',
    'Don\'t jump straight to advice. Never respond to something hard with an instant fix like "That sounds tough. Let\'s try deep breathing." Listen first.',
    'Ask at most one question at a time, and never interrogate. If the user doesn\'t seem to want to go deeper, don\'t push further.',
    'If the user seems to have no energy to act ("I don\'t want to do anything," "I\'m exhausted"), don\'t suggest actions at all — just listen. Not pushing someone to do something is itself real support.',
    'If the user seems to be being hard on themselves, you may naturally weave in one short, fitting line that reframes it gently (e.g. "Choosing to rest doesn\'t need forgiving — it wasn\'t wrong to begin with"). Don\'t force positivity, and don\'t over-explain the line.',
    'Keep each reply short — about 3–4 sentences — easy to read on a phone. Don\'t dump a long list of advice in one message; let things unfold gradually across the conversation.',
    'Let the conversation end naturally. Lines like "That\'s plenty for today" or "Talk again whenever you feel like it" are fine, but don\'t imply the user should be chatting with you more often or relying on this more — avoid anything that encourages dependency.'
  ].join('\n')
};

const LANG_INSTRUCTION = {
  ja: 'ユーザーが選択している表示言語は日本語です。基本的に日本語で自然に応答してください。ただしユーザーが明らかに別の言語でメッセージを書いている場合は、その言語を優先して自然に応答してください（機械翻訳のような文にはしないでください）。',
  en: 'The user\'s selected display language is English. Respond naturally in English by default. If the user is clearly writing in a different language, switch to and respond naturally in that language instead — never in a stiff, machine-translated way.'
};

// NAGI CARE（呼吸・ジャーナリング）への導線。AIは絶対にCAREを勝手に開始せず、
// 「提案」だけを行う。ユーザー自身がボタンで選んだ場合のみ、実際にCAREへ移動する。
// breathingには任意で「:short」を付けられる。これは「疲れていて、話すよりも
// 休みたい・何か大きな行動をする気力がない」ように見える場面で、1分だけの
// ごく短い呼吸を軽く提案するための合図（ハードルを極力下げるため）。
const ACTION_MARKER_INSTRUCTION = {
  ja: [
    '会話の流れの中で、次のいずれかの状態に本当に近いとはっきり感じられ、CAREを提案するのが自然な場面だけ、返答の一番最後に新しい行を追加し、その行だけに次のいずれか1つを正確な形式で書いてください（これはユーザーには表示されない内部シグナルなので、それ以外の説明や記号を混ぜないでください）：',
    '##NAGI_ACTION:breathing## → 緊張・不安・興奮していて、少し呼吸を整えると良さそうな場合',
    '##NAGI_ACTION:breathing:short## → 疲れていて気力が少なく、「話すより少し休みたい」に近い場合。この時は普段のおすすめの長さではなく、1分だけのごく短い呼吸を、軽い気持ちで試せるものとして提案してください（例：「じゃあ、1分だけ呼吸してみる？」）。',
    '##NAGI_ACTION:journaling## → 頭の中が整理できていない、考えが多くて絡まっているように見える場合',
    '##NAGI_ACTION:none## → 上記のどちらにも該当しない場合、まだ話を聞いている途中の場合、会話の最初の方の場合。基本はこれを使ってください。',
    '同じ返答の中で2つ以上のACTIONを書かないでください。迷ったら##NAGI_ACTION:none##にしてください。'
  ].join('\n'),
  en: [
    'Only when the conversation clearly points to one of the situations below, and suggesting a CARE action feels natural right now, add exactly one new line at the very end of your reply with one of the following (this is an internal signal never shown to the user — don\'t add any other words or symbols to that line):',
    '##NAGI_ACTION:breathing## — the user seems tense, anxious, or keyed up, and settling their breathing could help',
    '##NAGI_ACTION:breathing:short## — the user seems worn out and low on energy, closer to "I\'d rather rest than talk more." In that case, don\'t suggest the usual longer session — offer just one minute of breathing instead, framed as something small and easy to try (e.g. "Want to try just one minute of breathing?").',
    '##NAGI_ACTION:journaling## — the user\'s thoughts seem tangled or overwhelming, and writing them out could help',
    '##NAGI_ACTION:none## — neither applies, you\'re still early in listening, or it\'s early in the conversation. Default to this.',
    'Never include more than one ACTION line in the same reply. When in doubt, use ##NAGI_ACTION:none##.'
  ].join('\n')
};

// 会話の技術として、「疲れた」等の申告に対していきなり提案へ飛びつくのではなく、
// 一度ペースを確認する問いかけを挟むと自然、という具体例をモデルに示す。
// スクリプトではなく、あくまで「良い会話例」としての参考。
const CONVERSATION_TECHNIQUE_EXAMPLE = {
  ja: '会話の技術の一例：ユーザーが「今日はすごく疲れた」のように言った時、いきなり提案するのではなく、'
    + '「今は少し話して整理したい？　それとも、あまり話さず少し休みたい？」のように、まず本人が今どちらの'
    + 'ペースを望んでいるかを一度確認すると、押しつけにならず自然です（このセリフ自体を毎回コピーする必要は'
    + 'なく、状況に合わせた自分の言葉で構いません）。',
  en: 'One example of good technique: when the user says something like "I\'m really exhausted today," instead of '
    + 'jumping straight to a suggestion, you can first check which pace they want — something like "Do you want to '
    + 'talk it through a bit, or would you rather not talk much and just rest?" That keeps it from feeling pushy '
    + '(you don\'t need to copy this exact line — use your own words that fit the moment).'
};

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;
const MAX_MEMORY_NOTE_LENGTH = 120;
const MAX_MEMORY_NOTES = 20;
const MAX_CONTEXT_LENGTH = 160;

const MODE_PROMPTS = {
  ja: {
    organize_feelings: '今回のユーザーは「気持ちを整理したい」を選んでいます。今感じている感情にそっと言葉を添える手伝いをし、必要なら「それは〜という気持ちに近いですか？」のような優しい確認を1つだけ添えてください。',
    hard_time: '今回のユーザーは「今つらい」を選んでいます。解決や提案を急がず、まずそのつらさをそのまま受け止めてください。無理に理由を聞き出そうとせず、そばにいる姿勢を大切にしてください。',
    stress: '今回のユーザーは「ストレスについて話したい」を選んでいます。何が一番負担になっているのか、責めるトーンではなく、そっと尋ねてみてください。ただし答えたくなさそうであれば深掘りしないでください。',
    before_sleep: '今回のユーザーは「眠る前に少し話したい」を選んでいます。特に穏やかで急がないトーンを心がけ、考え込ませるような話の広げ方は避け、そのまま静かに眠りにつけるような会話にしてください。',
    organize_thoughts: '今回のユーザーは「考えていることを整理したい」を選んでいます。話の内容を責めるトーンではなく整理する形で短くまとめ、考えを整理する手助けをしてください。',
    open_ended: '今回のユーザーは特に話題を決めていません（「特に決まっていない」を選択）。話題を決めつけず、今日一日がどうだったかなど、やわらかく開いた質問から始めてください。'
  },
  en: {
    organize_feelings: 'The user has chosen "I want to sort out my feelings." Help put a name to what they seem to be feeling, and if it fits, offer one gentle check like "Does it feel more like... ?"',
    hard_time: 'The user has chosen "I\'m having a hard time." Don\'t rush toward solutions — just acknowledge how hard it is right now. Don\'t press for reasons; just being present matters most here.',
    stress: 'The user has chosen "I want to talk about stress." Gently ask what\'s weighing on them most, without a judgmental tone. If they don\'t seem to want to go into detail, don\'t push.',
    before_sleep: 'The user has chosen "I want to talk a bit before sleep." Keep an especially calm, unhurried tone, avoid opening up topics that could keep their mind racing, and aim for a conversation that lets them drift toward rest.',
    organize_thoughts: 'The user has chosen "I want to untangle my thoughts." Summarize what they\'ve shared in a way that brings order without judgment, helping them see their own thinking more clearly.',
    open_ended: 'The user hasn\'t chosen a specific topic ("Nothing in particular"). Don\'t assume a topic — open gently with something soft and open, like how their day has been.'
  }
};

// 自傷・希死念慮などの緊急性が高いサインは、AIの応答生成に頼らず
// アプリ側で確実に検知し、固定の安全な案内を返す。誤検知よりも
// 見逃しを避けることを優先した、やや広めのキーワード一致。
// 表示言語に関係なく、日本語・英語どちらの入力でも検知できるよう
// 両方のキーワードを常に対象にする（ユーザーが選んだUI言語と、実際に
// 入力する言語が一致するとは限らないため）。
const CRISIS_KEYWORDS = [
  // 日本語
  '死にたい', '死のう', '死ぬ方法', '死んだほうが', '死んだ方が',
  '消えたい', 'いなくなりたい', 'もう終わりにしたい', '生きていたくない',
  '自殺', '自傷', 'リストカット', 'リスカ', '首を吊る', '飛び降り', '死にます',
  // English
  'want to die', 'wanna die', 'want to kill myself', 'kill myself', 'killing myself',
  'end my life', 'ending my life', 'end it all', 'suicide', 'suicidal',
  'self harm', 'self-harm', 'selfharm', 'cutting myself', 'hurt myself',
  'don\'t want to live', 'do not want to live', 'no reason to live', 'better off dead',
  'not worth living'
];

const CRISIS_MESSAGE = {
  ja: 'つらい気持ちを話してくれてありがとうございます。今、ひとりで抱え込まないでほしいです。'
    + 'あなたの安全が何より大切なので、よろしければ下記の窓口にも頼ってみてください。',
  en: 'Thank you for telling me something this heavy. Please don\'t try to carry it alone right now — '
    + 'your safety matters more than anything else, so if you can, please also reach out to one of the resources below.'
};

const REGION_RESOURCES = {
  jp: {
    ja: [
      { label: '厚生労働省「まもろうよ こころ」', href: 'https://www.mhlw.go.jp/mamorouyokokoro/' },
      { label: 'よりそいホットライン（24時間・無料）', href: 'tel:0120279338' },
      { label: 'いのちの電話', href: 'tel:0570783556' }
    ],
    en: [
      { label: 'Japan Ministry of Health "Protect Your Heart" (Japanese-language site)', href: 'https://www.mhlw.go.jp/mamorouyokokoro/' },
      { label: 'Yorisoi Hotline — Japan, 24/7, free (Japanese-language)', href: 'tel:0120279338' },
      { label: 'Inochi no Denwa (Japan Lifeline)', href: 'tel:0570783556' }
    ]
  },
  us: {
    ja: [
      { label: '988 Suicide & Crisis Lifeline（電話・SMS）', href: 'tel:988' }
    ],
    en: [
      { label: '988 Suicide & Crisis Lifeline (call or text)', href: 'tel:988' }
    ]
  },
  uk: {
    ja: [
      { label: 'Samaritans（英語）', href: 'tel:116123' }
    ],
    en: [
      { label: 'Samaritans', href: 'tel:116123' }
    ]
  },
  intl: {
    ja: [
      { label: 'Befrienders Worldwide（国際相談窓口一覧）', href: 'https://www.befrienders.org/' }
    ],
    en: [
      { label: 'Befrienders Worldwide (international directory)', href: 'https://www.befrienders.org/' }
    ]
  }
};

const FALLBACK_MESSAGES = {
  ja: {
    busy: 'アクセスが集中しています。少し時間をおいてから、もう一度お試しください。',
    notReady: 'AI相談機能は準備中です。もう少しお待ちください。',
    serverBusy: '今はAIにつながらないようです。少し時間を置いてもう一度試してみてください。',
    timeout: '応答に時間がかかりすぎたようです。少し時間を置いてもう一度試してみてください。',
    noReply: 'うまく応答できませんでした。もう一度お試しください。',
    networkError: '今はAIにつながらないようです。少し時間を置いてもう一度試してみてください。'
  },
  en: {
    busy: 'Things are a bit busy right now. Please wait a moment and try again.',
    notReady: 'The AI chat feature isn\'t ready yet. Please check back soon.',
    serverBusy: 'It looks like NAGI can\'t connect right now. Please wait a moment and try again.',
    timeout: 'That took longer than expected. Please wait a moment and try again.',
    noReply: 'Something went wrong generating a reply. Please try again.',
    networkError: 'It looks like NAGI can\'t connect right now. Please wait a moment and try again.'
  }
};

function pickLang(lang) {
  return lang === 'en' ? 'en' : 'ja';
}

function containsCrisisSignal(text) {
  var lowered = text.toLowerCase();
  return CRISIS_KEYWORDS.some((word) => text.indexOf(word) !== -1 || lowered.indexOf(word.toLowerCase()) !== -1);
}

function resourcesForRegion(region, lang) {
  var entry = REGION_RESOURCES[region] || REGION_RESOURCES.jp;
  return entry[pickLang(lang)] || entry.ja;
}

// 返答の末尾にある内部シグナル（##NAGI_ACTION:xxx## / ##NAGI_ACTION:breathing:short##）を
// 取り出し、表示用テキストからは取り除く。
// モデルによっては末尾の「##」を省略することがあるため、末尾の「##」は任意とする。
const ACTION_LINE_PATTERN = /\s*##NAGI_ACTION:\s*(breathing|journaling|none)(:short)?\s*(?:##)?\s*$/i;

function extractSuggestedCare(rawReply) {
  var match = rawReply.match(ACTION_LINE_PATTERN);
  if (!match) return { reply: rawReply.trim(), suggestedCare: 'none', short: false };
  return {
    reply: rawReply.replace(ACTION_LINE_PATTERN, '').trim(),
    suggestedCare: match[1].toLowerCase(),
    short: !!match[2]
  };
}

// Best-effort in-memory rate limiting. Serverless instances are ephemeral and
// may run behind multiple regions, so this does not guarantee a hard global
// cap, but it stops naive bursts/loops from a single client within a warm
// instance without needing an external store.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_PER_MINUTE = 12;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAILY_MAX_PER_IP = 300;
const MAX_TRACKED_IPS = 5000;
const AI_TIMEOUT_MS = 20000;

// Gemini API（無料枠で利用可能な安定版モデル）。APIキーはコードに書かず、
// Vercelの環境変数 GEMINI_API_KEY からのみ読み込む。
// モデルが提供終了した場合は、環境変数 GEMINI_MODEL で差し替えられる。
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// 思考トークンも出力上限に含まれるため、返答が途中で切れないよう余裕を持たせる。
// 返答の長さ自体はシステムプロンプト（3〜4文）で制御している。
const MAX_OUTPUT_TOKENS = 2048;

// 会話履歴をGemini形式に変換する。AIの発言は role: 'model'。
// Geminiは会話がユーザーの発言から始まり、同じ話者が連続しない形を前提とするため、
// 先頭のAI発言は除き、同じ話者が続く場合は1つにまとめる。
// 画面側は送信中のメッセージを履歴にも含めて送るため、直前と同じ発言は重複させない。
function toGeminiContents(messages) {
  const contents = [];
  messages.forEach((turn) => {
    const role = turn.role === 'assistant' ? 'model' : 'user';
    if (!contents.length && role === 'model') return;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      if (last.parts[0].text.split('\n').pop() !== turn.content) {
        last.parts[0].text += '\n' + turn.content;
      }
    } else {
      contents.push({ role: role, parts: [{ text: turn.content }] });
    }
  });
  return contents;
}

// Geminiの応答から、表示用のテキストだけを取り出す（思考パートは除く）。
function extractGeminiText(data) {
  const candidate = data && Array.isArray(data.candidates) ? data.candidates[0] : null;
  const parts = candidate && candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  return parts
    .filter((part) => part && typeof part.text === 'string' && !part.thought)
    .map((part) => part.text)
    .join('');
}

const requestLog = new Map();

function truncate(text, max) {
  if (typeof text !== 'string') return '';
  return text.slice(0, max);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isRateLimited(ip) {
  if (requestLog.size > MAX_TRACKED_IPS) {
    requestLog.clear();
  }
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < DAILY_WINDOW_MS);
  const recentMinute = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS).length;

  if (recentMinute >= RATE_LIMIT_MAX_PER_MINUTE || timestamps.length >= DAILY_MAX_PER_IP) {
    requestLog.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return false;
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

// 旧版NAGI（mental-care-app）の相談APIを移植。このプロジェクトはESMのため export default で公開する。
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = req.body || {};
  const lang = pickLang(body.lang);
  const messages_ = FALLBACK_MESSAGES[lang];

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(200).json({ reply: messages_.busy });
    return;
  }

  const message = truncate(body.message, MAX_MESSAGE_LENGTH);
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];
  const region = typeof body.region === 'string' ? body.region : 'jp';
  const memoryNotes = Array.isArray(body.memoryNotes)
    ? body.memoryNotes.slice(0, MAX_MEMORY_NOTES).map((note) => truncate(note, MAX_MEMORY_NOTE_LENGTH)).filter(Boolean)
    : [];
  const learningSummary = truncate(body.learningSummary, MAX_MEMORY_NOTE_LENGTH);
  const todayState = truncate(body.todayState, MAX_MEMORY_NOTE_LENGTH);
  const patternInsight = truncate(body.patternInsight, MAX_CONTEXT_LENGTH);
  const mode = typeof body.mode === 'string' ? body.mode : '';

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  // 緊急性の高いサインは、モデルを呼ばずにアプリ側で確実な固定案内を返す。
  // API障害時や応答の揺らぎに左右されない、安全側に倒した設計。
  // 表示言語に関わらず日英両方のキーワードを検知するため、応答だけをlangで切り替える。
  if (containsCrisisSignal(message)) {
    res.status(200).json({ reply: CRISIS_MESSAGE[lang], crisis: true, resources: resourcesForRegion(region, lang) });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(200).json({ reply: messages_.notReady });
    return;
  }

  const messages = rawHistory
    .filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && turn.content)
    .map((turn) => ({ role: turn.role, content: truncate(turn.content, MAX_MESSAGE_LENGTH) }));
  messages.push({ role: 'user', content: message });

  let system = SYSTEM_PROMPTS[lang] + '\n\n' + LANG_INSTRUCTION[lang] + '\n\n' + CONVERSATION_TECHNIQUE_EXAMPLE[lang] + '\n\n' + ACTION_MARKER_INSTRUCTION[lang];
  const modePrompts = MODE_PROMPTS[lang];
  if (modePrompts[mode]) {
    system += '\n\n' + modePrompts[mode];
  }
  // NAGI MEMORY: ユーザーが「これは覚えておいて」と明示的に保存した
  // メモだけを渡す。自動生成された傾向データやセンシティブな生ログは含めない。
  // 会話そのものがNAGI MEMORYに自動保存されることはない（保存はユーザーが明示的に選んだ場合のみ）。
  if (memoryNotes.length) {
    system += lang === 'en'
      ? '\n\nThings the user has explicitly asked to be remembered (only what they saved themselves):\n'
        + memoryNotes.map((note) => '- ' + note).join('\n')
      : '\n\nユーザーが覚えておいてほしいと指定したこと（本人が明示的に保存した内容のみ）：\n'
        + memoryNotes.map((note) => '・' + note).join('\n');
  }
  // WHAT WORKS FOR MEの学習結果: ユーザーが明示的にオンにした場合のみ、
  // 行動フィードバックから見えた「事実の要約」だけを渡す。断定はしない。
  if (learningSummary) {
    system += lang === 'en'
      ? '\n\nFor reference (a pattern noticed from the user\'s own feedback — treat as a loose signal, not a fact): ' + learningSummary
      : '\n\n参考情報（本人のフィードバックから見える傾向。決めつけずに参考程度に扱うこと）：' + learningSummary;
  }
  // MY PATTERNで見えている、もっとも強い1つの気づき。断定せず、あくまで参考情報として渡す。
  if (patternInsight) {
    system += lang === 'en'
      ? '\n\nFor reference (a pattern noticed in the user\'s own records — mention it only if it fits naturally, and always as "your records suggest," never as a fact): ' + patternInsight
      : '\n\n参考情報（本人の記録から見えている傾向。「最近の記録では」「そう見えるようです」のように、断定しない言い方でしか触れないこと）：' + patternInsight;
  }
  // ユーザーの現在状態: 気分・エネルギー・ストレスの簡潔な事実のみ。
  if (todayState) {
    system += '\n\n' + todayState;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    let response;
    try {
      response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(GEMINI_MODEL) + ':generateContent', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: toGeminiContents(messages),
          generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS }
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      // 無料枠の上限超過（429）やキーの誤り（400/403）など。原因はVercelのログで確認できる。
      // 画面には固定のやさしいメッセージだけを返す。
      const errorText = await response.text().catch(() => '');
      console.error('Gemini API error', response.status, errorText.slice(0, 500));
      res.status(200).json({ reply: messages_.serverBusy });
      return;
    }

    const data = await response.json();
    const rawReply = extractGeminiText(data);
    if (!rawReply) {
      // 安全フィルターでブロックされた場合など、本文が返ってこないケース。
      const candidate = data && Array.isArray(data.candidates) ? data.candidates[0] : null;
      console.error('Gemini empty reply', {
        blockReason: data && data.promptFeedback && data.promptFeedback.blockReason,
        finishReason: candidate && candidate.finishReason
      });
      res.status(200).json({ reply: messages_.noReply });
      return;
    }
    const extracted = extractSuggestedCare(rawReply);
    res.status(200).json({
      reply: extracted.reply || messages_.noReply,
      suggestedCare: extracted.suggestedCare,
      short: extracted.short
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      res.status(200).json({ reply: messages_.timeout });
      return;
    }
    console.error('Gemini request failed', err && err.message);
    res.status(200).json({ reply: messages_.networkError });
  }
}
