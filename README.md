# Clean / Hexagonal Learning Lab

Clean Architecture と Hexagonal Architecture を、**概念だけでなく、コードと説明力の両方で身につける**ための TypeScript 学習プロジェクトです。

このラボのゴールは、次の 3 段階を踏めるようになることです。

1. **言葉で説明できる**
   - なぜ必要になるのか
   - 何を守る設計なのか
   - いつ採用して、いつ見送るのか
2. **コードで読める**
   - Domain / Use Case / Port / Adapter / Composition Root の対応
   - 依存方向
   - DTO / Presenter / Error / Query / Persistence の境界
3. **自分で設計できる**
   - API/CLI/Batch など入口が増えても中核を守る考え方
   - 外部依存、永続化、トランザクション、イベントの扱い
   - 現場でどこまで採用するか判断する視点

---

## このリポジトリで今カバーしていること

### 基礎
- なぜ Clean / Hexagonal が必要なのか
- Clean と Hexagonal の違い
- Domain / Entity / Use Case / Port / Adapter / Dependency Rule / Composition Root
- どんな場面で採用価値が高いか
- どんな場面では過剰設計になるか

### コードで学べること
- **Domain**: `Order`, `Money`, domain event
- **Application**: `placeOrder`, `getOrderSummary`, `dispatchOutbox`, `pollOutbox`, `replaySubscriberFailures`, authorization policy
- **Ports**: catalog / repository / read model / payment / outbox / integration event publisher / integration event subscriber / subscriber failure store / subscriber failure policy / unit of work / observability / audit log
- **Adapters**:
  - in-memory
  - SQLite
  - PostgreSQL
  - outbox
  - read model
  - subscribers / projectors
  - worker / consumer
  - payment gateway (console / fake / failure / stripe-like)
  - integration event publisher (console / broker-like / nats)
  - HTTP handlers + auth middleware
  - CLI presenter
  - batch runner
- **DTO / mapping**
- **Error design の入口**
- **Idempotency と transaction boundary の入口**
- **Outbox / eventual consistency / dispatcher の入口**
- **Retry / dead-letter / poller / dedicated worker の入口**
- **Integration event / versioning の入口**
- **Broker detail を adapter に閉じる入口**
- **Subscriber / projector boundary の入口**
- **Subscriber failure policy / replay / re-drive の入口**
- **Auth / authorization policy の入口**
- **Observability / audit log の入口**
- **複数 entrypoint から同じ use case を使う例**

---

## 学習順序

### 1. 文章で全体像をつかむ
- `docs/01-why-this-architecture.md`
- `docs/02-terminology-and-big-picture.md`
- `docs/03-when-to-use-it-in-the-real-world.md`
- `docs/04-explain-it-to-others.md`
- `docs/05-input-output-adapters-and-dto-mapping.md`
- `docs/06-errors-transactions-idempotency-and-consistency.md`
- `docs/07-value-objects-queries-domain-events-and-persistence.md`
- `docs/08-how-to-think-and-explain-like-a-designer.md`
- `docs/09-oral-exam-checklist.md`
- `docs/10-priority-roadmap-clean-hexagonal-and-ddd.md`
- `docs/11-p1-implementation-breakdown.md`
- `docs/11-postgres-and-migrations.md`
- `docs/12-outbox-and-consistency.md`
- `docs/13-auth-and-policy-placement.md`
- `docs/14-aggregate-boundary.md`
- `docs/15-sprint4-implementation-breakdown.md`
- `docs/16-sprint5-delivery-reliability.md`
- `docs/17-sprint6-event-contracts-and-subscribers.md`
- `docs/18-ubiquitous-language.md`
- `docs/19-sprint7-12-roadmap.md`
- `docs/20-sprint7-dedicated-worker-and-consumer.md`
- `docs/21-sprint8-real-broker-adapter.md`
- `docs/22-broker-details-and-port-boundaries.md`
- `docs/23-sprint9-subscriber-replay-and-redrive.md`
- `docs/24-outbox-retry-vs-subscriber-replay.md`
- `docs/25-sprint10-observability-strengthening.md`
- `docs/26-telemetry-vs-audit-log-and-business-events.md`
- `docs/27-sprint11-saga-and-compensation.md`
- `docs/28-retry-vs-compensation-and-transaction-boundaries.md`

