import { prisma } from '../_lib/prisma.js';
import { evaluateMoodInput } from '../../shared/moderation.js';
import { EMOTION_TAGS } from '../../shared/tags.js';

const PROMPTS = ['tiring', 'accomplished', 'worried', 'toTomorrowSelf', 'toNextWeekSelf', 'toNextMonthSelf'];

// ジャーナリング（質問形式の短い日記）。気分入力と同じ検証ロジックを再利用することで、
// 空/過剰/無意味な入力の扱いや危機ワード検出の基準がジャーナルだけ甘くならないようにする。
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { clientToken } = req.query;
    if (typeof clientToken !== 'string' || clientToken.length < 8) {
      return res.status(400).json({ error: 'invalid_client_token' });
    }

    const entries = await prisma.journalEntry.findMany({
      where: { clientToken },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const { clientToken, prompt, content, locale, emotionTags } = req.body ?? {};

    if (typeof clientToken !== 'string' || clientToken.length < 8 || clientToken.length > 100) {
      return res.status(400).json({ error: 'invalid_client_token' });
    }
    if (!PROMPTS.includes(prompt)) {
      return res.status(400).json({ error: 'invalid_prompt' });
    }

    let tags = [];
    if (emotionTags !== undefined) {
      if (!Array.isArray(emotionTags) || !emotionTags.every((tag) => EMOTION_TAGS.includes(tag))) {
        return res.status(400).json({ error: 'invalid_emotion_tags' });
      }
      tags = emotionTags;
    }

    const result = evaluateMoodInput(content, locale === 'en' ? 'en' : 'ja');
    if (!result.ok) {
      return res.status(400).json({ error: result.code, message: result.message });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        clientToken,
        prompt,
        content: result.moodInput,
        summary: result.moodSummary,
        flag: result.code, // "crisis" | null
        emotionTags: tags,
      },
    });
    return res.status(201).json(entry);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method_not_allowed' });
}
