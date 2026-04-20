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
- **Application**: `placeOrder`, `getOrderSummary`
- **Ports**: catalog / repository / payment / event publisher / unit of work
- **Adapters**:
  - in-memory
  - SQLite
  - console payment
  - HTTP handlers
  - CLI presenter
  - batch runner
- **DTO / mapping**
- **Error design の入口**
- **Idempotency と transaction boundary の入口**
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
- **Application / Use Case**: `placeOrder`, `getOrderSummary`
- **Ports**: `ProductCatalogPort`, `OrderRepositoryPort`, `PaymentGatewayPort`, `DomainEventPublisherPort`, `UnitOfWorkPort`
- **Adapters**: in-memory / SQLite / console / HTTP / CLI / batch
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
      ports/
      use-cases/
    adapters/
      batch/
      cli/
      console/
      http/
      in-memory/
      presenters/
      sqlite/
    composition-root.ts
    index.ts
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

### CLI デモ
```bash
npm run dev
```

### Query デモ
```bash
npm run dev -- query
```

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
  -d '{
    "customerId": "customer-1",
    "items": [{"sku": "BOOK", "quantity": 2}],
    "idempotencyKey": "demo-1"
  }'

curl http://127.0.0.1:3000/orders/<order-id>
```

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
- idempotency と unit of work をどこで扱うか
- outbox や saga まで必要になる境界はどこか

### 5. 複数 entrypoint
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

さらに深めるなら、次の順で拡張すると理解が定着します。

1. PostgreSQL adapter + migration を追加する
2. Stripe / Fake / Failure の 3 種類の payment adapter を作る
3. Outbox pattern を追加して event 発行の失敗に備える
4. 認証・認可を input adapter 側で扱う例を追加する
5. Query side を read model 分離に発展させる
6. 「この案件ではフル採用か部分採用か」を題材ごとに比較する

---

## 最後に

このラボの目的は、

> **構造を暗記することではなく、変更と責務に対して設計を選べるようになること**

です。

コード・文章・テストを往復しながら、最終的には**自分の言葉で人に説明できること**を目標にしてください。
