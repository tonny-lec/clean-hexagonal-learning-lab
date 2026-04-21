# 27. Sprint 11 実装タスク分解: Saga / Compensation の入口

> **目的:** Sprint 10 で observability を強めた次に、
> **「DB transaction だけでは守れない長い workflow」** を説明できるところまで進める。

このスプリントでは、次の 4 テーマを最小構成で前進させます。

1. **payment workflow を段階化する**
2. **saga coordinator 的な orchestration を入れる**
3. **compensation action を追加する**
4. **README / oral exam / demo を Sprint 11 状態に揃える**

---

## まず結論: Sprint 11 の本質

Sprint 10 までで、この repo はかなり多くのことを説明できるようになりました。

- command / query の分離
- outbox / retry / dead-letter
- subscriber replay / re-drive
- worker / consumer / broker adapter
- structured telemetry / audit log / correlation

ただし、まだ弱い論点があります。

それは、

- DB には保存できた
- payment も成功した
- でも次の外部処理で失敗した
- このとき「retry」だけで済むのか
- それとも「戻す」設計が必要なのか

という **long-running workflow の整合性** です。

Sprint 11 でやりたいのは、そこを最小限で見せることです。

一言でいうと、

> **「外部呼び出しが1回ある use case」から「複数の外部依存をまたぐ workflow では compensation が必要になる」と説明できる状態へ進む**

のが Sprint 11 の狙いです。

---

## 今回の題材: なぜ payment workflow を選ぶのか

この repo では、すでに `placeOrder` で payment gateway を触っています。
そのため Sprint 11 では、新しい巨大な題材を足すより、
**注文作成 + 支払い + 次の外部処理** という今の延長で学ぶのが自然です。

今回の最小シナリオ候補は、たとえば次です。

1. order を受け付ける
2. payment を成功させる
3. fulfillment / shipment booking / reservation 相当の外部処理へ進む
4. ここで失敗したら、payment を refund / cancel する

この流れだと、次がはっきり見えます。

- retry で直る失敗
- すでに外へ出た action を戻す compensation
- local transaction では閉じない整合性

---

## この Sprint で守りたい方針

### 1. 汎用 saga framework を作らない
- 今回の目的は framework 化ではなく、考え方を学ぶこと
- `Order` workflow を題材にした **1 本の explainable な coordinator** でよい

### 2. retry と compensation を混ぜない
- payment API の一時失敗は retry の話
- payment 成功後に downstream が失敗して refund するのは compensation の話
- この 2 つは運用上も設計上も別だと分かる形にする

### 3. domain / application / adapter の責務差を崩さない
- saga の順序制御は application に置く
- gateway / fulfillment / refund の detail は adapter に置く
- domain は workflow の意味を表すが、SDK 都合は知らない

---

## フェーズ1. payment workflow を段階化する

### ゴール
今の「placeOrder が payment まで一気にやる」形から、
**workflow の途中状態を説明できる構造**へ一段だけ進める。

### 追加 / 更新候補
- `src/domain/order.ts`
- `src/domain/order-workflow-status.ts` あるいは同等の status 表現
- `src/application/dto/order-dto.ts`
- `tests/order.test.ts`
- `tests/place-order.test.ts`

### 今回やること
- order に workflow 上の状態を持たせる
  - 例: `pending`, `payment-completed`, `fulfillment-requested`, `completed`, `compensated`
- 「注文は受けたが、workflow はまだ終わっていない」を表せるようにする
- `placeOrder` と、後続 workflow use case の責務差を見えるようにする

### 完了条件
- 1 回の use case 完了と workflow 完了が同じではないと説明できる
- order の状態遷移を言葉で追える

---

## フェーズ2. saga coordinator 的な orchestration を入れる

### ゴール
複数の外部依存を順番に進める責務を、
**application の workflow coordinator** として切り出す。

### 追加 / 更新候補
- `src/application/use-cases/run-order-checkout-saga.ts`
- `src/application/ports/fulfillment-port.ts` あるいは同等の後続外部依存 port
- `src/composition-root.ts`
- `tests/order-checkout-saga.test.ts`

### 今回やること
- `payment -> fulfillment` の順で進める最小 coordinator を作る
- generic saga engine ではなく、`Order` 用の明示的な orchestration にする
- 途中結果を observability / audit で見えるようにする

### 完了条件
- 「なぜ saga は use case を跨ぐ orchestration として見えるのか」を説明できる
- 順序制御が controller や adapter に散らない

---

## フェーズ3. compensation action を追加する

### ゴール
下流失敗時に **payment を元に戻す action** を持たせ、
retry と compensation の違いを code で説明できるようにする。

### 追加 / 更新候補
- `src/application/ports/payment-gateway-port.ts`
- `src/adapters/payment/`
- `src/adapters/in-memory/` の test double 群
- `tests/payment-adapters.test.ts`
- `tests/order-checkout-saga.test.ts`

### 今回やること
- payment gateway に refund / cancel 相当の操作を追加する
- fulfillment 側 failure を意図的に起こせる adapter を入れる
- payment success 後の downstream failure で compensation を走らせる
- compensation 成功 / compensation failure の両方を観測できるようにする

### 完了条件
- 「retry ではなく compensation が必要になる世界」を説明できる
- payment success 後の failure path を test で固定できる

---

## フェーズ4. 学習導線を更新する

### ゴール
README / oral exam / demo を Sprint 11 の論点に揃える。

### 追加 / 更新候補
- `README.md`
- `docs/09-oral-exam-checklist.md`
- `docs/28-retry-vs-compensation-and-transaction-boundaries.md`
- `src/index.ts`

### 今回やること
- saga デモを 1 本追加する
- success path と compensation path の両方を README から辿れるようにする
- oral exam に「retry と compensation の違い」を入れる

### 完了条件
- README から saga デモへ辿れる
- observability / audit を見ながら workflow failure を説明できる

---

## TDD 方針

今回も順番は同じです。

1. failing test を先に書く
2. targeted test で failure を確認する
3. 最小実装で通す
4. 全体 test / build を回す
5. saga demo を確認する
6. review / commit / push をする

### 最初に増やしたい targeted test 候補
- `tests/order.test.ts`
  - workflow status 遷移
- `tests/order-checkout-saga.test.ts`
  - success path
  - fulfillment failure -> compensation path
  - compensation failure path
- `tests/payment-adapters.test.ts`
  - refund / cancel semantics
- `tests/place-order-observability.test.ts`
  - workflow started / compensated / completed telemetry

---

## 学習上の意味

Sprint 11 を終えると、次が説明しやすくなります。

- なぜ local transaction だけでは外部依存を守れないのか
- なぜ retry と compensation は別物なのか
- なぜ saga は巨大 framework でなくても学べるのか
- なぜ observability があると workflow failure を説明しやすいのか

---

## 一言まとめ

Sprint 11 の本質は、

> **外部依存をまたぐ workflow では、「失敗したら再試行」だけでなく「戻す設計」が必要になることを説明できるようにすること**

です。
