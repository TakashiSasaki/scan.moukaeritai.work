# generate-efu-catalog

## Purpose
ワークスペース内のすべてのファイルのカタログを Everything の efu 形式 (csv 拡張子付き) で記録します。

## When to use
ユーザーからワークスペースのファイルカタログや efu ファイル、ファイル一覧の出力を求められた場合に使用します。

## Inputs and assumptions
- Node.js 環境が必要です。
- 出力ファイル名は `index.efu.csv` となります。
- コマンドライン引数 `--exclude` を用いて、走査から除外するディレクトリやファイルをカンマ区切りで指定できます（デフォルトは `node_modules`, `.git`, `.Jules`, `tmp_repo`, `dist`）。

## Procedure
以下のスクリプトを実行してカタログを生成します。

```bash
# デフォルトの除外設定で実行
npx tsx .agents/skills/generate-efu-catalog/scripts/generate.js

# 除外するディレクトリ・ファイルを指定して実行
npx tsx .agents/skills/generate-efu-catalog/scripts/generate.js --exclude node_modules,.git,dist,.Jules
```

## Safety rules
- パフォーマンス低下を防ぐため、`node_modules` や `.git` などの巨大なディレクトリは走査から除外します。
- 破壊的操作はありません（ファイルへの書き込みのみ）。

## Verification
- 実行後、リポジトリのルートに `index.efu.csv` が生成されていることを確認します。
- エラーが出力されずに完了していることを確認します。

## Related files
- `.agents/skills/generate-efu-catalog/scripts/generate.js`
