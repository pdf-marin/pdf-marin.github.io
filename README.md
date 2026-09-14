# PDF MARIN のホームページ

このフォルダの中身が、そのままホームページになります（GitHub Pages で公開）。

| ファイル | 中身 |
|---|---|
| `index.html` | ホームページ本体。文章・できること・更新履歴はここ |
| `terms.html` | 利用規約（正本はアプリ側の terms-ja.md。手で直さず、そこから作り直す） |
| `version.json` | **最新版の情報。更新のときはここだけ直す** |
| `404.html` | アドレスを打ち間違えたときのページ |
| `assets/` | アイコン・OGP 画像・画面写真（架空の見本書類のみ） |
| `sitemap.xml` / `robots.txt` | 検索エンジン向けの案内 |
| `google203c04aaea034c73.html` | Google Search Console の所有権確認ファイル（**消すと確認が外れる**） |
| `.nojekyll` | GitHub の余計な変換を止める空ファイル（消さない） |

配布するインストーラー本体は、このフォルダには入れません。GitHub の **Releases** に置きます
（1ファイル 2GB まで置けるため）。

## アクセス解析

Umami Cloud で、訪問数・流入元・ダウンロードボタンのクリック数を匿名集計します。
管理画面は `https://cloud.umami.is/`、サイト名は **PDF MARIN** です。

- Website ID: `ff3cd968-cb06-4c96-aae5-15c2af2b2469`
- ダウンロードイベント名: `installer-download`
- `location`: `hero`（ページ上部）または `download-section`（ダウンロード欄）

計測コードは `index.html`、`terms.html`、`privacy.html`、`404.html` に入っています。
利用規約・プライバシーポリシーを作り直す場合も、同じ計測コードを残してください。
