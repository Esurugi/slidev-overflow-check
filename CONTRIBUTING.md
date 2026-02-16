# Contributing

`slidev-overflow-check` へのコントリビュートありがとうございます。  
このドキュメントは、現行実装（Playwright CLIベース、レイヤ分離構成）に合わせた開発手順です。

## プロジェクト方針

- 対象は Slidev の overflow 検出（`text-overflow` / `element-overflow` / `scrollbar`）
- 検出は実ブラウザ描画ベース
- 完全な静的検証ではなく、実運用で有効な検出精度を重視
- CI で再現可能な出力と終了コードを重視

## 変更提案の原則

- 変更は小さく、目的を明確にする
- 公開挙動（CLI/API）の回帰を優先して守る
- 内部都合より保守性と可読性を優先する
- 大きな設計変更は Issue で先に意図を共有する

## セットアップ

```bash
git clone https://github.com/mizuirorivi/slidev-overflow-check
cd slidev-overflow-check
npm install
```

## 開発コマンド

```bash
# ビルド
npm run build

# 高速な unit/integration
npm test

# 実ブラウザ E2E
npm run test:e2e

# 全テスト
npm run test:all

# Format
npm run format
```

## package / config の扱い

変更時は以下の整合を取ってください。

- `package.json`
  - `name`: `slidev-overflow-check`
  - `bin.slidev-overflow-check`: `dist/cli.js`
  - `scripts`: `test`（高速系）, `test:e2e`, `test:all` の分離を維持
- `tsup.config.ts`
  - エントリは `src/cli.ts` と `src/index.ts`
- `tsconfig.json`
  - `src` 配下をビルド対象、`tests` は除外
- `vitest.config.ts`
  - Node環境でテストを実行（必要に応じて `tests/__tests__` と `tests/e2e` を明示的に使い分ける）

不要になった script / config / ドキュメントは、参照が残らないことを確認して削除してください。

## テスト追加の指針

- まず公開境界（CLI入力、`runOverflowCheck`、終了コード）をテストする
- 内部実装詳細に強く依存するテストは増やしすぎない
- E2E は重いため本数を厳選し、`tests/e2e/` に配置する

## バグ報告に含めてほしい情報

- 最小再現手順（可能ならサンプルスライド）
- 実行コマンド
- 期待結果と実結果
- 使用環境（OS / Node / Browser / Playwright CLI）

## 行動規範

相互に敬意を持ち、建設的なコミュニケーションをお願いします。
