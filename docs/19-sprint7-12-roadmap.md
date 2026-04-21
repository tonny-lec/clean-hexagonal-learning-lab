# 19. Sprint 7-12 ロードマップ: この学習ラボの第1区切りをどう締めるか

> **目的:** Sprint 6 までで作った学習ラボを、Sprint 12 までで一度きれいに区切るための全体計画を残す。

このドキュメントは、今後の実装を「その場の思いつき」で広げすぎないためのロードマップです。

すでにこの repo では、Sprint 1〜6 を通じて次を学べるようになっています。

- DDD の基礎語彙
- aggregate / policy / service の入口
- PostgreSQL persistence / migration
- outbox / authorization
- read model / dispatcher / observability の入口
- retry / dead-letter / poller
- integration event versioning / subscriber boundary / broker-like publisher

ここから先は、**実務寄りの delivery / integration / distributed workflow を学ぶ領域**に入ります。
ただし、全部を本番級に作り込むと教材 repo として重くなりすぎます。

そのため、この repo はいったん **Sprint 12 までを第1区切り** とし、

> **「Clean / Hexagonal の構造理解」から「非同期連携・失敗・境界・採用判断まで説明できる状態」へ進む**

ことをゴールにします。

---

## まず結論: Sprint 12 までの役割分担

### Sprint 7〜10
**実装中心で、非同期運用の現実感を足すフェーズ**

- worker / consumer の責務
- real broker との接続
- replay / re-drive / subscriber failure policy
- metrics / tracing / structured logging

### Sprint 11〜12
**上級編として、長いワークフローと境界設計を整理するフェーズ**

- saga / compensation
- bounded context / ACL / strategic DDD
- どこまでフル採用すべきかの判断材料

この 6 Sprint を終えた時点で、この repo は

- 小さなサンプルを超えて
- それでも過剰実装にはなりすぎず
- 「なぜその境界を置くのか」を語れる教材

として、かなり良い区切りになります。

---

# Sprint 7. Dedicated Worker / Consumer の導入

## 狙い
Sprint 5 の poller を、**request の外で delivery を回す責務**としてもう一段だけ現実寄りにする。

## この Sprint で学びたいこと
- なぜ HTTP request の中で全部 publish しないのか
- worker / scheduler / consumer は何が違うのか
- use case と long-running process の責務をどう切るのか

## 追加候補
- worker entrypoint
- queue consumer 的 adapter の入口
- dispatch / poll を定期実行する構成
- worker 向け docs / demo

## 完了イメージ
- `poller` より一段はっきりした worker 実行経路がある
- 「dispatcher は use case、worker は orchestrator」と説明できる
- README から worker demo へ辿れる

## この Sprint でやりすぎないこと
- 本格分散運用
- 複数ノードの競合制御
- 高度なジョブスケジューラ統合

---

# Sprint 8. Real Broker Adapter への接続

## 狙い
Sprint 6 の broker-like publisher を、**本物の message broker adapter の入口**へ進める。

## この Sprint で学びたいこと
- publisher port の本当の価値
- broker の都合を core に入れない理由
- topic / key / header / delivery semantics を adapter 側で吸収する考え方

## 追加候補
- real broker publisher adapter
- 環境変数による publisher 切替
- local demo 用 compose / emulator / mock
- broker 連携 docs

## 完了イメージ
- in-memory / console / broker-like / real broker を差し替えられる
- integration event contract はそのままで、delivery detail だけが替わる
- 「port を切った意味」をコードで説明できる

## この Sprint でやりすぎないこと
- broker 固有機能への過剰依存
- schema registry の本格導入
- 複数 broker 対応の同時実装

---

# Sprint 9. Subscriber Failure Policy / Replay / Re-drive

## 狙い
今の dead-letter を、**subscriber 単位の失敗制御と再投入の学習**へ進める。

## この Sprint で学びたいこと
- publish 成功後に downstream が壊れたとき何が起きるか
- subscriber ごとに retry policy を分ける意味
- replay / re-drive は誰の責務か

## 追加候補
- subscriber failure policy
- replay / re-drive use case
- dead-letter 再送フロー
- failure classification の docs

## 完了イメージ
- dead-letter が「捨て場」ではなく「次の運用 action につながる場所」になる
- projector subscriber と外部通知 subscriber の失敗戦略を分けられる
- replay を application / adapter のどこで扱うか説明できる

## この Sprint でやりすぎないこと
- 完全な運用管理 UI
- 本格的な再実行ダッシュボード
- 複雑すぎる優先度付きキュー

---

# Sprint 10. Observability 強化

## 狙い
Sprint 4 で入れた observability port を、**本当に運用を語れる最低限の形**まで育てる。

## この Sprint で学びたいこと
- business event と telemetry event の違い
- structured logging / metrics / tracing の責務分離
- 監視のための detail を core へ侵食させない考え方

