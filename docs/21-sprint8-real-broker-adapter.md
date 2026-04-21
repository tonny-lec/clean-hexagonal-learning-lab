# 21. Sprint 8 実装タスク分解: Real Broker Adapter (NATS)

> **目的:** Sprint 6 の broker-like publisher を、
> **実 broker へ publish する adapter** まで前進させる。

このスプリントでは、次の 3 テーマを最小構成で前進させます。

1. **NATS publisher adapter の追加**
2. **local demo 用 docker compose / subscribe script の追加**
3. **README / oral exam / docs 導線の更新**

---

## まず結論: Sprint 8 の本質

Sprint 6 では、broker-like publisher を通して

- topic
- key
- headers
- payload

という **「broker っぽい外部契約」** を学べるようにしました。

ただしそれはまだ、同一プロセス内で envelope を積んでいるだけです。

Sprint 8 では、その次の一歩として

- 本当に外部 broker へ接続する adapter を足し
- integration event contract 自体は変えず
- broker ごとの都合は adapter 側へ閉じる

ようにします。

一言でいうと、

> **「broker っぽく見せる」から「実 broker に publish しても core を汚さない」と説明できる状態へ進む**

のが Sprint 8 の狙いです。

---

## 今回 NATS を選ぶ理由

この repo の目的は、特定 broker の深掘りではなく、**port / adapter の意味を理解すること**です。

そのため今回は、比較的軽量でローカルデモしやすい **NATS** を選びます。

### NATS を使う学習上の利点
- Docker で軽く起動できる
- subject / header という broker detail を明示しやすい
- 「broker に key がない / ある」の違いを説明しやすい
- 本格 durable consumer や replay は次 Sprint に残せる

### 今回やらないこと
- JetStream の本格運用
- durable consumer / consumer group の本格設計
- schema registry
- broker failover / clustering

---

## フェーズ1. real broker publisher adapter を追加する

### ゴール
`IntegrationEventPublisherPort` の実装として、**NATS へ publish する adapter** を追加する。

### 追加 / 更新候補
- `src/adapters/nats/nats-broker-client.ts`
- `src/adapters/nats/nats-integration-event-publisher.ts`
- `src/composition-root.ts`
- `tests/nats-integration-event-publisher.test.ts`

### 今回やること
- `INTEGRATION_PUBLISHER=nats` を追加する
- integration event を NATS subject / header / payload へ写像する
- broker 接続の都合を application へ漏らさない
- publish 後に接続を閉じて、CLI / demo がぶら下がらないようにする

### 完了条件
- in-memory / console / broker-like / nats を差し替えられる
- use case は broker を知らない
- README で `INTEGRATION_PUBLISHER=nats` を試せる

---

## フェーズ2. local demo 用 compose / subscribe script を追加する

### ゴール
ローカルで「本当に broker に届いた」ことを確認できるようにする。

### 追加 / 更新候補
- `infra/nats/docker-compose.yml`
- `scripts/nats-subscribe.ts`
- `package.json`
- `README.md`

### 今回やること
- Docker Compose で NATS を起動できるようにする
- 1 件だけ受信して表示する subscribe script を足す
- README から手順を辿れるようにする

### 完了条件
- broker をローカルで起動できる
- subscriber script で publish 結果を見られる
- 「同じ integration event contract が本当に外へ出る」を確認できる

---

## フェーズ3. broker detail と core の境界を docs で補強する

### ゴール
「なぜ broker の都合を use case に入れないのか」を、コード以外でも説明できるようにする。

### 追加 / 更新候補
- `docs/22-broker-details-and-port-boundaries.md`
- `README.md`
- `docs/09-oral-exam-checklist.md`

### 今回やること
- subject / header / broker URL / connection lifecycle は adapter の関心だと整理する
- `orderId` を header に入れるか subject に埋めるかは broker detail だと説明する
- 逆に integration event contract は application 側の責務だと整理する

### 完了条件
- broker detail と integration contract の違いを説明できる
- 「port を切った意味」を code + docs で話せる

---

## TDD 方針

今回も順番は同じです。

1. failing test を先に書く
2. targeted test で failure を確認する
3. 最小実装で通す
4. 全体 test / build を回す
5. local broker demo を確認する
6. review / commit / push をする

---

## 学習上の意味

Sprint 8 を終えると、次が説明しやすくなります。

- なぜ broker URL や subject 名を use case に書かないのか
- なぜ integration event の shape はそのままで broker だけ差し替えられるのか
- なぜ broker-like adapter と real broker adapter を両方持つ価値があるのか
- なぜ「real broker に触れた」だけでは durable consumer を理解したことにならないのか

---

## 一言まとめ

Sprint 8 の本質は、

> **外部 broker へ実際に publish しても、integration contract と broker detail の境界を崩さないこと**

です。
