import { prisma } from '../_lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { clientToken, abandonPrevious } = req.body ?? {};
  if (typeof clientToken !== 'string' || clientToken.length < 8 || clientToken.length > 100) {
    return res.status(400).json({ error: 'invalid_client_token' });
  }

  if (abandonPrevious) {
    await prisma.careSession.updateMany({
      where: { clientToken, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });
  }

  const session = await prisma.careSession.create({
    data: { clientToken },
  });

  return res.status(201).json(session);
}
