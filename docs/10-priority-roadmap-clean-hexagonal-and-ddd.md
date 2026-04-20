# 10. 優先順位付きロードマップ: Clean / Hexagonal + DDD をどこから深めるか

このドキュメントは、この学習プロジェクトを **次にどう拡張すれば理解が深まるか** を、優先順位付きで整理したロードマップです。

対象は 2 つです。

1. **Clean / Hexagonal Architecture をさらに実務寄りに理解する**
2. **DDD (Domain-Driven Design) を自分で人に説明できるレベルまで引き上げる**

---

## まず結論: 次に何からやるべきか

優先順位は次の通りです。

### P1. すぐ着手すべき
- Aggregate と境界の理解
- Domain Service / Policy / Specification
- PostgreSQL adapter + migration
- Outbox pattern の入口
- Auth / authorization / policy の配置

### P2. 次にやると理解が一段深まる
- CQRS 的な read model 分離
- retry / timeout / resilience
- observability (logging / metrics / tracing)
- anti-corruption layer
- application service と domain service の境界整理

### P3. 上級編としてやると強い
- Saga / compensation
- message broker adapter
- 複数 bounded context の分割
- Event Storming 的なモデリング演習
- 戦略的 DDD (Context Map, Ubiquitous Language の衝突整理)

---

## 今のリポジトリがどこまで来ているか

すでにこの repo で扱えていること:

- Domain / Entity / Value Object
- Use Case
- Port / Adapter
- DTO / Presenter / HTTP adapter
- Command と Query の基本
- Domain event の入口
- Error design の基本
- Idempotency の入口
- In-memory / SQLite の差し替え
- CLI / Batch / HTTP の複数 entrypoint
- 自分で説明するための docs と oral exam

つまり今は、

> **Clean / Hexagonal の基礎〜中級入口 + DDD の超入門入口**

まで来ています。

まだ弱いのは、

- DDD のモデリング深度
- transaction / consistency の実務感
- 複数コンテキストや統合時の設計

です。

---

# Part A. Clean / Hexagonal を深めるロードマップ

## P1-1. PostgreSQL adapter + migration を追加する

### 目的
SQLite の学習用サンプルから、**本番寄りの persistence** を理解するため。

### これで学べること
- repository adapter の現実
- migration の必要性
- schema evolution
- persistence detail を内側から分離する意味

### 追加候補
- `src/adapters/postgres/postgres-order-repository.ts`
- `db/migrations/`
- `docs/11-postgres-and-migrations.md`

### 説明できるようになること
- なぜ in-memory だけでは足りないのか
- なぜ migration は adapter 側の責務なのか
- ORM / SQL と domain model をどう切るのか

### 優先度
**最優先**

---

## P1-2. Outbox pattern を追加する

### 目的
Domain event を「ただ出す」から、**整合性を意識して扱う**へ進むため。

### これで学べること
- save と publish をどう一貫させるか
- event をどこまで domain / application / infrastructure で分けるか
- eventual consistency の入口

### 追加候補
- `src/application/ports/outbox-port.ts`
- `src/adapters/postgres/postgres-outbox.ts`
- `docs/12-outbox-and-consistency.md`

### 説明できるようになること
- なぜ domain event を即 publish するだけでは危ないのか
- outbox が何を守るのか

### 優先度
**最優先**

---

## P1-3. Auth / Authorization / Policy を追加する

### 目的
「誰がその use case を実行してよいか」を、HTTP や UI に埋めずに扱うため。

### これで学べること
- 認証と認可の違い
- policy をどこに置くか
- application service と domain rule の境界

### 追加候補
- `src/application/policies/order-policy.ts`
- `src/adapters/http/auth-middleware.ts`
- `docs/13-auth-and-policy-placement.md`

### 説明できるようになること
- auth は detail で、authorization は core に近い場合があること
- policy を controller に書くと何がつらいか

### 優先度
**最優先**

---

## P1-4. Aggregate 境界を明示する

### 目的
Entity 単体の理解から、**整合性を守る境界**の理解へ進むため。

### これで学べること
- aggregate root
- 一度に整合性を守る範囲
- repository が aggregate 単位になる理由