## 追加候補
- structured log adapter
- metrics adapter
- trace context の入口
- worker / broker / replay の可観測性 docs

## 完了イメージ
- 主要 use case と delivery flow を観測できる
- audit log と observability の違いを説明できる
- 失敗時に「どこを見ればよいか」を README / docs に書ける

## この Sprint でやりすぎないこと
- 監視 SaaS への深いベンダ依存
- 巨大なダッシュボード作成
- 本格 SRE 運用の再現

---

# Sprint 11. Saga / Compensation の入口

## 狙い
payment workflow を題材に、**複数外部依存が絡むときの整合性設計**を学ぶ。

## この Sprint で学びたいこと
- local transaction と saga の違い
- 失敗後に「戻す」設計が必要になる理由
- orchestration と choreography の入口

## 追加候補
- payment workflow の段階化
- compensation action
- saga coordinator か、それに相当する最小構成
- docs / sequence 例

## 完了イメージ
- 「DB transaction だけでは守れない世界」が説明できる
- retry と compensation の違いを答えられる
- failure path を含めた教材として語れる

## この Sprint でやりすぎないこと
- 分散トランザクションの完全再現
- 多数サービスをまたぐ巨大 saga
- 過度に抽象化された汎用 saga framework

---

# Sprint 12. Bounded Context / ACL / Strategic DDD で締める

## 狙い
ここまでの実装を土台に、**この repo を「構造の説明」から「文脈と境界の説明」へ引き上げる**。

## この Sprint で学びたいこと
- bounded context はなぜ必要か
- 同じ `Order` でも文脈が変わると意味が変わること
- anti-corruption layer で外部都合をどう隔離するか
- Clean / Hexagonal をどこまで採用すべきかの判断

## 追加候補
- context map docs
- ACL の最小サンプル
- upstream / downstream の翻訳例
- 「フル採用 vs 部分採用」比較資料

## 完了イメージ
- tactical DDD と strategic DDD をつなげて話せる
- repo 全体を 1 つの bounded context として見る見方、分割候補として見る見方の両方を説明できる
- 「この案件ならどこまでやるべきか」を理由付きで話せる

## この Sprint でやりすぎないこと
- 大規模組織論の完全再現
- 複数チーム運営の細部までの制度設計
- 図だけ豪華でコードに接続しない資料作り

---

# 推奨する実施順の理由

## 1. まず運用責務を切り出す
Sprint 7 で worker / consumer を入れると、delivery が request から分離され、非同期設計の説明が一気にしやすくなります。

## 2. 次に real broker へ触る
Sprint 8 で adapter 差し替えを体験すると、「port を切る理由」が実感になります。

## 3. その後に failure と replay を扱う
Sprint 9 で、非同期設計の本当の難しさである失敗制御へ進みます。

## 4. 観測可能性を足す
Sprint 10 で observability を強めると、ここまでの worker / broker / replay を運用の視点で語れます。

## 5. 最後に workflow と境界設計で締める
Sprint 11〜12 で saga と strategic DDD へ進むと、repo 全体が「実装のテクニック集」ではなく「設計判断の教材」になります。

---

# Sprint 12 到達時のゴール

Sprint 12 を終えた時点で、この repo は少なくとも次を説明できる状態を目指します。

- なぜ Clean / Hexagonal で責務分離するのか
- なぜ aggregate / port / adapter / use case を分けるのか
- なぜ outbox / retry / dead-letter / replay が必要になるのか
- なぜ integration event を versioning するのか
- なぜ worker / broker / subscriber を分けるのか
- なぜ observability は business logic と別の関心なのか
- なぜ saga / compensation が必要になるのか
- なぜ bounded context / ACL が大規模設計で重要なのか
- この設計をどこまで採用すべきかをどう判断するのか

---

# この区切りで「やらない」と決めるもの

第1区切りを守るため、Sprint 12 まででは次は原則として後回しにします。

- 本格的なマルチノード分散ロック
- 本番 SaaS への深い observability 統合
- schema registry の本格運用
- 本格 UI ベースの運用コンソール
- 複数 bounded context の大規模実装
- 汎用フレームワーク化

これらは価値はありますが、**教材 repo としての焦点をぼかしやすい**ためです。

---

# 実装の進め方

残りの Sprint でも、これまでと同じ進め方を維持します。

1. docs を先に足す
2. 実装する
3. テストを足す
4. build / demo を通す
5. README / oral exam を揃える
6. commit / push する

この一貫性自体が、この repo の学習価値の一部です。

---

# 一言まとめ

Sprint 7〜12 は、

> **非同期 delivery の現実 → 失敗制御 → 観測 → 長い業務フロー → 境界設計**

の順で進める 6 段です。

この 6 Sprint を終えたところで、この repo はいったんきれいに区切れます。
