# 25. Sprint 10 実装タスク分解: Observability 強化

> **目的:** Sprint 4 で入れた `ObservabilityPort` を、Sprint 7〜9 で増えた worker / broker / replay の流れまで含めて、
> **「運用時にどこを見ればよいか」を説明できる最小構成** へ育てる。

このスプリントでは、次の 4 テーマを最小構成で前進させます。

1. **telemetry の形を整える**
2. **structured logging / metrics / tracing の入口を分ける**
3. **HTTP → outbox → worker / replay を追える correlation を入れる**
4. **README / oral exam / demo を Sprint 10 状態に揃える**

---

## まず結論: Sprint 10 の本質

いまの repo にも observability はあります。

- `ObservabilityPort.record(name, attributes)`
- `ConsoleObservability` による `[obs] ...` 出力
- `InMemoryObservability` による test 観測
- `AuditLogPort` / `ConsoleAuditLog` による `[audit] ...` 出力

つまり現時点でも、

- `order.place.started`
- `order.place.completed`
- `outbox.dispatch.completed`
- `subscriber.delivery.replayed`
- `delivery-worker.processed`

のような **観測イベントの入口** はあります。

ただし、Sprint 9 まで進むと次の弱さが見えてきます。

- 1 回の HTTP request と、その後の dispatch / replay を **同じ流れとして追いにくい**
- metrics 的に「何件成功・失敗したか」を説明しづらい
- trace 的に「どの hop で失敗したか」を辿りにくい
- audit log と observability が、まだ「どちらもログ」に見えやすい

Sprint 10 でやりたいのは、そこを最小限で整えることです。

一言でいうと、

> **「obs を出している」から「request / worker / replay の流れを、structured logging / metrics / tracing の観点で説明できる」状態へ進む**

のが Sprint 10 の狙いです。

---

## この Sprint で守りたい方針

### 1. observability detail を core に入れすぎない
- vendor SDK を use case に持ち込まない
- dashboard 都合の field 名を domain model に埋め込まない
- trace/span の完全再現を目的にしない

### 2. でも「何も分からない抽象化」にもしない
- いまの `record(name, attributes)` だけで足りないなら、
  telemetry の意図が分かる最小限の shape を足す
- `requestId` / `correlationId` / `messageId` / `subscriberName` のように、
  **運用時に本当に見たい軸** は明示する

### 3. audit log とは役割を分ける
- audit log は「何が実行されたか」の履歴
- observability は「いま何が起きているか / どこで失敗したか」の観測

---

## フェーズ1. telemetry の shape を整える

### ゴール
observability を「event 名と適当な attributes の箱」から、
**相関づけと分類ができる観測イベント**へ一段だけ進める。

### 追加 / 更新候補
- `src/application/ports/observability-port.ts`
- `src/application/use-cases/place-order.ts`
- `src/application/use-cases/dispatch-outbox.ts`
- `src/application/use-cases/poll-outbox.ts`
- `src/application/use-cases/replay-subscriber-failures.ts`
- `src/adapters/worker/outbox-delivery-worker.ts`
- `src/adapters/subscribers/fan-out-integration-event-subscriber.ts`

### 今回やること
- telemetry event に最低限の分類軸を持たせる
  - 例: `category`, `traceId`, `correlationId`, `messageId`, `subscriberName`
- `orderId` / `outboxMessageId` / `subscriberName` のような既存業務識別子を、
  telemetry 側から参照できるようにする
- event 名の粒度を揃える
  - started / completed / failed
  - replayed / dead-lettered
  - processed / idle
- 「business event」と「telemetry event」を docs 上でも切り分ける

### 完了条件
- 1 件の注文から dispatch / replay までを、共通の相関キーで辿れる
- failure が `publisher` / `subscriber` / `worker` のどこで起きたか説明できる
- telemetry event の field が business contract そのものではないと説明できる

---

## フェーズ2. structured logging / metrics / tracing の入口を分ける

### ゴール
`[obs] event-name {...}` だけの世界から、
**structured log / metric / trace context の違い** を説明できる最小構成へ進む。

