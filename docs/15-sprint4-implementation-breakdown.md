# 15. Sprint 4 実装タスク分解: Dispatcher / Integration Event / Read Model / Payment Adapter / Observability

> **目的:** Sprint 3 の outbox / authorization を土台にして、Sprint 4 で
> **delivery / query side / external adapter variability / observability** までつなげる。

このスプリントでは、次の 5 テーマをまとめて前進させます。

1. **outbox dispatcher / poller**
2. **integration event への変換**
3. **read model / query side 分離**
4. **payment adapter を複数化**
5. **observability / audit log**

---

## まず結論: 実装順はこの順が自然

### フェーズ1. Outbox を「ためるだけ」から「運ぶ」へ進める
1. OutboxPort を dispatcher 向けに拡張する
2. integration event mapper を追加する
3. dispatcher use case を追加する

### フェーズ2. Query side を read model に寄せる
4. `OrderReadModelPort` を追加する
5. in-memory / PostgreSQL read model adapter を追加する
6. `getOrderSummary` を read model 経由へ切り替える

### フェーズ3. 外部依存の差し替えを強める
7. payment gateway adapter を success / failure / stripe-like の 3 種類に増やす
8. テストで adapter 差し替えの意味を比較可能にする

### フェーズ4. 観測可能性を足す
9. observability port を追加する
10. audit log port を追加する
11. `placeOrder` / `dispatchOutbox` から記録する

### フェーズ5. 学習導線を閉じる
12. README 更新
13. oral exam 更新
14. デモ entrypoint 更新

---

## Task 1. OutboxPort を dispatcher 向けに拡張する

### ゴール
Outbox を保存するだけでなく、pending メッセージの取得と publish 済みマークまで扱えるようにする。

### 追加 / 更新候補
- `src/application/ports/outbox-port.ts`
- `src/adapters/in-memory/in-memory-outbox.ts`
- `src/adapters/postgres/postgres-outbox.ts`
- `tests/postgres-outbox.test.ts`

### 完了条件
- `save`
- `listPending`
- `markAsPublished`

が port で表現される。

---

## Task 2. Integration Event への変換を追加する

### ゴール
Domain event を、そのまま外へ出すのではなく integration event へ写像する入口を作る。

### 追加ファイル候補
- `src/application/integration-events/order-integration-event.ts`
- `src/application/ports/integration-event-publisher-port.ts`

### 完了条件
- `order.placed` domain event から
- versioned な `order.placed.v1` integration event を作れる

---

## Task 3. Dispatcher use case を追加する

### ゴール
Outbox に残った event を publish / project / mark-as-published できるようにする。

### 追加ファイル候補
- `src/application/use-cases/dispatch-outbox.ts`
- `tests/dispatch-outbox.test.ts`

### flow
1. pending outbox を読む
2. integration event へ変換する
3. publisher で送る
4. read model を更新する
5. audit / observability を残す
6. outbox を published にする

### 完了条件
- dispatcher を単独 use case として説明できる
- retry/poller の土台が見える

---

## Task 4. Read model / query side を分離する

### ゴール
`getOrderSummary` が write model repository ではなく read model port を使う構造に進める。

### 追加ファイル候補
- `src/application/ports/order-read-model-port.ts`
- `src/adapters/in-memory/in-memory-order-read-model.ts`
- `src/adapters/postgres/postgres-order-read-model.ts`
- `db/migrations/004_create_order_summaries.sql`
- `tests/postgres-order-read-model.test.ts`

### 完了条件
- query use case が read model に依存する
- eventual consistency を説明できる

---

## Task 5. Payment adapter を複数化する

### ゴール
外部サービス detail の差し替えを、学習コードで比較可能にする。

### 追加ファイル候補
- `src/adapters/payment/fake-payment-gateway.ts`
- `src/adapters/payment/failing-payment-gateway.ts`
- `src/adapters/payment/stripe-like-payment-gateway.ts`
- `tests/payment-adapters.test.ts`

### 完了条件
- success / failure / provider-like naming を比較できる
- use case 側は port のままでよい

---

## Task 6. Observability / Audit log を追加する

### ゴール
「動いた」だけでなく、何が起きたかを追えるようにする。

### 追加ファイル候補
- `src/application/ports/observability-port.ts`
- `src/application/ports/audit-log-port.ts`
- `src/adapters/in-memory/in-memory-observability.ts`
- `src/adapters/in-memory/in-memory-audit-log.ts`
- `tests/place-order-observability.test.ts`
- `tests/dispatch-outbox.test.ts`

### 記録例
- `order.place.started`
- `order.place.completed`
- `outbox.dispatch.completed`
- integration event publish の audit entry

### 完了条件
- observability と audit log の役割差を説明できる

---

## Task 7. README / oral exam / demo を更新する

### ゴール
学習導線を Sprint 4 状態に揃える。

### 追加 / 更新候補
- `README.md`
- `docs/09-oral-exam-checklist.md`
- `src/index.ts`

### 完了条件
- dispatcher 実行導線がある
- read model / integration event / observability を読める

---

## TDD 方針

この Sprint では、次の順で進める。

1. failing test を先に書く
2. targeted test で failure を確認する
3. 最小実装で通す
4. 全体 test / build を回す
5. 最後に review / commit / push する

---

## 学習上の意味

Sprint 4 を終えると、次が説明しやすくなる。

- outbox は「保存」だけで終わらない
- integration event は domain event と役割が違う
- query side は write model から分けられる
- payment adapter は複数実装して初めて port の意味が強く見える
- observability / audit log は本番設計に入る入口である

---

## 一言まとめ

Sprint 4 の本質は、

> **「注文を作る」だけの教材から、「作った後にどう配るか・どう読むか・どう観測するか」を学べる教材へ進めること**

です。
