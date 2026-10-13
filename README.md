# NAGI

呼吸・自然音・言葉によるセルフケアで、頑張りすぎた心を「今日はここまででいい」と休ませるアプリ。
`docs/01_spec.md` の仕様に基づく実装。

## 構成

- フロントエンド: Vite + React（`src/`）
- API: Vercel Functions（`api/`。ブラウザは直接DBに接続せず、必ずこの層を経由する）
- ORM: Prisma（`prisma/schema.prisma`）
- DB: Vercel Postgres（Neon）
- 共有ロジック: `shared/moderation.js`（入力バリデーション／モデレーションをフロントとAPIの両方で使用）

## セットアップ

```bash
npm install
cp .env.example .env.local   # Vercel Dashboard の Storage タブから DATABASE_URL を取得して設定
npx prisma db push           # スキーマをDBに反映
npm run dev                  # フロントエンドのみ（http://localhost:5173）
```

API（`api/`）はVercel Functionsのため、フロントとAPIを合わせて動かすには [Vercel CLI](https://vercel.com/docs/cli) を使う。

```bash
npm i -g vercel
vercel dev
```

## 画面フローとイレギュラーケースの対応

- 入口〜画面フローは `docs/01_spec.md` の「④画面フロー」に対応させ、`src/App.jsx` で状態遷移として実装。
- イレギュラーケース1〜5（空入力・過剰入力・悪意ある入力・中断からの再開・別人利用）は `shared/moderation.js` と `src/App.jsx` の再開ロジックで対応。
  - 深刻な悩み（自殺念慮等のキーワード）を検知した場合は、記録を拒否せず `CrisisScreen` で安全を優先した案内（相談窓口の電話番号）を表示する。
- DB接続に失敗した場合も、その場のケア体験自体は止めずに続行できるようフォールバックしている（`src/App.jsx` の `safeUpdate`）。

## 動作確認について

このセットアップでは実際のDB（Neon）に接続していないため、API経由の保存・再開の動作はローカルでは未検証。`vite build` によるビルド確認・moderationロジックの単体動作確認は実施済み。`DATABASE_URL` を設定した上で `vercel dev` での結合確認を推奨。
