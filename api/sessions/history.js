import { prisma } from '../_lib/prisma.js';

const MAX_DAYS = 90; // 「心の波」は直近3か月分あれば十分。無制限に持ち出さない

// 「心の波」画面用。気分の本文（moodInput/moodSummary）は含めない —
// センシティブな日記本文を、トレンド表示のためだけに不必要に持ち出さないための設計。
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { clientToken } = req.query;
  if (typeof clientToken !== 'string' || clientToken.length < 8) {
    return res.status(400).json({ error: 'invalid_client_token' });
  }

  const since = new Date();
  since.setDate(since.getDate() - MAX_DAYS);

  const sessions = await prisma.careSession.findMany({
    where: { clientToken, createdAt: { gte: since }, moodScore: { not: null } },
    select: {
      createdAt: true,
      moodScore: true,
      contextTags: true,
      stressLevel: true,
      energyLevel: true,
      sleepLevel: true,
      careType: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return res.status(200).json(sessions);
}
