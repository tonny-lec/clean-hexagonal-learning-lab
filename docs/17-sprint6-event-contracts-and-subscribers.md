# 17. Sprint 6 実装タスク分解: Event Versioning / Subscriber Boundary / Broker-like Adapter

> **目的:** Sprint 5 の delivery reliability の上に、
> **「何をどういう契約で外へ届けるか」** を説明できるようにする。

このスプリントでは、次の 3 テーマを最小構成で前進させます。

1. **integration event versioning**
2. **subscriber / projector boundary**
3. **broker-like publisher adapter**

---

## まず結論: Sprint 6 の本質

Sprint 5 で学べるようになったのは、

- outbox に残す
- retry する
- dead-letter へ逃がす
- poller で delivery を回す

という **delivery reliability** です。

Sprint 6 では、その上で

- integration event を versioned contract として扱うこと
- subscriber / projector を publisher から分けること
- broker-like adapter で「外へ出す側の detail」を見せること

を足します。

一言でいうと、

> **「ちゃんと送れる」から「どういう契約で送って、受け手がどう扱うかを説明できる」へ進む**

のが Sprint 6 の狙いです。

---

## フェーズ1. integration event versioning を入れる

### ゴール
`order.placed.v1` だけでなく、将来の `v2` を意識した event contract を作る。

### 追加 / 更新候補
- `src/application/integration-events/order-integration-event.ts`
- `src/application/integration-events/map-order-integration-event.ts`
- `tests/map-order-integration-event.test.ts`

### 今回やること
- `v1` と `v2` の型を並べる
- mapper で version を選べるようにする
- `v2` では payload shape を少し変えて、contract evolution の入口を見せる

### 完了条件
- domain event をそのまま外へ出していない
- versioned integration event を code で比較できる

---

## フェーズ2. subscriber / projector boundary を切り出す

### ゴール
read model 更新を「dispatcher の中の detail」ではなく、subscriber / projector の責務として見せる。

### 追加 / 更新候補
- `src/application/ports/integration-event-subscriber-port.ts`
- `src/adapters/subscribers/fan-out-integration-event-subscriber.ts`
- `src/adapters/subscribers/order-summary-projector-subscriber.ts`
- `tests/integration-event-subscribers.test.ts`
- `src/application/use-cases/dispatch-outbox.ts`

### 今回やること
- subscriber port を作る
- projector subscriber が `OrderReadModelPort` へ書く
- fan-out subscriber で複数 subscriber をまとめて呼べるようにする

### 完了条件
- read model projection を subscriber の一種として説明できる
- publisher と subscriber の責務差を言える

---

## フェーズ3. broker-like publisher adapter を足す

### ゴール
integration event publisher が「console 出力だけではない」ことを見せる。

### 追加 / 更新候補
- `src/adapters/broker-like/broker-like-integration-event-publisher.ts`
- `tests/broker-like-integration-event-publisher.test.ts`
- `src/composition-root.ts`

### 今回やること
- topic / key / schemaVersion を持つ envelope を保存する adapter を作る
- in-memory で十分なので、本物の Kafka/RabbitMQ までは行かない
- env var で publisher を差し替えられるようにする

### 完了条件
- publisher adapter を差し替えられる
- broker-like envelope を見て「外部契約」の話につなげられる

---

## フェーズ4. 学習導線を更新する

### ゴール
README と oral exam を Sprint 6 状態に揃える。

### 更新候補
- `README.md`
- `docs/09-oral-exam-checklist.md`

### 完了条件
- versioning / subscriber / broker-like adapter をどこで読めるか分かる
- 「次の自然な発展」が Sprint 6 後の状態になる

---

## TDD 方針

今回も順番は同じです。

1. failing test を先に書く
2. targeted test で failure を確認する
3. 最小実装で通す
4. 全体 test / build を回す
5. demo 実行を確認する
6. review / commit / push をする

---

## 学習上の意味

Sprint 6 を終えると、次が説明しやすくなります。

- domain event と integration event の違い
- なぜ versioning を考えるのか
- なぜ publisher と subscriber を分けるのか
- なぜ projector は subscriber の一種として扱えるのか
- なぜ broker-like adapter を detail として切るのか

---

## 一言まとめ

Sprint 6 の本質は、

> **event delivery の仕組みだけでなく、event contract と受け手の責務分離まで語れるようにすること**

です。
