# 14. Aggregate Boundary: どこまでを1つの整合性境界として守るのか

この章では、Entity の次に理解すべき **Aggregate** を扱います。

この学習プロジェクトでは、`Order` を aggregate root として読み解けるようにするのが目的です。

---

## まず結論

Aggregate とは、

> **一貫性をまとめて守る単位**

です。

そして Aggregate Root は、

> **その境界の入口になる代表オブジェクト**

です。

DDD では「Entity が何か」だけでなく、

- どこまでを一緒に変更してよいか
- どこまでを1トランザクションで守りたいか
- 外部からどこを入口に参照・変更させるか

を決める必要があります。

---

## Entity と Aggregate は何が違うのか

### Entity
- identity を持つ
- 業務上重要な概念
- 例: Order

### Aggregate
- 整合性をまとめて守る境界
- 複数の entity / value object を内包できる
- 外部からは aggregate root を入口に扱う

つまり、

> **Entity は概念、Aggregate は境界**

と捉えると分かりやすいです。

---

## このプロジェクトでは何が Aggregate か

このプロジェクトでは、`Order` を aggregate root として扱います。

### `Order` が持つもの
- `id`
- `customerId`
- `lines`
- total amount 計算
- placed event 発行

### `OrderLine` の位置づけ
- `Order` の内側にある要素
- 単独 repository を持たない
- 単独で保存・参照する主役ではない

したがって、このサンプルでは:

```text
Order (Aggregate Root)
  └─ OrderLine (Aggregate 内部要素)
```

という形です。

---

## なぜ `Order` を Aggregate Root とみなすのか

### 理由1. 注文の整合性を1か所で守りたいから
このプロジェクトでは、注文の妥当性として少なくとも:
- line が1件以上ある
- quantity は正である
- total amount を計算できる

を守りたいです。

これらは注文という単位で意味を持ちます。

### 理由2. 保存も参照も `Order` 単位だから
repository は `OrderRepositoryPort` であり、`OrderLineRepositoryPort` ではありません。

これは、

> 「このサンプルでは一貫性と永続化の単位を Order に置いている」

という設計判断です。

### 理由3. Domain Event も `Order` から生まれるから
`order.placed` は line 単体ではなく、**注文全体が成立した**出来事です。

---

## どこまでを1トランザクションで守るか

Aggregate を考えるときに大事なのは、

> **何を一度に整合させる必要があるか**

です。

このサンプルでは、少なくとも `Order` 自体の一貫性は1つの境界にまとめています。

ただし、ここで注意があります。

### `Payment` まで同じ Aggregate にしない理由
支払いは外部 gateway を使う処理です。

もし `Order` と `Payment` を1つの aggregate として扱うと、
- 外部システム都合が core に強く入り込みやすい
- aggregate の責務が膨らむ
- transaction / consistency が複雑になる

ことがあります。

このサンプルでは、支払いは `PaymentGatewayPort` 越しの外部 detail として扱っています。

---

## `InventoryReservation` を同じ Aggregate にすべきか？

学習が進むと、よく出る問いです。

### 同じ Aggregate にしないほうがよいことが多い理由
- 在庫は別責務
- 注文と在庫予約は別の変更頻度・別の関心を持ちやすい
- 別 aggregate / 別 context にしたほうが整理しやすい

つまり、

- 注文を確定する
- 在庫を引き当てる

は、同時に起きることはあっても、**同じ aggregate にすべきとは限らない**です。

---

## Repository が Aggregate 単位になる理由

DDD では repository はしばしば aggregate 単位になります。

このサンプルでも、
- `OrderRepositoryPort.save(order)`
- `findById(orderId)`

という形です。

ここから学べることは:

- repository は「DB table wrapper」ではない
- aggregate を再構築できる境界である
- persistence detail を隠すための抽象でもある

という点です。

---

## このサンプルで Aggregate を深める次の一歩

### 1. `Order` に aggregate root である意図をコメントや docs でさらに明示する

### 2. `OrderPricingService` のような domain service を入れて、
- aggregate 内に置くべきもの
- aggregate 外へ出すべきもの

を比較する

### 3. `InventoryReservation` を仮想的に登場させて、
- 同じ aggregate にする案
- 別 aggregate にする案

を比較する

---

## よくある誤解

### 1. Entity があれば Aggregate は不要
違います。Entity だけでは「どこまでをまとめて守るか」が決まりません。

### 2. Aggregate は大きいほどよい
違います。大きすぎる aggregate は変更しづらく、整合性コストが高くなります。

### 3. 外部連携先も Aggregate に含めるべき
違います。外部 gateway や DB は detail であり、aggregate そのものとは別です。

---

## 人に説明するときの言い方

> Aggregate は、Entity をただ並べる考え方ではなく、どこまでを一貫性の単位として守るかを決める考え方です。  
> このプロジェクトでは Order を aggregate root として扱い、OrderLine はその内部要素です。  
> 一方で Payment のような外部処理は aggregate の外に置き、port 越しに扱っています。

---

## この章のチェックポイント

- Entity と Aggregate の違いを説明できるか？
- なぜ `Order` を aggregate root とみなすのか説明できるか？
- なぜ `Payment` を同じ aggregate にしないのか説明できるか？
- なぜ repository は aggregate 単位になりやすいのか説明できるか？
