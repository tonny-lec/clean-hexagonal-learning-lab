# 16. Sprint 5 実装タスク分解: Retry / Dead-Letter / Poller

> **目的:** Sprint 4 の dispatcher を「一回送れる」状態から、
> **失敗しても再試行できる delivery pipeline** へ進める。

このスプリントでは、次の 3 テーマを最小構成で前進させます。

1. **retryable outbox dispatcher**
2. **dead-letter の入口**
3. **poller / scheduler の最小デモ**

---

## まず結論: 今回の本質

Sprint 4 では、

- outbox に保存する
- dispatcher が publish する
- read model を更新する

までは学べました。

Sprint 5 では、そこに

- publish が失敗したらどうするのか
- 何回まで再試行するのか
- それでも失敗し続ける message をどう扱うのか
- request の外で delivery をどう回すのか

を足します。

一言でいうと、

> **「送れる」から「失敗しても運べる」を説明できる教材へ進める**

のが Sprint 5 の狙いです。

---

## フェーズ1. Outbox に retry 情報を持たせる

### ゴール
Outbox message が publish 成功/失敗の履歴を少し持てるようにする。

### 追加 / 更新候補
- `db/migrations/005_extend_outbox_for_retry.sql`
- `src/application/ports/outbox-port.ts`
- `src/adapters/in-memory/in-memory-outbox.ts`
- `src/adapters/postgres/postgres-outbox.ts`
- `tests/postgres-outbox.test.ts`

### 持たせたい情報
- `retryCount`
- `lastError`
- `nextAttemptAt`
- `deadLetteredAt`

### 完了条件
- pending だけでなく「今はまだ再試行時刻ではない message」を除外できる
- dead-letter 済み message を pending から外せる

---

## フェーズ2. Dispatcher に failure handling を入れる

### ゴール
1件 publish に失敗しても、失敗情報を outbox に残して次へ進められるようにする。

### 追加 / 更新候補
- `src/application/use-cases/dispatch-outbox.ts`
- `tests/dispatch-outbox.test.ts`

### flow
1. pending message を読む
2. publish / project / audit を試す
3. 成功したら published にする
4. 失敗したら retryCount を増やす
5. maxAttempts 未満なら nextAttemptAt を先に送る
6. maxAttempts 到達なら dead-letter に送る
7. observability に結果を残す

### 完了条件
- `dispatchedCount`
- `failedCount`
- `deadLetteredCount`

を結果として返せる

---

## フェーズ3. Poller の最小デモを入れる

### ゴール
Dispatcher を request の中だけでなく、別の delivery loop から呼べる構造を見せる。

### 追加 / 更新候補
- `src/application/use-cases/poll-outbox.ts`
- `tests/poll-outbox.test.ts`
- `src/index.ts`

### 最小でよいもの
- `poller` モードを追加する
- 数サイクルだけ dispatch を回す
- scheduler / worker の入口として説明できれば十分

### 完了条件
- 「誰が dispatch を回すのか？」に対して、poller / cron / worker の話へつなげられる
- 実装は軽量でも責務分離は見える

---

## フェーズ4. 学習導線を閉じる

### ゴール
新しい delivery reliability の論点を README と oral exam に反映する。

### 更新候補
- `README.md`
- `docs/09-oral-exam-checklist.md`

### 完了条件
- retry / dead-letter / poller をどこで読めるか分かる
- 「次の自然な発展」が Sprint 5 後の状態に揃う

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

Sprint 5 を終えると、次が説明しやすくなります。

- outbox は「保存して publish する」で終わりではない
- failure を durable に持つ意味がある
- dead-letter は「無限 retry をしない」ための境界である
- poller は business request の外で delivery を回す責務を持つ
- request / transaction / delivery / recovery を分けて考えられる

---

## 一言まとめ

Sprint 5 の本質は、

> **eventual consistency を『成功する場合』だけでなく、『失敗し続ける場合』まで説明できるようにすること**

です.
