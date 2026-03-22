# AWS 認定試験対策アプリ

React + TypeScript + Google Sheets + Vercel で動作する個人向けAWS認定試験対策Webアプリです。

## 機能

### ユーザー向け
- 試験・ドメイン・難易度・問題数を選んでクイズを実施
- 単一選択（4択1答）・複数選択（5択2答 / 6択3答）に対応
- 解答後に正解・解説を即表示
- 解答履歴・ドメイン別正答率の統計

### 管理者向け
- 試験ガイドPDF をアップロードしてドメイン別に解析・保存
- 問題生成プロンプトを自動生成（claude.ai へコピペして使用）
- Claudeが生成したJSONを貼り付けてスプレッドシートに保存
- 問題一覧の表示・削除・フィルタリング
- 複数試験の管理（AIP-C01以外も追加可能）

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | React 18 + TypeScript + Vite |
| スタイリング | Tailwind CSS |
| バックエンド | Vercel Serverless Functions |
| データベース | Google スプレッドシート |
| 認証 | JWT（jose） + bcryptjs |
| PDF解析 | pdfjs-dist |
| ホスティング | Vercel（無料枠） |

---

## セットアップ手順

### 前提条件
- Node.js 18 以上
- Google アカウント
- Vercel アカウント（GitHub連携済み）
- Git

### 1. リポジトリのクローン

```bash
git clone <your-repo-url>
cd aws-quiz-app
npm install
```

### 2. Google スプレッドシートの準備

#### 2-1. スプレッドシートを作成
1. [Google スプレッドシート](https://sheets.google.com) を開く
2. 新しいスプレッドシートを作成
3. URLから **スプレッドシートID** をメモ
   ```
   https://docs.google.com/spreadsheets/d/【ここがID】/edit
   ```

#### 2-2. Google Cloud プロジェクトを設定
1. [Google Cloud Console](https://console.cloud.google.com) を開く
2. 新規プロジェクトを作成（または既存を選択）
3. 「APIとサービス」→「ライブラリ」→ **Google Sheets API** を有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」
5. サービスアカウントを作成し、「キー」タブ→「鍵を追加」→「JSON」でキーをダウンロード

#### 2-3. スプレッドシートにアクセス権を付与
1. ダウンロードしたJSONファイルの `client_email` をコピー
2. スプレッドシートを開き、右上「共有」をクリック
3. コピーした `client_email` を追加（編集者権限）

### 3. 環境変数の設定

#### ローカル開発用
`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` を編集:

```env
# サービスアカウントのメールアドレス（JSONのclient_email）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# 秘密鍵（JSONのprivate_key、改行は\nのまま）
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"

# スプレッドシートID
SPREADSHEET_ID=your-spreadsheet-id

# JWT署名用シークレット（32文字以上のランダム文字列）
JWT_SECRET=your-very-long-random-secret-string-here

# 初期管理者アカウント
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password

# 初期一般ユーザーアカウント
USER_USERNAME=user
USER_PASSWORD=your-user-password
```

> **秘密鍵の貼り付け方**: JSONファイルを開き `"private_key"` の値をそのまま貼り付けてください。`\n` はそのまま残してください。

### 4. スプレッドシートの初期化

```bash
# ローカルで開発サーバーを起動
npm run dev

# 別ターミナルで初期化リクエストを送信
curl -X POST http://localhost:5173/api/setup \
  -H "x-setup-key: <JWT_SECRETと同じ値>"
```

シート（users, exams, exam_guides, questions, sessions, session_answers）が自動作成されます。

### 5. ローカル動作確認

```bash
npm run dev
```

`http://localhost:5173` を開き、`.env` で設定した管理者ユーザーでログイン。
**初回ログイン時**に AIP-C01 の試験データが自動登録されます。

### 6. Vercel へのデプロイ

#### 6-1. GitHubにプッシュ
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

#### 6-2. Vercel にインポート
1. [Vercel](https://vercel.com) を開く
2. 「New Project」→ GitHubリポジトリを選択
3. 「Environment Variables」に `.env` の内容をすべて入力
   - `GOOGLE_PRIVATE_KEY` は改行を `\n` のまま入力
4. 「Deploy」をクリック

デプロイ完了後、表示されるURLでアクセス可能になります（スマートフォンからもアクセス可）。

---

## 使い方

### 問題生成の手順（管理者）

1. **試験ガイドPDFを登録**（初回のみ）
   - 管理者画面 → 「試験ガイドPDF」タブ
   - AIP-C01の試験ガイドPDFをアップロード
   - ドメインごとに解析された内容を確認・編集して保存

2. **問題を生成**
   - 「問題生成」タブ
   - 試験・ドメイン・問題タイプ・難易度・生成数を設定
   - 「プロンプトを生成」→「コピー」
   - [claude.ai](https://claude.ai) に貼り付けて送信
   - Claudeが返したJSONを「回答貼り付け」欄に貼り付け
   - 「スプレッドシートに保存」

### 問題を解く（ユーザー）

1. ダッシュボードから「問題を解く」
2. 試験・ドメイン・難易度・問題数を選択
3. 各問題に回答 → 「回答する」で即時フィードバック
4. 全問終了後に結果・スコアを確認

---

## Google スプレッドシートの構造

| シート名 | 内容 |
|---|---|
| `users` | ユーザー情報（ID・ユーザー名・パスワードハッシュ・ロール） |
| `exams` | 試験情報（コード・名前・説明） |
| `exam_guides` | 試験ガイド（PDFから抽出したドメイン別テキスト） |
| `questions` | 問題（問題文・選択肢・正解・解説・難易度） |
| `sessions` | クイズセッション（設定・開始時刻・スコア） |
| `session_answers` | 解答履歴（問題ID・ユーザー回答・正誤） |

---

## 今後の拡張予定

- [ ] 他のAWS試験（SAA-C03, DVA-C02 等）への対応
- [ ] 問題の編集機能
- [ ] 間違えた問題のみを出題するモード
- [ ] ブックマーク機能
