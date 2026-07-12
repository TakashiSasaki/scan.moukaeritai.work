# generate-efu-catalog

## Purpose
ワークスペース内のすべてのファイルのカタログを Everything の efu 形式 (csv 拡張子付き) で記録します。

## When to use
ユーザーからワークスペースのファイルカタログや efu ファイル、ファイル一覧の出力を求められた場合に使用します。

## Inputs
- Node.js environment is required.
- Standard Command line args can be passed.

## Procedure
以下のスクリプトを実行してカタログを生成します。

```bash
# デフォルトの除外設定で実行
npx tsx .agents/skills/generate-efu-catalog/scripts/generate.js

# 除外するディレクトリ・ファイルを指定して実行
npx tsx .agents/skills/generate-efu-catalog/scripts/generate.js --exclude node_modules,.git,dist,.Jules
```

## Stop conditions
- None. This is a non-destructive read-only operation.

## Verification
- 実行後、リポジトリのルートに `index.efu.csv` が生成されていることを確認します。
- エラーが出力されずに完了していることを確認します。

## Related scripts
- `.agents/skills/generate-efu-catalog/scripts/generate.js`

## Outputs
- `index.efu.csv` in the root workspace directory containing the files catalog.
