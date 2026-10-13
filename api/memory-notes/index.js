import { prisma } from '../_lib/prisma.js';
import { isInappropriate } from '../../shared/moderation.js';

const MAX_LENGTH = 200;
const MAX_NOTES = 20; // 「たくさん登録する場所」ではなく、少数の短いメモという設計を保つ

// NAGI MEMORY NOTES：ユーザーが自分で追加・削除する短いメモ（例：「雨の音が好き」）。
// 気分の吐露ではないため、危機ワード検出（evaluateMoodInput）は使わず、
// スクリプト混入・スパムリンクの混入だけを弾く。
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { clientToken } = req.query;
    if (typeof clientToken !== 'string' || clientToken.length < 8) {
      return res.status(400).json({ error: 'invalid_client_token' });
    }

    const notes = await prisma.memoryNote.findMany({
      where: { clientToken },
      orderBy: { createdAt: 'desc' },
      take: MAX_NOTES,
    });
    return res.status(200).json(notes);
  }

  if (req.method === 'POST') {
    const { clientToken, content } = req.body ?? {};

    if (typeof clientToken !== 'string' || clientToken.length < 8 || clientToken.length > 100) {
      return res.status(400).json({ error: 'invalid_client_token' });
    }

    const trimmed = (content ?? '').trim();
    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'empty' });
    }
    if (trimmed.length > MAX_LENGTH) {
      return res.status(400).json({ error: 'too_long' });
    }
    if (isInappropriate(trimmed)) {
      return res.status(400).json({ error: 'inappropriate' });
    }

    const existingCount = await prisma.memoryNote.count({ where: { clientToken } });
    if (existingCount >= MAX_NOTES) {
      return res.status(400).json({ error: 'too_many' });
    }

    const note = await prisma.memoryNote.create({ data: { clientToken, content: trimmed } });
    return res.status(201).json(note);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method_not_allowed' });
}
