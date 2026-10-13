const STORAGE_KEY = 'nagi_client_token';

// ログイン機能はない（イレギュラーケース5：別人が使ってもそのまま使わせる）。
// この端末上で「途中から再開」するためだけの匿名トークン。
export function getClientToken() {
  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}

// データ削除後、同じ端末でも過去のトークンと紐づかない新しい匿名IDを発行する
export function resetClientToken() {
  const token = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, token);
  return token;
}
