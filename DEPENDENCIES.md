# 依存関係・外部通信

最終確認日: 2026-08-09

| 名称 | 固定版・URL | 用途 | ライセンス | 通信 |
|---|---|---|---|---|
| MathJax | 3.2.2 / `https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js` | 数式表示 | Apache-2.0 | 起動時にjsDelivrへ接続 |
| MathLive | 0.98.4 / `https://unpkg.com/mathlive@0.98.4/dist/mathlive.min.js` | 数式入力 | MIT | 起動時にunpkgへ接続 |
| BIZ UDPGothic / Outfit | Google Fonts CSS | 画面フォント | 各フォントの配布条件 | 起動時にGoogle Fontsへ接続 |

MathJaxまたはMathLiveの読込が失敗した場合、数式入力・表示は利用できません。問題や学習履歴を外部サーバーへ送信する機能は実装していません。

ブラウザ内には、最高スコアと最大20件の学習結果を`localStorage`へ保存します。氏名、学校名、IDその他の個人情報は扱いません。
