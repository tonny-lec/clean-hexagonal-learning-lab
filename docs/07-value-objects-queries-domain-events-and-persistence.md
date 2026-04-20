# 07. Value Object / Query / Domain Event / Persistence をどう学ぶか

この章では、Entity を理解した次に出てくる概念をまとめます。

---

## 1. Value Object

このラボでは `Money` を追加しています。

### なぜ number ではなく Value Object にするのか
もし金額をただの `number` で持つと:
- 単位が分からない
- currency mismatch を防ぎにくい
- 加算や乗算のルールが散らばる

`Money` にすると:
- amount と currency を一緒に扱える
- 足し算のルールを内側に閉じ込められる
- domain の意味がコードに出る

---

## 2. Query side

学習初期は command 系ばかり見がちですが、実務では query も重要です。

このラボでは:
- `placeOrder` = command side
- `getOrderSummary` = query side

を分けています。

### なぜ分けるのか
- 更新と参照では関心が違う
- query のほうが薄くてよいことが多い
- read model 最適化に発展しやすい

---

## 3. Domain Event

このラボでは `Order.place()` が `order.placed` event を生成します。

### Domain event の役割
- 「業務上、意味のある出来事」を表す
- 後続処理へつなげる
- domain の中で起きたことを明示する

### 何がうれしいか
- use case 内の後続処理を疎結合にしやすい
- 通知、監査、連携のきっかけにできる
- outbox pattern へ発展しやすい

---

## 4. Persistence の現実

このラボでは repository adapter を 2 種類用意しています。

- `InMemoryOrderRepository`
- `SqliteOrderRepository`

### 学習上の意味
- in-memory で port / adapter の本質を見る
- SQLite で現実に少し近づく

### ただし本番ではまだ足りないもの
- migration
- connection lifecycle
- transaction strategy
- index 設計
- ORM と domain のズレへの対処

---

## Value Object / Entity / DTO の違い

### Value Object
- identity より意味が大事
- 例: Money

### Entity
- identity を持つ
- 例: Order

### DTO
- 境界をまたぐためのデータ表現
- 例: `PlaceOrderResultDto`, `OrderSummaryDto`

これを混ぜると設計が分かりにくくなります。

---

## よくある失敗

### 1. なんでも Entity にする
意味のまとまりで考えると、Value Object のほうが自然なことがあります。

### 2. Query まで過剰に重くする
参照系は、更新系よりシンプルでよいことも多いです。

### 3. Domain event をただのログ代わりにする
「業務上意味がある出来事」だけを event にする意識が大事です。

### 4. SQLite adapter があるから persistence を理解したと思ってしまう
それは入口です。現実には transaction・migration・schema evolution が次に来ます。

---

## 人に説明するときの言い方

> Entity だけでなく Value Object を使うと、業務上の意味をコードに閉じ込めやすくなります。  
> Query を分けると、更新と参照の責務差が見えます。  
> Domain event は、業務上起きた出来事を表し、後続処理への橋になります。  
> Persistence adapter は内側を守るための詳細実装で、in-memory と SQLite を差し替えられるのが学習ポイントです。

---

## この章のチェックポイント

- number ではなく Money を置く価値を説明できるか？
- command と query を分ける理由を説明できるか？
- domain event が何を表すか説明できるか？
- repository adapter がなぜ差し替え可能であるべきか説明できるか？