### 追加 / 更新候補
- `src/adapters/observability/structured-console-observability.ts`
- `src/adapters/in-memory/in-memory-observability.ts`
- `src/composition-root.ts`
- `tests/place-order-observability.test.ts`
- `tests/dispatch-outbox.test.ts`
- `tests/delivery-worker.test.ts`
- `tests/subscriber-replay.test.ts`

### 今回やること
- console 出力を、読みやすい JSON かそれに近い structured log へ寄せる
- event count / failure count / replay count / dead-letter count を確認できる
  **軽量 metric 収集** を入れる
- trace context は full tracing SaaS 連携ではなく、
  `traceId` / `span` 相当の最小データで入口だけ作る
- `AuditLogPort` は別のまま維持し、混ぜない

### 完了条件
- structured log を見て「どの flow の何が起きたか」が追いやすい
- metrics 的に最低限の件数を語れる
- tracing は vendor lock-in なしでも「流れを辿る考え方」を説明できる

---

## フェーズ3. HTTP → worker / replay を追える correlation を入れる

### ゴール
request 境界や worker trigger 境界から、
**相関 ID を受け渡して delivery flow を追える** ようにする。

### 追加 / 更新候補
- `src/adapters/http/auth-middleware.ts`
- `src/adapters/http/create-demo-http-server.ts`
- `src/index.ts`
- `src/adapters/worker/delivery-trigger-consumer.ts`
- `src/adapters/in-memory/in-memory-delivery-trigger-consumer.ts`
- `tests/http-adapter.test.ts`
- `tests/delivery-worker.test.ts`
- `tests/multiple-entrypoints.test.ts`

### 今回やること
- HTTP では `x-request-id` のような header を受けるか、なければ生成する
- worker trigger にも `triggerId` / `requestedAt` / `correlationId` を持たせる
- replay 実行でも「どの subscriber failure を再投入したか」が追えるようにする
- demo 出力で「同じ flow を辿れる」ことを見せる

### 完了条件
- HTTP request 起点の observability と worker 起点の observability を比較できる
- replay が元の失敗レコードとどうつながるか説明できる
- request detail を domain へ漏らさずに相関を持てる

---

## フェーズ4. 学習導線を更新する

### ゴール
README / oral exam / 補助 docs を、Sprint 10 で学ぶ観点に揃える。

### 追加 / 更新候補
- `README.md`
- `docs/09-oral-exam-checklist.md`
- `docs/26-telemetry-vs-audit-log-and-business-events.md`

### 今回やること
- observability と audit log の違いを README から辿れるようにする
- 「business event / telemetry event / audit entry」の違いを整理した補助 doc を足す
- demo 手順に「どこを見るか」を書く
  - request / worker / replay
  - structured log
  - metric snapshot
  - audit output

### 完了条件
- README から Sprint 10 の学習ポイントへ辿れる
- oral exam で observability を単なる logging 以上に説明できる
- 次の Sprint 11 へ行く前に、運用視点の足場ができる

---

## TDD 方針

今回も順番は同じです。

1. failing test を先に書く
2. targeted test で failure を確認する
3. 最小実装で通す
4. 全体 test / build を回す
5. HTTP / worker / replay の demo を確認する
6. review / commit / push をする

### 最初に増やしたい targeted test 候補
- `tests/place-order-observability.test.ts`
  - correlation field を含む telemetry 記録
- `tests/dispatch-outbox.test.ts`
  - publish / ack / subscriber failure を structured に観測できる
- `tests/delivery-worker.test.ts`
  - worker trigger と observability のひも付け
- `tests/subscriber-replay.test.ts`
  - replay telemetry と audit の役割差
- `tests/http-adapter.test.ts`
  - `x-request-id` の受け渡し

---

## 学習上の意味

Sprint 10 を終えると、次が説明しやすくなります。

- なぜ observability event は integration event と別物なのか
- なぜ audit log と telemetry を分けたいのか
- なぜ requestId / traceId を domain model に埋めない方がよいのか
- なぜ worker / broker / replay を「運用上どう見るか」で語れると理解が一段深くなるのか

---

## 一言まとめ

Sprint 10 の本質は、

> **非同期処理の流れを見えるようにしつつ、その観測 detail を business logic に侵食させないこと**

です。
