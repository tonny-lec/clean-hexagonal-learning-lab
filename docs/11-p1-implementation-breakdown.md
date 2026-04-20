# 11. P1実装タスク分解プラン: Clean / Hexagonal + DDD の次の一歩

> **目的:** `docs/10-priority-roadmap-clean-hexagonal-and-ddd.md` の P1 を、そのまま実装できる粒度へ分解する。

このドキュメントは、次の P1 項目を **実装順・依存順・学習順** に並べ直したものです。

- Ubiquitous Language
- Aggregate 境界
- Domain Service / Policy / Specification
- PostgreSQL adapter + migration
- Outbox pattern
- Auth / authorization / policy

---

## まず結論: 実装順はこの順がよい

### フェーズ1. DDD の核を固める
1. Ubiquitous Language を明文化する
2. Aggregate 境界を docs と code で明示する
3. Domain Service / Policy / Specification を追加する

### フェーズ2. 永続化を本番寄りにする
4. PostgreSQL adapter を追加する
5. migration を追加する
6. PostgreSQL repository のテストを追加する

### フェーズ3. 整合性設計を学ぶ
7. Outbox pattern を追加する
8. event dispatcher / publisher の flow を組み替える
9. 「なぜ outbox が必要か」の docs を追加する

### フェーズ4. 認可境界を学ぶ
10. auth / current-user の input adapter を追加する
11. authorization policy を application に導入する
12. HTTP adapter から policy を通す

この順番にする理由は、

> **先に DDD のモデリングを固め、その後に persistence と consistency、最後に authorization を足すと、学習の因果関係が見えやすい**

からです。

---

# フェーズ1. DDD の核を固める

## Task 1. 用語集 (`Ubiquitous Language`) を追加する

### ゴール
このプロジェクトで使う業務用語を明文化し、コードと docs の土台を揃える。

### 追加ファイル
- `docs/18-ubiquitous-language.md`
- 可能なら `docs/glossary.md`

### 追加すべき用語候補
- Order
- Order Line
- Money
- Customer
- Product Catalog
- Payment
- Payment Confirmation
- Reservation
- Aggregate
- Domain Event
- Idempotency Key

### 完了条件
- 「同義語にしない言葉」が明記されている
- `Order` と `Payment` の境界が言語化されている
- README から導線がある

### 学習上の意味
DDD はクラス名の話ではなく、**チームで使う言葉の一貫性**から始まると理解できる。

---

## Task 2. Aggregate 境界の説明ドキュメントを追加する

### ゴール
Entity と Aggregate の違いを、今の `Order` を題材に説明できるようにする。

### 追加ファイル
- `docs/14-aggregate-boundary.md`

### 含めるべき内容
- Aggregate root とは何か
- なぜ repository は aggregate 単位で扱うのか
- `Order` はどこまでを一貫性境界として持つのか
- `InventoryReservation` や `Payment` を同じ aggregate にすべきかどうか

### 完了条件
- `Entity ≠ Aggregate` を説明できる文章になっている
- 「どこまでを1トランザクションで守るか」に言及している

---

## Task 3. `Order` に aggregate root としての意図をコードコメント/構造で明示する

### ゴール
`Order` が単なる entity ではなく、このサンプルでは aggregate root であることをコードから読めるようにする。

### 対象候補
- `src/domain/order.ts`

### やること
- aggregate root であることをコメントで明記
- `OrderLine` が aggregate 内部要素であると読み取れるようにする
- repository が `Order` 単位である理由を docs と対応づける

### 完了条件
- 初学者が `order.ts` を読んで aggregate の話に接続できる

---

## Task 4. Domain Service を追加する

### ゴール
「このルールは entity に入れるべきか？」を学べる具体例を作る。

### おすすめ題材
- `OrderPricingService`
- `OrderEligibilityService`
- `DiscountPolicyEvaluator`

