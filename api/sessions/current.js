import { prisma } from '../_lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { clientToken } = req.query;
  if (typeof clientToken !== 'string' || clientToken.length < 8) {
    return res.status(400).json({ error: 'invalid_client_token' });
  }

  // イレギュラーケース4（中断）：直近の未完了セッションがあれば「続きから」を提示するために返す
  const session = await prisma.careSession.findFirst({
    where: { clientToken, status: 'IN_PROGRESS' },
    orderBy: { updatedAt: 'desc' },
  });

  return res.status(200).json(session ?? null);
}
