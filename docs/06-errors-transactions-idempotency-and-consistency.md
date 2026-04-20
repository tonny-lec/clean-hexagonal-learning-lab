# 06. エラー設計 / トランザクション / 冪等性 / 整合性をどう考えるか

この章は、学習用サンプルから実務へ近づくときに必ず出てくる論点を扱います。

---

## 1. エラー設計

このラボでは、エラーを大きく 3 種類で考えています。

### Domain error
- ルール違反
- 不変条件違反
- 例: 空の注文、数量 0 以下

### Application error
- use case 実行上のエラー
- 例: invalid request, order not found

### External detail error
- 外部サービスや adapter 側の失敗
- 例: payment gateway timeout, DB unavailable

---

## コード上の対応

- `src/domain/errors.ts`
- `src/application/errors/application-error.ts`
- `src/adapters/http/*` で HTTP response に変換

重要なのは、

> **HTTP 500 / 404 / 400 という表現は、application より外側の都合**

だという点です。

だから use case の中では、まず「何が起きたか」を application error で表し、
HTTP adapter がそれを status code に変換します。

---

## 2. トランザクション境界

`placeOrder` では、
- catalog 参照
- payment 実行
- repository 保存
- event publish

が出てきます。

ここで考えるべきことは:
- DB transaction に何を入れるか
- 外部 API 呼び出しを transaction の中に入れてよいか
- save と payment の順序をどうするか

このラボでは最小例として `UnitOfWorkPort` を置き、
保存を transaction boundary の中に入れています。

ただし実務では、

> **外部 API 呼び出しと DB transaction をきれいに一発で整合させるのは難しい**

ことが多いです。

---

## 3. 冪等性 (Idempotency)

注文作成系では、再送が現実に起きます。

例:
- API クライアントが timeout で再送
- ネットワークの揺れ
- 決済成功後にレスポンスだけ失われる

そのとき、同じリクエストを 2 回処理すると二重注文になる可能性があります。

このラボでは:
- `PlaceOrderCommand.idempotencyKey`
- `OrderRepositoryPort.findByIdempotencyKey()`

を用意して、同じキーなら既存結果を返す例を入れています。

---

## 4. 整合性の難しさ

たとえば次の順序を考えてください。

1. payment 成功
2. DB save 失敗

この場合、外部では課金成功、内部では注文未保存になります。

逆に、

1. DB save 成功
2. payment 失敗

なら、注文だけ残ってしまいます。

この手の問題は、単なる port / adapter 分離だけでは終わりません。
必要になるのは、たとえば:
- retry
- compensation
- saga
- outbox
- pending / confirmed 状態遷移

です。

---

## このラボでの立ち位置

このラボは**理解の入口**として次を見せています。

- transaction を意識するための `UnitOfWorkPort`
- duplicate request を扱うための idempotency key
- event publish を別 port にする考え方

ただし、outbox や saga はまだ導入していません。
それは「次に学ぶべき論点」として残しています。

---

## よくある失敗

### 1. エラーを全部 `Error` で済ませる
学習初期では簡単ですが、境界をまたぐと急につらくなります。

### 2. 500 / 404 を use case で直接返す
それは adapter 都合です。

### 3. idempotency を考えず create API を作る
現場では高確率で後から困ります。

### 4. transaction の話を DB だけの話だと思う
外部 API が絡むと、整合性はもっと難しくなります。

---

## 人に説明するときの言い方

> Clean / Hexagonal にすると、エラーや transaction の責務を整理しやすくなります。  
> ただし、整合性そのものが簡単になるわけではありません。  
> むしろ、どこが domain の問題で、どこが adapter や infrastructure の問題かを分けて考えやすくなる、という価値があります。

---

## この章のチェックポイント

- domain error / application error / external error の違いを説明できるか？
- なぜ HTTP status code を use case で返さないのか説明できるか？
- idempotency が必要な理由を説明できるか？
- transaction と整合性の違いを説明できるか？
