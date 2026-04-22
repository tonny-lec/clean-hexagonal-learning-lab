# 29. Sprint 12 実装タスク分解: Bounded Context / ACL / Strategic DDD

> **目的:** Sprint 11 の saga / compensation の次に、
> **「構造の説明」から「文脈と境界の説明」へ進む最小実装** をこの repo に足す。

このスプリントでは、次の 4 テーマを最小構成で前進させます。

1. **context map を明示する**
2. **ACL (anti-corruption layer) の最小サンプルを追加する**
3. **upstream / downstream の翻訳責務を adapter に閉じる**
4. **README / oral exam / demo を Sprint 12 状態に揃える**

---

## まず結論: Sprint 12 の本質

Sprint 11 までで、この repo はかなり実務寄りの話を扱えるようになりました。

- outbox / retry / replay
- worker / broker / subscriber
- telemetry / audit
- saga / compensation

ただし、ここまでの説明はまだ主に

- どの責務をどこに置くか
- どの failure をどう扱うか

という **1 つのシステムの中の構造** に寄っています。

Sprint 12 で進みたいのは、その次です。

たとえば:

- Sales 側では `Order` と呼んでいる
- Warehouse 側では `ShipmentRequest` や `DispatchTicket` と呼んでいる
- 似て見えるが、意味も都合も同じではない
- だから外部都合をそのまま core に入れたくない

という **bounded context / anti-corruption layer の論点** を、
この repo のコードで説明できるようにします。

一言でいうと、

> **「port / adapter がある」から「文脈ごとの言葉のズレを ACL で吸収する」と説明できる状態へ進む**

のが Sprint 12 の狙いです。

---

## 今回の題材: Sales Context と Warehouse Context の境界

この repo では、すでに fulfillment step が入っています。
そのため Sprint 12 では、まったく新しい巨大概念を足すより、
**Order checkout 後に呼ぶ fulfillment adapter** を使って ACL を見せるのが自然です。

今回の最小サンプルでは、次のように考えます。

### Sales Context 側
- `Order`
- `customerId`
- `lines`
- `paymentConfirmationId`

### Warehouse Context 側
- `dispatchRequestNumber`
- `buyerReference`
- `items`
- `paymentReference`
- `dispatchTicketNumber`

ここで大事なのは、

- 「単なる field 名の違い」ではなく
- **相手の文脈で自然な意味に直して渡す**

ことです。

---

## この Sprint で守りたい方針

### 1. Context Map は docs でも code でも見えるようにする
- README だけでなく、Sprint doc で境界を説明する
- code では ACL adapter の翻訳責務を見えるようにする

### 2. ACL は application ではなく adapter に置く
- application は `FulfillmentPort` のままでよい
- warehouse の request / response shape は adapter 側へ閉じる
- core は warehouse 用語を知らない

### 3. 汎用翻訳 framework を作らない
- 今回の目的は「ACL の意味」を学ぶこと
- generic mapper 基盤ではなく、明示的な 1 adapter の翻訳で十分

### 4. repo 全体をどう区切れるかも説明できるようにする
- 「今は 1 bounded context として学んでいる」見方
- 「将来 split 候補がある」見方
- その両方を言えるようにする

---

## フェーズ1. context map を明示する

### ゴール
この repo を、単なるコード構造ではなく、
**複数の文脈が接している教材** として説明できるようにする。

### 追加 / 更新候補
- `docs/30-context-map-and-adoption-decisions.md`
- `README.md`
- `docs/09-oral-exam-checklist.md`

### 今回やること
- Sales / Payment / Warehouse の文脈差を docs に明示する
- 今は 1 repo でも、conceptually は context を分けて見られると整理する
- upstream / downstream の見方を加える

### 完了条件
- 「この repo は 1 つの bounded context としても、複数 context の接点教材としても読める」と説明できる
- context map を口頭で追える

---

## フェーズ2. ACL adapter の最小サンプルを追加する

### ゴール
Warehouse 側の都合を Sales 側 core に漏らさず、
**translation を adapter に閉じるサンプル** を追加する。

### 追加 / 更新候補
- `src/adapters/fulfillment/warehouse-client.ts`
- `src/adapters/fulfillment/warehouse-acl-fulfillment-service.ts`
- `tests/warehouse-acl-fulfillment-service.test.ts`
- `src/composition-root.ts`

### 今回やること
- warehouse client の request / response shape を adapter 配下に置く
- `Order` -> warehouse request への翻訳を ACL adapter に閉じる
- warehouse response -> `FulfillmentReceipt` への翻訳も ACL adapter に閉じる
- `FULFILLMENT_SERVICE=warehouse-acl` のような切替を追加する

### 完了条件
- core は warehouse field 名を知らない
- ACL の存在理由を test で説明できる

---

## フェーズ3. upstream / downstream translation の意味を補強する

### ゴール
「adapter がある」だけで終わらず、
**なぜ translation が必要なのか** を言葉で説明できるようにする。

### 追加 / 更新候補
- `README.md`
- `docs/30-context-map-and-adoption-decisions.md`
- `tests/order-checkout-saga.test.ts`（必要なら adapter 切替 path を補強）

### 今回やること
- field 名・識別子・意味のズレを補助 doc にまとめる
- ACL を「format 変換」だけでなく「meaning の保護」として書く
- saga との接続も README で触れる

### 完了条件
- retry / compensation と context boundary を混同しない
- ACL は strategic DDD の入り口だと説明できる

---

## フェーズ4. この repo をどこまでフル採用すべきかを整理する

### ゴール
Sprint 12 の締めとして、
**フル採用 vs 部分採用** の判断材料を repo に残す。

### 追加 / 更新候補
- `docs/30-context-map-and-adoption-decisions.md`
- `README.md`
- `docs/09-oral-exam-checklist.md`

### 今回やること
- 小規模案件ではどこまでで止めるか
- 中規模以上ならどこから strategic DDD が効くか
- 逆に何でも context 分割しない方がよい理由
を整理する

### 完了条件
- 「この案件ならフル採用しない」を理由つきで言える
- 設計が目的ではなく、課題に対する手段だと説明できる

---

## TDD 方針

今回も順番は同じです。

1. failing test を先に書く
2. targeted test で failure を確認する
3. 最小実装で通す
4. 全体 test / build を回す
5. warehouse ACL demo を確認する
6. review / commit / push をする

### 最初に増やしたい targeted test 候補
- `tests/warehouse-acl-fulfillment-service.test.ts`
  - internal `Order` を warehouse request に翻訳する
  - warehouse response を `FulfillmentReceipt` に戻す
- `tests/order-checkout-saga.test.ts`
  - warehouse ACL adapter を fulfillment service として差し替えられる
- 必要なら `tests/multiple-entrypoints.test.ts`
  - strategic 境界の docs 追加で影響がないことを確認

---

## 学習上の意味

Sprint 12 を終えると、次が説明しやすくなります。

- なぜ bounded context は大規模設計で重要なのか
- なぜ同じ `Order` でも文脈が変わると意味がズレるのか
- なぜ ACL は「外部フォーマット変換」以上の意味を持つのか
- なぜ Clean / Hexagonal をどこまで採用するかは案件次第なのか

---

## 一言まとめ

Sprint 12 の本質は、

> **外部システムや隣接文脈の言葉をそのまま core に流し込まず、ACL で翻訳して自分の文脈を守ることを説明できるようにすること**

です。
