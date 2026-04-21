# 20. Sprint 7 実装タスク分解: Dedicated Worker / Consumer

> **目的:** Sprint 5 の poller と Sprint 6 の event contract 境界の上に、
> **「request の外で delivery を回す専用プロセス」** を説明できるようにする。

このスプリントでは、次の 3 テーマを最小構成で前進させます。

1. **dedicated worker の導入**
2. **queue consumer 的 trigger 境界**
3. **worker demo / README / oral exam の更新**

---

## まず結論: Sprint 7 の本質

Sprint 5 までで学べるようになったのは、

- outbox に残す
- retry する
- dead-letter へ逃がす
- poller で delivery を回す

という **delivery reliability の入口** です。

Sprint 6 ではさらに、

- integration event versioning
- subscriber / projector boundary
- broker-like publisher adapter

を足し、event contract と受け手の責務分離まで扱えるようになりました。

Sprint 7 では、その上で

- `dispatchOutbox` / `pollOutbox` のような use case と
- それを **request の外から回す worker / consumer**

を分けて見せます。

一言でいうと、

> **「poller で回せる」から「専用 worker が trigger を受けて delivery を進める」と説明できる状態へ進む**

のが Sprint 7 の狙いです。

---

## フェーズ1. dedicated worker を導入する

### ゴール
`pollOutbox` を直接デモするだけでなく、**worker が trigger を受けて poller を呼ぶ**構造を作る。

### 追加 / 更新候補
- `src/adapters/worker/outbox-delivery-worker.ts`
- `src/composition-root.ts`
- `src/index.ts`
- `tests/delivery-worker.test.ts`

### 今回やること
- worker を adapter として実装する
- worker は `pollOutbox` を orchestration するだけに留める
- `pollOutbox` 自体は application use case のまま維持する
- demo では request 側と worker 側を **1 本のスクリプトで順番にシミュレーション** する

### 完了条件
- 「dispatcher は use case、worker は orchestrator」と説明できる
- `pollOutbox` を worker 以外からも呼べる構造を崩していない

---

## フェーズ2. queue consumer 的 trigger 境界を入れる

### ゴール
worker が「何をきっかけに動くのか」を、HTTP や CLI と切り離して見せる。

### 追加 / 更新候補
- `src/adapters/worker/delivery-trigger-consumer.ts`
- `src/adapters/in-memory/in-memory-delivery-trigger-consumer.ts`
- `tests/delivery-worker.test.ts`

### 今回やること
- trigger を `schedule` / `queue-message` のような軽量入力として扱う
- worker は trigger consumer から仕事を受け取る
- success 時は ack、unexpected failure 時は release / requeue する
- ただし今回の consumer は **in-memory の教材用最小実装** に留める

### 完了条件
- queue consumer は input adapter の一種だと説明できる
- outbox message 自体と worker trigger を区別して話せる

---

## フェーズ3. 学習導線を更新する

### ゴール
README と oral exam を Sprint 7 状態に揃える。

### 更新候補
- `README.md`
- `docs/09-oral-exam-checklist.md`

### 今回やること
- `worker` デモを追加する
- poller と worker の違いを README から辿れるようにする
- oral exam に「poller / worker / consumer の責務差」を反映する

### 完了条件
- README から worker デモへ辿れる
- 「まだ足りないもの」が Sprint 7 後の状態になる

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

Sprint 7 を終えると、次が説明しやすくなります。

- なぜ request の中で delivery を完結させないのか
- なぜ worker は use case ではなく orchestrator と見なせるのか
- なぜ queue consumer は input adapter の一種として扱えるのか
- なぜ trigger の ack / release を outbox retry と混同しない方がよいのか

---

## 一言まとめ

Sprint 7 の本質は、

> **delivery use case と、それを request の外で回す worker / consumer の責務差を、コードで説明できるようにすること**

です。
