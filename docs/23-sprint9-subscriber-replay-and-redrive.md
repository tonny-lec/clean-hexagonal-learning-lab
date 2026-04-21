# 23. Sprint 9 実装タスク分解: Subscriber Failure Policy / Replay / Re-drive

> **目的:** Sprint 8 の real broker adapter の次に、
> **publish 後の subscriber failure を outbox retry と分けて扱う** ところまで進める。

このスプリントでは、次の 3 テーマを最小構成で前進させます。

1. **subscriber failure policy の導入**
2. **replay / re-drive use case の追加**
3. **README / oral exam / replay demo の更新**

---

## まず結論: Sprint 9 の本質

Sprint 8 で学べるようになったのは、

- integration event contract はそのままに
- real broker (NATS) へ publish し
- broker detail を adapter に閉じる

という **publisher 側の境界** です。

しかし、real broker に出せるようになっても、次の問題は残ります。

- publish は成功した
- でも subscriber の 1 つが壊れた
- どこで retry するのか
- outbox retry と同じ箱で扱ってよいのか

Sprint 9 では、そこを分けます。

一言でいうと、

> **「publish に失敗した世界」と「publish は成功したが subscriber が失敗した世界」を分けて説明できる状態へ進む**

のが Sprint 9 の狙いです。

---

## フェーズ1. subscriber failure policy を入れる

### ゴール
subscriber ごとに、**最大試行回数と再試行間隔を分けられる**ようにする。

### 追加 / 更新候補
- `src/application/ports/subscriber-failure-policy-port.ts`
- `src/application/ports/subscriber-delivery-failure-store-port.ts`
- `src/application/ports/named-integration-event-subscriber-port.ts`
- `src/adapters/subscribers/static-subscriber-failure-policy.ts`
- `src/adapters/in-memory/in-memory-subscriber-delivery-failure-store.ts`
- `src/adapters/subscribers/fan-out-integration-event-subscriber.ts`

### 今回やること
- subscriber に名前を持たせる
- failure を subscriber 単位で保存する
- retry / dead-letter の判断を subscriber policy から取る

### 完了条件
- `order-summary-projector` と `email-notifier` で別 policy を設定できる
- 失敗が outbox ではなく subscriber failure store に残る

---

## フェーズ2. replay / re-drive use case を追加する

### ゴール
subscriber failure store に残った失敗を、**あとから再投入**できるようにする。

### 追加 / 更新候補
- `src/application/use-cases/replay-subscriber-failures.ts`
- `tests/subscriber-replay.test.ts`
- `src/index.ts`

### 今回やること
- replayable な failure を拾う
- subscriber 名で handler を探す
- 成功したら resolved にする
- 失敗が続いたら dead-letter に落とす

### 完了条件
- 「replay は誰の責務か」を code で説明できる
- subscriber failure が独立した運用対象になる

---

## フェーズ3. dispatch と subscriber failure の境界を整える

### ゴール
`dispatchOutbox` の責務を、**publish / ack まで** と、**その後の subscriber failure 記録**に整理する。

### 追加 / 更新候補
- `src/application/use-cases/dispatch-outbox.ts`
- `tests/dispatch-outbox.test.ts`

### 今回やること
- publish 失敗は outbox retry のまま扱う
- publish 成功後の subscriber failure は subscriber failure store へ送る
- 直接 `orderReadModel` を使う fallback は legacy path として扱う

### 完了条件
- outbox retry と subscriber replay を混同しない
- `dispatchOutbox` が抱える責務の説明がしやすくなる

---

## フェーズ4. 学習導線を更新する

### ゴール
README / oral exam / demo を Sprint 9 状態に揃える。

### 追加 / 更新候補
- `README.md`
- `docs/09-oral-exam-checklist.md`
- `docs/24-outbox-retry-vs-subscriber-replay.md`

### 今回やること
- replay デモを追加する
- fail-once subscriber の使い方を示す
- outbox retry と subscriber replay の違いを明文化する

### 完了条件
- README から replay デモへ辿れる
- 「次に何が課題か」が Sprint 9 後の状態になる

---

## TDD 方針

今回も順番は同じです。

1. failing test を先に書く
2. targeted test で failure を確認する
3. 最小実装で通す
4. 全体 test / build を回す
5. replay demo を確認する
6. review / commit / push をする

---

## 学習上の意味

Sprint 9 を終えると、次が説明しやすくなります。

- なぜ outbox retry と subscriber replay は別なのか
- なぜ publish success 後の失敗は別の箱で持つべきなのか
- なぜ subscriber ごとに failure policy を持たせるのか
- なぜ replay / re-drive は application use case として切れるのか

---

## 一言まとめ

Sprint 9 の本質は、

> **非同期 delivery の失敗を 1 種類で済ませず、publish failure と subscriber failure を分けて扱うこと**

です。
