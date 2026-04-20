# 02. 用語の定義と全体像

このドキュメントの目的は、Clean / Hexagonal を聞いたときに混乱しやすい用語を整理することです。

---

## まず結論: Clean と Hexagonal は何が違うのか

### Hexagonal Architecture
- 別名: Ports and Adapters
- 主眼: **アプリケーションの中核を、外部との接続点から分離すること**
- キーワード: Port, Adapter

### Clean Architecture
- 主眼: **依存方向を内側へ向けること**
- キーワード: Entity, Use Case, Interface Adapter, Frameworks & Drivers

### 実務上の捉え方
現場では、かなり重なって使われます。

- Hexagonal は「外部との接続」の見方が強い
- Clean は「レイヤーと依存ルール」の見方が強い

なので、

> Hexagonal = 接続の視点
> Clean = 依存方向の視点

と捉えると分かりやすいです。

---

## 中心用語

## Domain
業務そのものの知識を表す領域です。

例:
- 注文
- 顧客
- 金額計算
- 予約可否ルール

ここには、
- フレームワーク知識
- HTTP 知識
- DB 接続知識

を持ち込まないのが基本です。

### このプロジェクトでは
- `src/domain/order.ts`

---

## Entity
業務上の重要な概念を表すオブジェクトです。
長く残るルールや不変条件を持つことが多いです。

例:
- Order
- Customer
- Invoice

### このプロジェクトでは
`Order` が Entity 的な役割を持っています。

- 注文は空にできない
- 数量は 0 以下にできない
- 合計金額を計算できる

---

## Use Case / Application Service
「ユーザーやシステムが何をしたいか」を表す処理です。

例:
- 注文する
- 支払いを確定する
- 在庫を引き当てる

Use Case は、
- ドメインを使い
- 必要な port を呼び
- 業務フローを組み立てます

### このプロジェクトでは
- `src/application/use-cases/place-order.ts`

---

## Port
外部とのやり取りを抽象として定義したものです。

要するに、

> 「アプリケーションが外に何をしてほしいか」を宣言したインターフェース

です。

例:
- 価格を取得したい
- 注文を保存したい
- 支払いを実行したい

### このプロジェクトでは
- `ProductCatalogPort`
- `OrderRepositoryPort`
- `PaymentGatewayPort`

---

## Adapter
Port を実装する具体物です。

たとえば:
- PostgreSQL で保存する
- Stripe で支払う
- CLI 入力をコマンドオブジェクトに変換する
- REST API リクエストをユースケース呼び出しに変換する

### このプロジェクトでは
- `InMemoryOrderRepository`
- `StaticProductCatalog`
- `ConsolePaymentGateway`

---

## Dependency Rule
Clean Architecture の核心です。

> **依存は外側から内側へ向かってはいけない。内側のルールを外側が参照する。**

言い換えると:
- ドメインは外部都合を知らない
- ユースケースは port を知ってよいが、実装詳細は知らない
- アダプターは内側に合わせる

---

## Composition Root
実際の実装を配線する場所です。

例:
- どの repository 実装を使うか
- どの payment adapter を使うか
- どの controller がどの use case を呼ぶか

### このプロジェクトでは
- `src/index.ts`

ここで、
- in-memory repository
- static catalog
- console payment gateway

を組み立てています。

---

## 全体像の図

```text
[ CLI / API / Batch / UI ]
           |
           v
      [ Adapters ]
           |
           v
   [ Use Cases / Ports ]
           |
           v
        [ Domain ]
```

依存の意識はこうです。

```text
outer details  ----implement/call---->  ports
adapters       ----depend on--------->  application/domain
application    ----depend on--------->  domain
domain         ----depend on--------->  nobody outside
```

---

## ありがちな対応関係

| 現場のもの | Clean / Hexagonal での見方 |
|---|---|
| Controller | 入力アダプター |
| Presenter / Response mapper | 出力アダプター |
| Repository interface | Port |
| ORM 実装 | Adapter |
| Stripe client wrapper | Adapter |
| Use case service | Application / Use Case |
| Entity / Aggregate | Domain |

---

## このサンプルをどう読むか

### 1. `Order` を見る
何が業務ルールかを確認する。

### 2. `placeOrder` を見る
業務フローがどこに書かれているかを見る。

### 3. `ports/` を見る
外に依頼している内容を確認する。

### 4. `adapters/` を見る
ポートがどう実装されるかを見る。

### 5. `index.ts` を見る
最終的にどう接続されるかを見る。

---

## 一言で説明するなら

### Hexagonal を一言で
> アプリの中心を port と adapter で外界から守る設計

### Clean を一言で
> 依存方向を内側に保ち、業務ルールを中心に置く設計

### まとめて言うなら
> 業務の中心を守るために、依存方向と接続点を意識して設計する考え方
