# Slidev Overflow Check

Slidevプレゼンテーションを実ブラウザで描画し、見切れ（overflow）を検出するCLIです。  
Playwright CLIセッションを使って、`text-overflow` / `element-overflow` / `scrollbar` を検出します。

## 主な特徴

- 実レンダリングベースで検出（Markdown静的解析だけに依存しない）
- ピクセル単位の overflow 量を出力
- `--project` 指定時はソース行マッピングを付与
- 複数スライドを `--concurrency` で並列チェック
- `console/json/html` の複数フォーマット出力

## CLIオプション

| オプション | 短縮 | 説明 | デフォルト |
|---|---|---|---|
| `--url <url>` | `-u` | SlidevサーバーURL（必須） | - |
| `--project <path>` | - | Slidevプロジェクトパス（ソースマッピング/解析用） | - |
| `--pages <range>` | `-p` | 対象スライド範囲（例: `1-10`, `5`） | 全ページ |
| `--format <formats>` | `-f` | 出力形式（`console,html,json` をカンマ区切り） | `console` |
| `--output <dir>` | `-o` | レポート出力先 | `./reports` |
| `--threshold <n>` | `-t` | overflow閾値（px） | `1` |
| `--wait <ms>` | `-w` | 安定化後の追加待機時間（ms） | `0` |
| `--viewport <WxH>` | - | ビューポート（例: `1920x1080`） | `1920x1080` |
| `--browser <name>` | `-b` | `auto/chrome/msedge/firefox/webkit` | `auto` |
| `--headless` / `--no-headless` | - | ヘッドレス実行のON/OFF | `headless` |
| `--verbose` | `-v` | 詳細ログを表示 | `false` |
| `--screenshot` | - | 問題スライドのスクリーンショット保存 | `false` |
| `--screenshot-dir <dir>` | - | スクリーンショット出力先 | `./screenshots` |
| `--screenshot-full-page` | - | 全画面キャプチャを有効化 | `false` |
| `--no-screenshot-highlight` | - | 問題領域ハイライトを無効化 | ハイライト有効 |
| `--fail-on-issues` | - | 問題検出時に終了コード1を返す | `false` |
| `--concurrency <n>` | - | 並列ワーカー数 | `1` |
| `--config <path>` | `-c` | 設定ファイル（`.js` / `.json`） | - |

### 入力バリデーション

- `--threshold`: 0以上の数値
- `--wait`: 0以上の数値
- `--concurrency`: 1以上の整数
- `--viewport`: `WIDTHxHEIGHT` 形式

## 代表的な実行例

```bash
# 最小実行
slidev-overflow-check --url http://localhost:3030

# CI向け（問題があれば失敗）
slidev-overflow-check --url http://localhost:3030 --fail-on-issues

# JSON/HTML出力 + スクリーンショット
slidev-overflow-check \
  --url http://localhost:3030 \
  --format console,json,html \
  --output ./reports \
  --screenshot --screenshot-dir ./screenshots
```

## 設定ファイル

`checker.config.js` 例:

```js
export default {
  url: 'http://localhost:3030',
  format: ['console', 'json'],
  threshold: 1,
  wait: 0,
  concurrency: 2,
  exclude: ['.slidev-page-indicator', '.slidev-nav'],
  contentAnalysis: {
    preCheckWarnings: true,
    complexityThreshold: 0.7,
  },
};
```

```bash
slidev-overflow-check --config ./checker.config.js
```

- 設定ファイルとCLIを併用した場合、**CLI指定が優先**されます。
- コンテンツ解析（`contentAnalysis`）に失敗しても、overflowスキャン結果は返却されます。

## Node API

```ts
import { runOverflowCheck } from 'slidev-overflow-check';

const result = await runOverflowCheck({
  url: 'http://localhost:3030',
  failOnIssues: true,
  concurrency: 2,
});
```

- 推奨エントリポイントは `runOverflowCheck` です。

## ディレクトリ構成（概要）

```text
src/
  interfaces/      # CLI入力境界
  application/     # ユースケース/オーケストレーション
  core/            # ドメインモデル/検出ロジック
  infrastructure/  # Playwright CLI・レポート・設定I/O
```

## 開発: テスト実行

```bash
# 高速なunit/integration
npm test

# 実ブラウザE2Eのみ
npm run test:e2e

# 全テスト
npm run test:all
```

## 要件

- Node.js 18+
- `playwright-cli` がPATHで実行可能

## ライセンス

MIT
