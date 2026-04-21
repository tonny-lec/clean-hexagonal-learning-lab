# 26. Telemetry / Audit Log / Business Event は何が違うのか

Sprint 10 で observability を強化するときに一番混ざりやすいのは、

- business event
- telemetry event
- audit log

の 3 つです。

どれも「何かが起きた記録」に見えますが、**目的が違います**。
このドキュメントは、その違いを言葉で説明するための補助資料です。

---

## 1. まず 3 つを一言で分ける

### Business event
**業務上、何が起きたか** を表すものです。

この repo なら、たとえば integration event としての:

- `order.placed.v1`
- `order.placed.v2`

が近い例です。

ここで大事なのは、

- downstream と共有する契約であること
- versioning を意識すること
- broker detail そのものではないこと

です。

---

### Telemetry event
**運用上、いま何が起きているか / どこで失敗したか** を観測するためのものです。

この repo にはすでに、たとえば:

- `order.place.started`
- `order.place.completed`
- `order.place.failed`
- `outbox.dispatch.completed`
- `outbox.dispatch.failed`
- `subscriber.delivery.blocked`
- `subscriber.delivery.replayed`
- `delivery-worker.processed`
- `delivery-worker.failed`

のような観測イベントがあります。

これらは downstream 契約ではなく、
**開発者や運用者が流れを理解するための信号** です。

---

### Audit log
**あとで履歴・証跡として確認したい記録** です。

この repo では、たとえば:

- `order-placed`
- `integration-event-published`
- `outbox-message-dead-lettered`
- `delivery-worker-processed`
- `delivery-worker-failed`
- `subscriber-delivery-replayed`
- `subscriber-delivery-dead-lettered`

のような action が audit log に残ります。

telemetry よりも、

- 何が実行されたか
- どの aggregate / message / subscriber に対してか
- 後から履歴として追いたいか

に寄っています。

---

## 2. なぜ 1 つの「ログ」にまとめないのか

もし全部を 1 種類のログに押し込むと、次の問題が起きます。

- downstream 契約と運用ログが混ざる
- requestId / traceId のような運用 detail が business contract に漏れる
- 逆に業務上重要な action が、ノイズの多い運用ログに埋もれる
- 「あとで証跡として見たい記録」と「いま障害調査で見たい記録」が区別しにくい

つまり、

> **同じ“記録”でも、誰のための記録かが違う**

のが本質です。

---

## 3. この repo で見るとどう違うのか

### `order.placed.v1`
これは **business / integration event** です。

- publisher と subscriber の間で共有される
- versioning 対象になる
- broker をまたいでも意味を保ちたい

---

### `order.place.completed`
これは **telemetry event** です。

- order placement が完了したことを観測する
- 監視・デバッグ・メトリクス集計に使える
- downstream 契約ではない

---

### `order-placed`
これは **audit log entry** です。

- 実際に注文作成 action が行われたことを残す
- 履歴として追いたい
- observability event と似て見えても目的が違う

---

## 4. structured logging / metrics / tracing は telemetry の中の役割分担

Sprint 10 で強化したい observability は、さらに 3 つに分けて考えると理解しやすいです。

### Structured logging
**その場で何が起きたかを、機械でも人でも読みやすく残す** ものです。

例:
- event name
- timestamp
- orderId
- messageId
- subscriberName
- traceId
- result

用途:
- 障害調査
- ローカル demo
- ログ検索

---

### Metrics
**件数・失敗率・遅延の傾向を見る** ものです。

例:
- `orders_placed_total`
- `outbox_dispatch_failed_total`
- `subscriber_replay_total`
- `delivery_worker_idle_total`

用途:
- 失敗率の把握
- アラート
- ダッシュボード

---

### Tracing
**1 つの flow を hop ごとに辿る** ものです。

例:
- HTTP request
- place order
- outbox dispatch
- subscriber delivery
- replay

用途:
- 「どこで遅いか」
- 「どこで失敗したか」
- request と worker をまたぐ相関

---

## 5. なぜ traceId / requestId を domain に入れたくないのか

traceId や requestId は便利ですが、
それは **運用上便利** なのであって、domain の意味そのものではありません。

もし domain entity や integration contract に直接混ぜすぎると、

- business meaning と運用 meaning が混ざる
- 外部監視ツールの都合が core に侵入する
- テストや docs が本質からズレる

という問題が出ます。

だから Sprint 10 では、

> **trace context は必要だが、business rule そのものではない**

という境界感覚を学ぶのが大事です。

---

## 6. audit log と observability の違いを、ひとことで言うなら

ざっくり言うと:

- observability は **いま流れを理解するための記録**
- audit log は **あとで action を証明・追跡するための記録**

です。

似た情報を含むことはありますが、
主目的が違うので、同じ箱に押し込まない方が説明しやすくなります。

---

## 7. Sprint 10 で本当に学びたいこと

Sprint 10 で見たいのは、単にログを増やすことではありません。

見たいのは、

- business event
- telemetry event
- audit entry

を分けた上で、

- structured logging
- metrics
- tracing

を **port / adapter の境界を崩さずに足していく考え方** です。

つまり Sprint 10 の観点は、

> **観測可能性を強くしても、business logic を observability tool の都合で汚さないこと**

にあります。

---

## 8. 一言まとめ

- business event は **業務契約**
- telemetry event は **運用観測**
- audit log は **履歴証跡**
- 3 つを分けると、worker / broker / replay をより説明しやすくなる

Sprint 10 で本当に学びたいのは、

> **「記録すること」全体を 1 種類で済ませず、目的ごとに責務を分けること**

です。
