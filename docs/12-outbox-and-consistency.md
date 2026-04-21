# 12. Outbox Pattern と Consistency: なぜ save 後に即 publish だけでは危ないのか

この章では、`Order` を保存したあとに domain event を即 publish するだけでは、なぜ整合性の穴が残るのかを整理します。

---

## まず結論

Outbox pattern の目的は、

> **「業務データの保存」と「後続イベントの送信」を、まず durable にそろえて残すこと**

です。

ここで大事なのは、**送信そのものを同期で完了させること**ではなく、
**「送るべきイベントが失われない状態を先に作ること」** です。

---

## 何が問題なのか

たとえば `placeOrder` が次の順で動くとします。

1. `Order` を DB に保存する
2. その後 `order.placed` を publish する

このとき、次の失敗パターンがあります。

### ケース1. save は成功、publish は失敗
- 注文は保存された
- しかし event bus 送信は失敗した
- 結果として、後続処理は「注文が作られたこと」を知らない

これは、

> **DB には真実があるのに、外部へ伝えるはずの出来事が消える**

という危険な状態です。

---

## Outbox の考え方

Outbox pattern では、`Order` を保存する transaction の中で、
一緒に `outbox_messages` にも event を保存します。

### つまり flow はこう変わる

#### Before
- save order
- publish event

#### After
- save order
- save outbox message
- 別プロセス / 後続 dispatcher が outbox から publish

この違いにより、publish がその場で失敗しても、
**「送るべきイベント」は DB に残る** ようになります。

---

## このリポジトリでの役割分担

### Domain Event
`Order.place()` が `order.placed` を発生させます。

これは
- 業務上意味のある出来事
- domain の中で起きたこと

を表します。

### Outbox Message
Outbox に保存されるのは、**後で安全に配送するための durable record** です。

このリポジトリでは、
- `event_type`
- `aggregate_id`
- `payload_json`
- `occurred_at`
- `published_at`

のような列で保持します。

つまり、domain event をそのままメモリで握り続けるのではなく、
**配送待ちメッセージとして persistence へ落とす** 形です。

---

## integration event と domain event の関係

学習上はまず、domain event をそのまま outbox に保存しています。

ただし実務では、
- domain event
- integration event

を分けることがあります。

### domain event
- domain 内の意味を表す
- 内部モデル寄り

### integration event
- 他システムへ共有する契約寄り
- versioning や backward compatibility を意識する

このリポジトリではまず

> **「event はまず durable に残す」**

ところまでを学習対象にしています。

---

## eventual consistency をどう理解するか

Outbox pattern を入れると、`Order` 保存と外部通知は完全同時ではなくなります。

そのため、後続システムから見ると少し遅れて反映されることがあります。

これが eventual consistency の入口です。

### 重要なのは
- 今すぐ全部一致することより
- **失われず、最終的に追いつくこと**

です。

---

## このサンプルで実装していること

Sprint 3 では、次を追加しています。

- `OutboxPort`
- in-memory outbox adapter
- PostgreSQL outbox adapter
- `003_create_outbox.sql`
- `placeOrder` が sync publish ではなく outbox 保存を行う flow

つまり、use case は

> **「publish する」より先に「durable に残す」**

ことを優先する構造になっています。

---

## なぜ application から outbox を port にするのか

outbox は PostgreSQL のテーブル detail を含みますが、
同時に **整合性設計の一部** でもあります。

そのため application は、
- outbox が必要だという設計判断
- ただし実装 detail は知らない

という位置に置きます。

つまり、

- **必要性は内側の関心**
- **保存方法は外側の detail**

です。

---

## この章で説明できるようになること

- なぜ save succeeded / publish failed が危険なのか
- なぜ event をまず durable に残す必要があるのか
- outbox table は何のためにあるのか
- eventual consistency をどう受け止めるべきか
- sync publish と outbox persist の役割差

---

## まだ未解決のこと

この章だけでは、まだ次は扱っていません。

- outbox poller / dispatcher の実装
- retry / dead-letter queue
- exactly-once ではなく at-least-once をどう扱うか
- integration event versioning
- saga / compensation

つまり、今は

> **「イベントを失わない入り口」**

までを扱っています。
