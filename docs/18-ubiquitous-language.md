# 18. Ubiquitous Language: この学習プロジェクトで揃える言葉

DDD の出発点は、クラスやフォルダより先に **言葉を揃えること** です。

このドキュメントでは、このリポジトリで使う業務用語を明文化します。
目的は、

- docs と code の用語を揃える
- 同じ言葉で違う意味を指さない
- discussion, review, implementation のズレを減らす

ことです。

---

## まず結論

DDD における Ubiquitous Language とは、

> **チーム全体で、業務を説明するときにもコードを書くときにも、同じ意味で使う言葉**

です。

これが曖昧だと、
- 会議では同じ言葉を使っているのに認識がズレる
- controller の request 名と domain の概念がズレる
- API / DB / 画面都合の言葉が core に入り込む

という問題が起きます。

---

## このリポジトリで揃える言葉

## Order
**意味:** 顧客が商品を購入するという意思を、業務上の単位として表したもの。

### このプロジェクトでの意味
- `Order` は aggregate root
- line item を持つ
- total amount を計算できる
- `order.placed` という domain event を生む

### 同義語にしないもの
- Cart
- Payment
- Shipment

`Order` は支払いそのものでも配送そのものでもありません。

---

## Order Line
**意味:** 注文の中の1商品分の明細。

### このプロジェクトでの意味
- SKU
- quantity
- unit price

を持つ、Order の内部要素です。

### 同義語にしないもの
- Product
- Inventory Record

Order Line は商品そのものではなく、**その注文における商品明細**です。

---

## Money
**意味:** 金額を amount + currency の意味で扱う value object。

### このプロジェクトでの意味
- `amountInMinor`
- `currency`

を持ちます。

### なぜ number と呼ばないのか
金額は単なる数値ではありません。
- 通貨がある
- 加算ルールがある
- currency mismatch を防ぐ必要がある

そのため `Money` という言葉を使います。

---

## Customer
**意味:** 注文主体となる顧客。

### このプロジェクトでの意味
現時点では `customerId` だけを扱います。
まだ `Customer` entity は作っていません。

### ここで伝えたいこと
今は fully-modeled customer domain ではなく、**注文側から見た識別子**として扱っています。

---

## Product Catalog
**意味:** 商品価格や商品情報を参照する外部 source。

### このプロジェクトでの意味
- `ProductCatalogPort`
- `StaticProductCatalog`

が対応します。

### 同義語にしないもの
- Inventory
- Product Master 全体

ここでは「価格を参照する窓口」に焦点を当てています。

---

## Payment
**意味:** 注文に対して代金を請求する外部処理。

### このプロジェクトでの意味
- `PaymentGatewayPort`
- `ConsolePaymentGateway`

が担当します。

### 同義語にしないもの
- Order
- Billing 全体
- Settlement

`Payment` は注文成立フローの一部であり、注文そのものではありません。

---

## Payment Confirmation
**意味:** 支払い処理が通った結果として返る確認情報。

### このプロジェクトでの意味
- `paymentConfirmationId`

として use case 結果に含めます。

---

## Idempotency Key
**意味:** 同一リクエストの再送を識別するためのキー。

### このプロジェクトでの意味
- duplicate create を避けるために使う
- 注文 API の再送耐性を高めるために使う

### 同義語にしないもの
- Order ID
- Payment Confirmation ID

これらは役割が違います。

---

## Domain Event
**意味:** 業務上意味のある出来事。

### このプロジェクトでの意味
- `order.placed`

を扱います。

### 同義語にしないもの
- log message
- trace event
- technical notification

Domain Event は、単なるログではありません。

---

## Aggregate / Aggregate Root
**意味:** 一貫性をまとめて守る境界。

### このプロジェクトでの意味
- `Order` が aggregate root
- `OrderLine` はその内側

### この言葉が必要な理由
Entity だけだと「何をまとめて守るのか」が曖昧になります。
Aggregate は、

> どこまでを1つの整合性境界として扱うか

を表す言葉です。

---

## Policy
**意味:** 業務上の判定ルール。

### このプロジェクトで今後扱う意味
- 注文可能か
- 高額注文を許可するか
- 特定条件で discount を許可するか

などの判定を、entity や controller に埋め込まず切り出すための概念です。

---

## Specification
**意味:** 再利用可能な条件表現。

### このプロジェクトで今後扱う意味
- 特定条件を満たす注文か
- premium customer 向け条件か
- 合計金額 threshold を超えるか

のような条件を組み合わせるための概念です。

---

## このプロジェクトで意図的にまだ置いていない言葉

以下は、まだ fully modeled していません。

- Inventory Reservation
- Shipment
- Invoice
- Refund
- Bounded Context
- Context Map

これらは、次の発展フェーズで導入する候補です。

---

## よくあるズレ

### 1. Order と Payment を同じものとして話してしまう
注文は業務単位、支払いはその一部の外部処理です。

### 2. Money を number として扱ってしまう
金額の意味が失われます。

### 3. Product Catalog と Inventory を混同する
価格参照と在庫管理は別責務です。

### 4. Domain Event を log と混同する
業務上意味のある出来事だけを domain event と呼びます。

---

## 人に説明するときの言い方

> Ubiquitous Language は、チーム全体で同じ言葉を同じ意味で使うための土台です。  
> Order と Payment を混同しない、Money をただの number にしない、といった揃え方を先に決めることで、docs と code と会話の意味が一致します。

---

## この章のチェックポイント

- Ubiquitous Language を一言で説明できるか？
- この repo で `Order`, `Money`, `Payment` の意味を区別して言えるか？
- 同じ言葉を曖昧に使うと何がつらいか説明できるか？