### 2. コードを読む
- `src/domain/`
- `src/application/dto/`
- `src/application/errors/`
- `src/application/ports/`
- `src/application/use-cases/`
- `src/adapters/`
- `src/composition-root.ts`
- `src/index.ts`

### 3. テストで理解を固定する
- `tests/money.test.ts`
- `tests/order.test.ts`
- `tests/place-order.test.ts`
- `tests/get-order-summary.test.ts`
- `tests/http-adapter.test.ts`
- `tests/sqlite-order-repository.test.ts`
- `tests/postgres-order-repository.test.ts`
- `tests/postgres-outbox.test.ts`
- `tests/postgres-order-read-model.test.ts`
- `tests/place-order-postgres-transaction.test.ts`
- `tests/order-authorization-policy.test.ts`
- `tests/payment-adapters.test.ts`
- `tests/dispatch-outbox.test.ts`
- `tests/place-order-observability.test.ts`
- `tests/poll-outbox.test.ts`
- `tests/delivery-worker.test.ts`
- `tests/map-order-integration-event.test.ts`
- `tests/integration-event-subscribers.test.ts`
- `tests/broker-like-integration-event-publisher.test.ts`
- `tests/nats-integration-event-publisher.test.ts`
- `tests/subscriber-replay.test.ts`
- `tests/multiple-entrypoints.test.ts`

---

## 題材

題材は **注文作成 (Place Order)** と **注文参照 (Get Order Summary)** です。

理由:
- ドメインルールがある
- 価格参照、支払い、保存、イベント発行など外部依存がある
- Command と Query を分けて考えられる
- DTO / HTTP / CLI / Batch への展開が分かりやすい

### レイヤー対応
- **Domain**: `Order`, `Money`
- **Application / Use Case**: `placeOrder`, `getOrderSummary`, `dispatchOutbox`, `pollOutbox`, `replaySubscriberFailures`
- **Ports**: `ProductCatalogPort`, `OrderRepositoryPort`, `OrderReadModelPort`, `PaymentGatewayPort`, `OutboxPort`, `IntegrationEventPublisherPort`, `IntegrationEventSubscriberPort`, `SubscriberDeliveryFailureStorePort`, `SubscriberFailurePolicyPort`, `UnitOfWorkPort`, `ObservabilityPort`, `AuditLogPort`
- **Adapters**: in-memory / SQLite / PostgreSQL / outbox / read model / payment / console / broker-like / nats / subscribers / worker / HTTP / CLI / batch
- **Composition Root**: `src/composition-root.ts`

---

## ディレクトリ構成

```text
clean-hexagonal-learning-lab/
  docs/
    01-why-this-architecture.md
    02-terminology-and-big-picture.md
    03-when-to-use-it-in-the-real-world.md
    04-explain-it-to-others.md
    05-input-output-adapters-and-dto-mapping.md
    06-errors-transactions-idempotency-and-consistency.md
    07-value-objects-queries-domain-events-and-persistence.md
    08-how-to-think-and-explain-like-a-designer.md
  src/
    domain/
      errors.ts
      money.ts
      order.ts
    application/
      dto/
      errors/
      integration-events/
      policies/
      ports/
      use-cases/
    adapters/
      batch/
      cli/
      console/
      http/
      in-memory/
      nats/
      payment/
      postgres/
      presenters/
      sqlite/
      subscribers/
      worker/
    composition-root.ts
    index.ts
  db/
    migrations/
  infra/
    nats/
  scripts/
    nats-subscribe.ts
  tests/
```

---

## 実行方法

```bash
cd ~/workspace/hermes-agent/clean-hexagonal-learning-lab
npm install
npm test
npm run build
```

### Integration event publisher の切り替え
```bash
INTEGRATION_PUBLISHER=console npm run dev -- query
INTEGRATION_PUBLISHER=broker-like npm run dev -- query
INTEGRATION_PUBLISHER=nats npm run dev -- query
```

`nats` を使う場合は、事前に local broker を起動します。
### Integration event version の切り替え
```bash
INTEGRATION_EVENT_VERSIONS=v1 npm run dev -- query
INTEGRATION_EVENT_VERSIONS=v1,v2 npm run dev -- query
```

指定しない場合は `v1` だけを publish します。

### NATS local broker デモ
```bash
npm run broker:nats:up
npm run broker:nats:subscribe
```

別ターミナルで:

```bash
INTEGRATION_PUBLISHER=nats npm run dev -- worker
```

受信が確認できたら:

```bash
npm run broker:nats:down
```

必要なら subject prefix を変えられます。

```bash
NATS_SUBJECT_PREFIX=lab INTEGRATION_PUBLISHER=nats npm run dev -- worker
npm run broker:nats:subscribe -- "lab.>"
```

このデモで見たいのは、

- application は `IntegrationEventPublisherPort` しか知らない
- NATS の URL / subject / header は adapter が吸収している
- real broker に publish しても `placeOrder` / `dispatchOutbox` の形は変わらない

という点です。

### Payment gateway の切り替え
```bash
PAYMENT_GATEWAY=fake npm run dev
PAYMENT_GATEWAY=stripe-like npm run dev
PAYMENT_GATEWAY=failing npm run dev
```

指定しない場合は `console` adapter が使われます。

### CLI デモ
```bash
npm run dev
```

### Query デモ
```bash
npm run dev -- query
```

### Dispatch demo
```bash
npm run dev -- dispatch
```

> `dispatch` モードは **現在のプロセス内に pending outbox message があるとき** にそれらを配送します。  
> そのため、単独で `npm run dev -- dispatch` を実行すると in-memory 構成では `dispatchedCount: 0` になりやすいです。

**「注文を作る → outbox を dispatch する → read model から読む」流れを一発で見たい場合は、まず `query` モードを使う**のが分かりやすいです。

```bash
npm run dev -- query
```

`query` モードの中では:
1. `placeOrder`
2. `dispatchOutbox`
3. `getOrderSummary`

を順番に実行するため、eventual consistency の学習導線として自然です。

HTTP で同じ流れを見たい場合は、
1. `POST /orders`
2. `POST /dispatch-outbox`
3. `GET /orders/:id`

の順に呼んでください。

### Poller デモ
```bash
npm run dev -- poller
```

`poller` モードは、delivery worker / scheduler の入口を学ぶための軽量デモです。

- まず注文を 1 件作る
- その後 `pollOutbox` が数サイクル dispatch を試す
- pending が空になったら止まる

本物の常駐 worker ではありませんが、**request の外で delivery を回す use case** を説明するには十分です。

### Worker デモ
```bash
npm run dev -- worker
```

`worker` モードは、Sprint 7 で追加した **dedicated worker / queue consumer** の最小デモです。
同一プロセス・in-memory の教材用サンプルであり、常駐 daemon や実 broker consumer そのものではありません。
このデモでは、**request 側 → trigger enqueue → worker 側 → query 側** を 1 本のスクリプトで順番にシミュレーションします。

- まず注文を 1 件作る
- 次に `queue-message` trigger を worker consumer へ積む
- その後 dedicated worker が trigger を consume して `pollOutbox` を呼ぶ
- 成功した trigger は ack され、read model まで反映された結果を確認できる

ここで見せたいのは、

- `pollOutbox` は application use case
- worker はそれを request の外から回す orchestrator
- consumer は worker の input adapter の一種

という責務差です。

### Replay デモ
```bash
SUBSCRIBER_FAILURE_MODE=order-summary-projector-fail-once npm run dev -- replay
```

`replay` モードは、Sprint 9 で追加した **subscriber failure policy / replay / re-drive** の最小デモです。

このデモでは、

- `dispatchOutbox` 自体は成功する
- ただし `order-summary-projector` を fail-once にして subscriber failure を作る
- replay 前は read model が未反映なので `getOrderSummary` は missing になる
- `replaySubscriberFailures` 実行後に read model が回復する

という流れを 1 本で確認できます。

ここで見せたいのは、

- outbox retry は publish failure の責務
- subscriber replay は publish success 後の subscriber failure の責務
- 2 つを分けると replay の粒度を subscriber 単位にできる

という違いです。

### Batch デモ
```bash
npm run dev -- batch
```

### HTTP デモ
```bash
npm run dev -- http
```

その後、別ターミナルから:

```bash
curl -X POST http://127.0.0.1:3000/orders \
  -H 'content-type: application/json' \
  -H 'x-actor-id: admin-demo' \
  -H 'x-actor-role: admin' \
  -H 'x-request-id: demo-request-1' \
  -d '{
    "customerId": "customer-1",
    "items": [{"sku": "BOOK", "quantity": 2}],
    "idempotencyKey": "demo-1"
  }'

curl -X POST http://127.0.0.1:3000/dispatch-outbox \
  -H 'x-request-id: demo-request-1'

curl http://127.0.0.1:3000/orders/<order-id> \
  -H 'x-actor-id: admin-demo' \
  -H 'x-actor-role: admin'
```