### 追加候補
- `docs/14-aggregate-boundary.md`
- `src/domain/order.ts` の説明強化
- 可能なら `InventoryReservation` など別集約候補の比較例

### 説明できるようになること
- Entity と Aggregate の違い
- どこまでを1トランザクションで守るか

### 優先度
**最優先**

---

## P2-1. CQRS 的な read model 分離

### 目的
`getOrderSummary` を足がかりに、**command と query の設計差**をはっきり学ぶため。

### これで学べること
- query は domain と同じ重さでなくてよいこと
- read model の最適化
- 更新系と参照系の関心分離

### 追加候補
- `src/application/queries/`
- `src/adapters/read-models/`
- `docs/15-cqrs-and-read-model.md`

### 優先度
**高**

---

## P2-2. Retry / timeout / resilience

### 目的
外部依存が壊れる前提で設計を考えるため。

### これで学べること
- retry をどこに置くか
- timeout の責務
- circuit breaker の必要性
- resilience が use case を汚さない形

### 追加候補
- `src/adapters/payment/retrying-payment-gateway.ts`
- `docs/16-resilience-and-adapter-boundaries.md`

### 優先度
**高**

---

## P2-3. Observability

### 目的
実務システムとして、観測可能性をどう境界に置くかを学ぶため。

### これで学べること
- logging / metrics / tracing の責務
- domain event と observability event の違い
- adapter で包む感覚

### 追加候補
- `src/adapters/observability/`
- `docs/17-observability-in-clean-architecture.md`

### 優先度
**高**

---

## P3-1. Saga / compensation

### 目的
複数 external system を跨ぐ整合性を深く理解するため。

### これで学べること
- distributed consistency
- compensation action
- local transaction と saga の違い

### 優先度
**上級**

---

## P3-2. Message broker adapter

### 目的
HTTP 以外の integration entrypoint / exitpoint を本格的に扱うため。

### これで学べること
- async integration
- consumer / publisher adapter
- at-least-once delivery 前提の設計

### 優先度
**上級**

---

# Part B. DDD を説明できるレベルにするロードマップ

## まず結論
DDD を「自分で説明できる」ようになるには、次の順で深めるのが効率的です。

1. Ubiquitous Language
2. Entity / Value Object / Aggregate
3. Domain Service / Policy / Specification
4. Repository と Aggregate の関係
5. Domain Event
6. Bounded Context / Context Map
7. Anti-Corruption Layer
8. Strategic DDD

---

## P1-D1. Ubiquitous Language を導入する

### 目的
DDD の出発点である「同じ言葉で話す」を、コードと docs に反映するため。

### これで学べること
- 用語のズレが設計のズレを生むこと
- business term と code term を揃える価値

### 追加候補
- `docs/18-ubiquitous-language.md`
- `docs/glossary.md`

### やることの例
- `order`, `payment`, `reservation`, `confirmation` などの用語を定義
- 「何を同義語にしないか」を明記

### 優先度
**最優先**

---

## P1-D2. Aggregate をきちんと扱う

### 目的
DDD の中核理解を深めるため。

### これで学べること
- aggregate root
- consistency boundary
- 他 aggregate とは ID 参照に留める感覚

### 優先度
**最優先**

---

## P1-D3. Domain Service / Policy / Specification を追加する

### 目的
「このルールは entity に置くべきか？」を説明できるようにするため。

### これで学べること
- entity に入れすぎない判断
- domain service の意味
- policy / specification の使い所

### 追加候補
- `src/domain/services/`
- `src/domain/policies/`
- `docs/19-domain-service-policy-specification.md`

### 具体例
- 割引判定
- 注文可否判定
- 支払い前チェック

### 優先度
**最優先**

---

## P2-D1. Repository と DDD の関係を整理する

### 目的
repository をただの DB abstraction で終わらせず、**aggregate persistence** として説明できるようにするため。

### これで学べること
- repository は aggregate 単位
- query model と repository の違い
- DAO との違い

### 優先度
**高**

---

## P2-D2. Domain Event を DDD 文脈で説明できるようにする

