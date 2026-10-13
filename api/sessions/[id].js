import { prisma } from '../_lib/prisma.js';
import { evaluateMoodInput } from '../../shared/moderation.js';
import { CONTEXT_TAGS } from '../../shared/tags.js';

const ALLOWED_CARE_TYPES = ['breathing', 'nature_sound', 'breathing_sound', 'words', 'move'];
const ALLOWED_STATUS = ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'];
const ACCOMPLISHMENT_MAX_LENGTH = 200;
const HIGHLIGHT_MAX_LENGTH = 100;

function validScore(value) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
}

function validLevel(value) {
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= 3 ? level : null;
}

// stressLevel/energyLevel/sleepLevelは共通の1-3任意フィールド（nullで選択解除）。
function applyLevelField(body, data, field, errorCode) {
  if (body[field] === undefined) return null;
  if (body[field] === null) {
    data[field] = null; // タップし直して選択解除した場合
    return null;
  }
  const level = validLevel(body[field]);
  if (level === null) return errorCode;
  data[field] = level;
  return null;
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'invalid_id' });
  }

  if (req.method === 'GET') {
    const session = await prisma.careSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json(session);
  }

  if (req.method === 'PATCH') {
    const existing = await prisma.careSession.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not_found' });

    const body = req.body ?? {};
    const data = {};

    if (typeof body.moodInput === 'string') {
      const result = evaluateMoodInput(body.moodInput);
      if (!result.ok) {
        return res.status(400).json({ error: result.code, message: result.message });
      }
      data.moodInput = result.moodInput;
      data.moodSummary = result.moodSummary;
      data.moodFlag = result.code; // "crisis" | null
    }

    if (body.moodScore !== undefined) {
      const score = validScore(body.moodScore);
      if (score === null) return res.status(400).json({ error: 'invalid_mood_score' });
      data.moodScore = score;
    }

    if (body.postCareMoodScore !== undefined) {
      const score = validScore(body.postCareMoodScore);
      if (score === null) return res.status(400).json({ error: 'invalid_post_care_mood_score' });
      data.postCareMoodScore = score;
    }

    for (const field of ['stressLevel', 'energyLevel', 'sleepLevel']) {
      const errorCode = applyLevelField(body, data, field, `invalid_${field.replace(/([A-Z])/g, '_$1').toLowerCase()}`);
      if (errorCode) return res.status(400).json({ error: errorCode });
    }

    if (body.contextTags !== undefined) {
      if (!Array.isArray(body.contextTags) || !body.contextTags.every((tag) => CONTEXT_TAGS.includes(tag))) {
        return res.status(400).json({ error: 'invalid_context_tags' });
      }
      data.contextTags = body.contextTags;
    }

    if (typeof body.highlight === 'string') {
      const trimmed = body.highlight.trim().slice(0, HIGHLIGHT_MAX_LENGTH);
      data.highlight = trimmed.length > 0 ? trimmed : null;
    }

    if (typeof body.careType === 'string') {
      if (!ALLOWED_CARE_TYPES.includes(body.careType)) {
        return res.status(400).json({ error: 'invalid_care_type' });
      }
      data.careType = body.careType;
    }

    if (typeof body.accomplishment === 'string') {
      const trimmed = body.accomplishment.trim().slice(0, ACCOMPLISHMENT_MAX_LENGTH);
      data.accomplishment = trimmed.length > 0 ? trimmed : null;
    }

    if (typeof body.status === 'string') {
      if (!ALLOWED_STATUS.includes(body.status)) {
        return res.status(400).json({ error: 'invalid_status' });
      }
      data.status = body.status;
    }

    const session = await prisma.careSession.update({ where: { id }, data });
    return res.status(200).json(session);
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'method_not_allowed' });
}