> HTTP デモの `x-actor-*` header は **学習用の簡易 actor 注入** です。実運用の認証ではありません。実務では JWT / session / gateway 認証などで本人確認し、その結果から actor を組み立ててください。

> `x-request-id` は任意ですが、付けると place order → dispatch の observability を同じ correlation で追いやすくなります。省略した場合も adapter 側で request ID を生成します。

> observability は `[obs] ...` 形式ではなく、`kind: "telemetry"` を持つ structured JSON として出力されます。`requestId` / `correlationId` / `traceId` / running metric count を見ながら flow を追ってください。

> `node:sqlite` は Node.js 22 系の experimental 機能です。学習用には十分ですが、本番では ORM / migration / connection management まで別途検討してください。

---

## このプロジェクトで見るべきポイント

### 1. 依存方向
- `domain` は外側を知らない
- `application` は port に依存する
- `adapters` が port を実装する
- `composition-root.ts` で配線する

### 2. DTO と境界
- HTTP request をそのまま domain に渡さない
- Use Case の入力/出力モデルを意識する
- Presenter / response mapping の役割を分ける

### 3. エラー設計
- Domain の不正
- Use Case の not found / invalid request
- 外部依存の failure
- HTTP への変換

### 4. 永続化と整合性
- in-memory は学習用 adapter
- SQLite adapter は現実に一歩近い例
- PostgreSQL adapter と migration の意味
- idempotency と unit of work をどこで扱うか
- outbox で「まず durable に残す」とは何か
- dispatcher が delivery を担うとはどういう意味か
- retry / dead-letter を outbox detail としてどう持つか
- poller が request の外で delivery を回すとはどういうことか
- worker / consumer が poller を orchestration するとはどういうことか
- outbox retry と subscriber replay をなぜ分けるのか

### 5. Query side / integration event / observability
- read model をなぜ write model から分けるのか
- integration event はなぜ domain event と別に考えるのか
- integration event versioning をなぜ最初から意識するのか
- subscriber / projector を publisher と分ける意味は何か
- broker URL / subject / header をなぜ adapter に閉じるのか
- subscriber failure policy をなぜ subscriber ごとに持ちたいのか
- observability と audit log をどこで使い分けるのか
- requestId / correlationId / traceId を application でどう運び、domain contract とは分けるのか

### 6. Auth と policy placement
- current actor をどこで組み立てるか
- authorization policy をどこで評価するか
- 401 と 403 をどう分けるか

### 6. 複数 entrypoint
- 同じ use case を CLI / batch / HTTP から呼ぶ
- 入力 adapter は違っても、中核を使い回せる

---

## 学習ゴール

このプロジェクトを終えると、少なくとも次を説明できる状態を目指せます。

- Clean / Hexagonal は何の課題を解くのか
- Clean と Hexagonal はどう似ていて、何が違うのか
- Port / Adapter / Use Case / Entity / Value Object の意味
- DTO / Presenter / Mapper をどこで使うべきか
- なぜテストしやすくなるのか
- なぜ複数 entrypoint に強くなるのか
- どんなときは全面採用し、どんなときは部分採用に留めるか
- transaction / idempotency / event / persistence をどう考え始めるか
- なぜこの設計を選んだのかを人に説明できるか

---

## 次のおすすめ発展

さらに深めるなら、次は **Sprint 11〜12** をこの第1区切りの締めとして進めます。
詳細は `docs/19-sprint7-12-roadmap.md` を参照してください。

1. Sprint 11: payment workflow を saga / compensation まで広げる
   - 実装タスク分解: `docs/27-sprint11-saga-and-compensation.md`
   - 補助資料: `docs/28-retry-vs-compensation-and-transaction-boundaries.md`
2. Sprint 12: bounded context / ACL / 「フル採用か部分採用か」の判断へつなぐ

---

## 最後に

このラボの目的は、

> **構造を暗記することではなく、変更と責務に対して設計を選べるようになること**

です。

コード・文章・テストを往復しながら、最終的には**自分の言葉で人に説明できること**を目標にしてください。
