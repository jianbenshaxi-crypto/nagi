async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const error = new Error(body?.message || body?.error || 'request_failed');
    error.code = body?.error;
    error.message = body?.message || error.message;
    throw error;
  }

  return body;
}

export function fetchCurrentSession(clientToken) {
  return request(`/sessions/current?clientToken=${encodeURIComponent(clientToken)}`);
}

export function createSession(clientToken, { abandonPrevious = false } = {}) {
  return request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ clientToken, abandonPrevious }),
  });
}

export function updateSession(id, patch) {
  return request(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function fetchMoodHistory(clientToken) {
  return request(`/sessions/history?clientToken=${encodeURIComponent(clientToken)}`);
}

export function deleteAllData(clientToken) {
  return request('/sessions/delete', {
    method: 'DELETE',
    body: JSON.stringify({ clientToken }),
  });
}

export function fetchJournalEntries(clientToken) {
  return request(`/journal?clientToken=${encodeURIComponent(clientToken)}`);
}

export function createJournalEntry(clientToken, prompt, content, locale, emotionTags) {
  return request('/journal', {
    method: 'POST',
    body: JSON.stringify({ clientToken, prompt, content, locale, emotionTags }),
  });
}

export function deleteJournalEntry(id, clientToken) {
  return request(`/journal/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ clientToken }),
  });
}

export function fetchMemoryNotes(clientToken) {
  return request(`/memory-notes?clientToken=${encodeURIComponent(clientToken)}`);
}

export function createMemoryNote(clientToken, content) {
  return request('/memory-notes', {
    method: 'POST',
    body: JSON.stringify({ clientToken, content }),
  });
}

// 相談チャット（AI応答）。応答の遅延で「入力中…」のまま固まらないよう、クライアント側でも打ち切る。
export function sendChatMessage(payload, { timeoutMs = 25000 } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

export function deleteMemoryNote(id, clientToken) {
  return request(`/memory-notes/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ clientToken }),
  });
}
