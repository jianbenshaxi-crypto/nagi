import { prisma } from '../_lib/prisma.js';

// clientTokenが一致する場合のみ削除する（api/sessions/delete.jsと同じ確認パターン）。
export default async function handler(req, res) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'invalid_id' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { clientToken } = req.body ?? {};
  if (typeof clientToken !== 'string' || clientToken.length < 8) {
    return res.status(400).json({ error: 'invalid_client_token' });
  }

  const note = await prisma.memoryNote.findUnique({ where: { id } });
  if (!note || note.clientToken !== clientToken) {
    return res.status(404).json({ error: 'not_found' });
  }

  await prisma.memoryNote.delete({ where: { id } });
  return res.status(200).json({ deleted: true });
}
