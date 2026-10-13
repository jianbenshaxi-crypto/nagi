import { prisma } from '../_lib/prisma.js';

// 設定画面の「すべての記録を削除する」用。clientToken単位で全件削除する。
// ログイン機能が無いため、この匿名トークンだけが「その人の記録」を表す唯一の鍵。
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { clientToken } = req.body ?? {};
  if (typeof clientToken !== 'string' || clientToken.length < 8 || clientToken.length > 100) {
    return res.status(400).json({ error: 'invalid_client_token' });
  }

  const [sessions, journalEntries, memoryNotes] = await Promise.all([
    prisma.careSession.deleteMany({ where: { clientToken } }),
    prisma.journalEntry.deleteMany({ where: { clientToken } }),
    prisma.memoryNote.deleteMany({ where: { clientToken } }),
  ]);
  return res.status(200).json({ deleted: sessions.count + journalEntries.count + memoryNotes.count });
}
