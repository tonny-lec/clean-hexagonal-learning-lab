# 05. 入力アダプター / 出力アダプター / DTO / Mapper はどこで効くのか

この章では、Clean / Hexagonal の初学者が次に引っかかりやすいポイントを扱います。

- request をそのまま use case に渡してよいのか
- domain object をそのまま JSON にしてよいのか
- controller / presenter / mapper は本当に必要なのか

---

## まず結論

### 入力アダプターがやること
- HTTP / CLI / Batch などの外側の入力形式を受け取る
- 必要なら parse / validate する
- use case の入力モデルへ変換する

### 出力アダプターがやること
- use case の結果を受け取る
- HTTP response / CLI text / batch result へ変換する

### DTO / mapper が必要になる理由
- 外側の都合を内側に持ち込みすぎないため
- domain model を外部表現に引きずられないため
- 変更点を境界に閉じ込めるため

---

## このプロジェクトでの対応

### 入力アダプター
- `src/adapters/http/place-order-http-handler.ts`
- `src/adapters/http/get-order-http-handler.ts`
- `src/adapters/cli/order-cli.ts`
- `src/adapters/batch/place-order-batch.ts`

### 出力アダプター / presenter
- `src/adapters/presenters/order-presenter.ts`

### DTO
- `src/application/dto/order-dto.ts`

---

## request をそのまま渡すと何がつらいのか

たとえば Web アプリでありがちなのは、controller が受け取った JSON をそのまま use case や domain に流す形です。

つらさ:
- HTTP 都合の nullable / string / snake_case が中に漏れる
- バリデーション責務があいまいになる
- 外側の都合でドメインモデルが歪む

この問題を避けるために、

> request model → command / query → domain

の変換を意識します。

---

## このラボの place order の流れ

```text
HTTP body
  -> handlePlaceOrderHttp()
  -> PlaceOrderCommand
  -> placeOrder()
  -> PlaceOrderResultDto
  -> HTTP response body
```

ここで重要なのは、`Order` を直接 HTTP request と結びつけていないことです。

---

## Presenter は何のためにあるのか

初心者が混乱しやすいのは、

> use case が結果を返せば十分では？

という点です。

もちろん小さな例ではそれでも動きます。
ただし実務では、同じ use case を:
- HTTP JSON
- CLI text
- CSV export
- message queue payload

のように複数形式で出したくなります。

そのとき presenter / response mapper を分けておくと、
**出力形式の変更を use case に持ち込まずに済みます。**

このラボでは `presentPlaceOrderResultForCli()` と `presentOrderSummaryForCli()` がその最小例です。

---

## DTO を置くべき典型例

### 1. 外部 API 向け JSON が domain と一致しない
例:
- 外では `amount: 2650`
- 内では `Money { amountInMinor, currency }`

### 2. domain object に外へ見せたくない情報がある
例:
- 内部状態
- domain event バッファ
- ORM 依存情報

### 3. input/output で必要な情報量が違う
例:
- command は最小入力
- response は計算済み情報付き

---

## どこまで分けるべきか

### 小さいシステム
- request parsing
- use case 呼び出し
- simple response mapping

だけで十分なことが多いです。

### 大きいシステム
- request DTO
- validator
- command mapper
- use case
- presenter
- response DTO

まで分ける価値が出ます。

重要なのは、

> **最初から全部揃えることではなく、境界が痛くなったところから切ること**

です。

---

## よくある失敗

### 1. controller に業務判断が入り込む
入力アダプターは業務フローの本体を持つ場所ではありません。

### 2. domain をそのまま API response に出す
最初は楽ですが、あとで壊れやすくなります。

### 3. なんでも DTO にして読みにくくする
薄い CRUD ならやりすぎです。

---

## 人に説明するときの言い方

> 入力アダプターは外側の都合を受け止めて、use case が理解できる形に直す役割です。  
> 出力アダプターは、その逆で use case の結果を外へ返す形に整えます。  
> DTO や mapper を置くのは、HTTP や UI の都合を中核に持ち込まないためです。

---

## この章のチェックポイント

- なぜ request JSON をそのまま domain に渡さないのか説明できるか？
- presenter を分ける理由を説明できるか？
- DTO を置くべきとき / 置かなくてよいときを説明できるか？