### 目的
「イベントを出す」から「業務上意味のある出来事」を説明できるようにするため。

### これで学べること
- technical event と domain event の違い
- event storming への接続
- integration event との違い

### 優先度
**高**

---

## P2-D3. Bounded Context を導入する

### 目的
大きいシステムで DDD を語るために不可欠だからです。

### これで学べること
- 同じ「注文」でも文脈が違えば意味が違う
- 複数チーム・複数サブシステム時の分割
- Context Map の入口

### 追加候補
- `docs/20-bounded-context-and-context-map.md`
- `examples/contexts/`

### 優先度
**高**

---

## P3-D1. Anti-Corruption Layer を追加する

### 目的
外部システムの汚いモデルを、自分のモデルへ直接流し込まない設計を学ぶため。

### これで学べること
- integration の現実感
- translated model
- 外部都合を bounded context 内へ持ち込まない感覚

### 優先度
**上級**

---

## P3-D2. Strategic DDD を学ぶ

### 目的
DDD をクラス設計の話で終わらせず、**組織と文脈の設計**として説明できるようにするため。

### これで学べること
- Core Domain
- Supporting / Generic Subdomain
- Team boundary と model boundary の関係
- Context Map

### 優先度
**上級**

---

# Part C. どこから追加すべきか — 推奨実装順

## フェーズ1: 今すぐやる
1. `docs/18-ubiquitous-language.md`
2. `docs/14-aggregate-boundary.md`
3. `docs/19-domain-service-policy-specification.md`
4. PostgreSQL adapter + migration
5. Outbox pattern
6. Auth / policy

### 理由
このフェーズで、
- Clean / Hexagonal の実務感
- DDD の基礎語彙
- Entity から Aggregate への理解

が一気につながります。

---

## フェーズ2: 次にやる
7. CQRS / read model 分離
8. resilience (retry / timeout)
9. observability
10. repository と aggregate の関係を docs 強化
11. bounded context / context map

### 理由
ここで「単一 use case の学習ラボ」から「現実的なシステム設計」へ進めます。

---

## フェーズ3: 上級編
12. anti-corruption layer
13. message broker adapter
14. saga / compensation
15. strategic DDD
16. event storming 的ワークショップ資料

### 理由
ここまで行くと、単にコード構造を説明するだけでなく、
**組織・システム統合・分割戦略まで話せる**ようになります。

---

# Part D. 「人に説明できるレベル」のゴールを DDD まで広げるとどうなるか

DDD について説明できるようになったと言えるラインは、次です。

## 最低ライン
- Entity / Value Object / Aggregate を区別して説明できる
- Ubiquitous Language の意味を説明できる
- Domain Service / Repository / Domain Event の役割を説明できる

## 中級ライン
- Bounded Context の必要性を説明できる
- なぜ 1つの巨大モデルにしないのか説明できる
- Context Map / ACL の価値を説明できる

## 強いライン
- ある業務ドメインを見て、
  - 何が Core Domain か
  - どこで bounded context を切るか
  - どこで anti-corruption layer が必要か
  - Clean / Hexagonal をどこまで採用すべきか

を理由付きで話せる

---

# Part E. 最後に: 今のあなた向けのおすすめ

いまのこの repo の状態から次に一番効くのは、次の 3 つです。

## おすすめ順
1. **Aggregate + Ubiquitous Language + Domain Service / Policy を docs + code で追加する**
2. **PostgreSQL adapter + migration + outbox を追加する**
3. **Bounded Context / ACL / Strategic DDD を docs 中心で追加する**

この順だと、
- まず DDD の核をつかみ
- 次に実務インフラとの接続を学び
- 最後に大規模設計へ広げる

というきれいな流れになります。

---

## 一言まとめ

この repo の次の成長方向は、

> **Clean / Hexagonal の構造理解を、DDD のモデリング力と、実務の整合性設計へつなぐこと**

です。

もし次に実装まで進めるなら、私のおすすめは

> **P1-D1 / P1-D2 / P1-D3（Ubiquitous Language / Aggregate / Domain Service & Policy）から始める**

です。  
ここをやると、DDD が「用語集」ではなく「設計の道具」になります。