### 追加ファイル候補
- `src/domain/services/order-pricing-service.ts`
- `tests/domain-services.test.ts`
- `docs/19-domain-service-policy-specification.md`

### 実装の例
- `Order` 自体は合計計算だけ持つ
- 割引計算や「特定条件なら無料配送」などは service 側で扱う

### 完了条件
- 「entity に入れすぎない」判断が示されている
- その理由を docs で説明している

---

## Task 5. Policy を追加する

### ゴール
業務ルールのうち、「判定」を明示的に分離する。

### おすすめ題材
- 高額注文は特定顧客のみ許可
- 1注文あたりの上限金額
- SKU の組み合わせ制限

### 追加ファイル候補
- `src/domain/policies/order-placement-policy.ts`
- `tests/order-policy.test.ts`

### 完了条件
- policy の責務が entity / use case と分離されている
- 「controller に書くべきでない理由」が説明できる

---

## Task 6. Specification を追加する

### ゴール
複数条件を組み合わせた業務ルールを、再利用可能な形で表現する。

### 追加ファイル候補
- `src/domain/specifications/*.ts`
- `tests/order-specification.test.ts`

### おすすめ仕様例
- Premium customer かつ total amount > threshold
- 特定カテゴリ SKU を含む注文だけ対象

### 完了条件
- policy と specification の違いを docs で説明できる

---

# フェーズ2. 永続化を本番寄りにする

## Task 7. PostgreSQL adapter の設計を決める

### ゴール
SQLite から PostgreSQL へ移るとき、何が変わるかを整理する。

### 追加ファイル
- `docs/11-postgres-and-migrations.md`

### 含めるべき論点
- connection lifecycle
- schema / migration
- idempotency record のテーブル設計
- outbox と同居するときの transaction

### 完了条件
- 先に設計 docs がある
- どのテーブルが必要か明記されている

---

## Task 8. PostgreSQL repository adapter を実装する

### ゴール
本番寄り persistence adapter を追加する。

### 追加ファイル候補
- `src/adapters/postgres/postgres-order-repository.ts`

### 含めるべき責務
- `OrderRepositoryPort` 実装
- `findById`
- `save`
- `findByIdempotencyKey`
- row ↔ domain mapping

### 完了条件
- domain は PostgreSQL を知らない
- SQL / DB 都合は adapter に閉じている

---

## Task 9. migration を追加する

### ゴール
schema をコード管理する感覚を学ぶ。

### 追加ファイル候補
- `db/migrations/001_create_orders.sql`
- `db/migrations/002_create_idempotency_records.sql`
- 将来用に `003_create_outbox.sql`

### 完了条件
- README か docs に migration 実行手順がある
- 「なぜ migration は adapter / infrastructure 側なのか」を説明している

---

## Task 10. PostgreSQL adapter のテストを追加する

### ゴール
repository adapter もテスト戦略の対象であると学ぶ。

### 追加ファイル候補
- `tests/postgres-order-repository.test.ts`

### 完了条件
- save / find / idempotency の基本が通る
- in-memory / SQLite / PostgreSQL の比較材料になる

---

# フェーズ3. 整合性設計を学ぶ

## Task 11. Outbox pattern の docs を追加する

### ゴール
「なぜ domain event を即 publish するだけでは危ないのか」を言語化する。

### 追加ファイル候補
- `docs/12-outbox-and-consistency.md`

### 含めるべき内容
- save succeeded / publish failed の問題
- outbox table の役割
- integration event と domain event の関係
- eventual consistency

### 完了条件
- outbox の必要性を 1〜3 分で説明できる文書になっている

---

## Task 12. Outbox port を追加する

### ゴール
application から outbox 保存を抽象化する。

### 追加ファイル候補
- `src/application/ports/outbox-port.ts`

### 完了条件
- outbox が単なる detail ではなく、整合性設計の一部であると分かる構造になっている

---

## Task 13. PostgreSQL outbox adapter を追加する

### ゴール
transaction 内で domain event を outbox table に保存する。

### 追加ファイル候補
- `src/adapters/postgres/postgres-outbox.ts`

### 完了条件
- order save と outbox write を同一 transaction で扱える

---

## Task 14. `placeOrder` の event flow を outbox 前提に調整する

### ゴール
「publish する」から「まず durable に残す」へ flow を変える。

### 対象候補
- `src/application/use-cases/place-order.ts`
- `src/composition-root.ts`

### 完了条件
- sync publish と outbox persist の役割差が明確
- docs に対応説明がある

---

# フェーズ4. Auth / Authorization / Policy を学ぶ

## Task 15. current-user / actor モデルを追加する

### ゴール
誰が use case を実行するかを command に持ち込めるようにする。

### 追加ファイル候補
- `src/application/dto/actor-dto.ts`
- `src/adapters/http/auth-middleware.ts`

### 完了条件
- HTTP adapter が current user を組み立てられる
- use case が必要に応じて actor を受け取れる

---

## Task 16. Authorization policy を application 側に追加する

### ゴール
認可判断を controller にベタ書きしない構造を作る。

### 追加ファイル候補
- `src/application/policies/order-authorization-policy.ts`
- `tests/order-authorization-policy.test.ts`
- `docs/13-auth-and-policy-placement.md`

### 扱うルール例
- admin は全注文を見られる
- customer は自分の注文だけ見られる
- high-value order は privileged role のみ作成できる

### 完了条件
- auth と authorization の違いを説明できる
- policy を use case 呼び出し前後のどこで評価するかが明確

---

## Task 17. HTTP adapter で auth -> policy -> use case の流れを作る

### ゴール
input adapter が何を担い、どこから先は application の責務かを明示する。

### 対象候補
- `src/adapters/http/place-order-http-handler.ts`
- `src/adapters/http/get-order-http-handler.ts`

### 完了条件
- request parsing
- current-user 取得
- policy evaluation
- use case execution
- response mapping

の役割が混ざっていない

---

# 実装時のルール

## ルール1. docs -> test -> code の順で進める
このプロジェクトは学習プロジェクトなので、**「なぜやるか」を docs に書いてから、test と code に入る**ほうが理解が定着しやすいです。

## ルール2. 1テーマごとに必ず「説明できるようになったこと」を書く
各 docs の最後に、

- 何が説明できるようになったか
- 何がまだ未解決か

を書くと、理解の境界が見えます。

## ルール3. 変更ごとに oral exam を更新する
P1 を進めたら `docs/09-oral-exam-checklist.md` に質問を追加してください。

---

# 推奨する最初の3スプリント

## Sprint 1
- Task 1: Ubiquitous Language
- Task 2: Aggregate docs
- Task 3: Order aggregate root 明示
- Task 4: Domain Service
- Task 5: Policy

## Sprint 2
- Task 6: Specification
- Task 7: PostgreSQL docs
- Task 8: PostgreSQL repository
- Task 9: migration
- Task 10: PostgreSQL tests

## Sprint 3
- Task 11: Outbox docs
- Task 12: outbox port
- Task 13: postgres outbox
- Task 14: placeOrder flow 調整
- Task 15〜17: auth / authorization / policy

---

# いま一番おすすめの着手点

もし次に本当に実装へ進むなら、最初はこれです。

1. `docs/18-ubiquitous-language.md`
2. `docs/14-aggregate-boundary.md`
3. `src/domain/services/order-pricing-service.ts`
4. `src/domain/policies/order-placement-policy.ts`

理由は、ここをやると DDD が**クラス名の暗記**から**設計判断の道具**に変わるからです。

---

## 一言まとめ

P1 を実装タスクに分解すると、重要なのは

> **先に DDD の核（言葉・境界・ルール）を固め、その後に persistence・consistency・auth を足すこと**

です。

この順で進めると、Clean / Hexagonal と DDD が別々の知識ではなく、**ひとつの設計思考としてつながって理解できます。**
