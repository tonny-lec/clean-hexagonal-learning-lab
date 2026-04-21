# 22. Broker Detail と Port Boundary: なぜ subject / header / URL を use case に入れないのか

Sprint 8 では、real broker adapter として NATS を足します。

ここで大事なのは、

> **NATS を使えるようになること自体より、broker の都合をどこへ閉じ込めるかを理解すること**

です。

このドキュメントは、そこを説明するための補助資料です。

---

## 1. integration event contract と broker detail は別物

まず分けたいのは、次の 2 つです。

### integration event contract
外部へ共有する業務上の契約です。

例:
- `order.placed.v1`
- `order.placed.v2`
- payload の shape
- schemaVersion
- event の意味

これは、**application が責任を持つ外部契約**です。

---

### broker detail
その契約を「どの transport で、どう運ぶか」の都合です。

例:
- NATS の URL
- subject 名
- header 名
- connection lifecycle
- broker に key があるか / ないか
- publish API の呼び方

これは、**adapter の責務**です。

---

## 2. なぜ use case に broker の都合を入れないのか

たとえば `dispatchOutbox` が、こんな引数を直接受け始めるとつらくなります。

- `subjectPrefix`
- `natsUrl`
- `partitionKey`
- `headerNameForSchemaVersion`

これを application 側に入れると、

- use case が transport detail を知ってしまう
- broker を差し替えるたびに core が揺れる
- test が broker 都合に引っ張られる
- 「integration event を publish する」責務と「NATS でどう publish するか」が混ざる

ようになります。

つまり、

> **本来守りたいのは event を外へ届けることなのに、いつのまにか broker 設定を中心に設計してしまう**

のが問題です。

---

## 3. `orderId` を subject に入れるか、header に入れるかは誰の責務か

これは Sprint 8 で特に大事な論点です。

`orderId` 自体は integration event に必要な業務データです。  
しかし、

- subject に埋めるのか
- header に入れるのか
- payload にだけ持たせるのか

は broker ごとの都合です。

たとえば:

- broker-like adapter では `key` を持てる
- NATS では key の概念がそのままは無い
- だから NATS adapter では header に寄せるかもしれない

この違いは、**application の責務ではない**です。

application が知るべきなのは、

- `orderId` を持つ integration event を publish すること

であって、

- NATS の subject 設計をどうするか

ではありません。

---

## 4. port を 1 本だけに保つ意味

この repo では application 側に

- `IntegrationEventPublisherPort`

だけを置いています。

これは、

> **application が必要としている抽象は「integration event を publish すること」であって、「NATS client を直接触ること」ではない**

からです。

ここで追加しなくてよいものの例:
- `NatsConnectionPort`
- `BrokerSubjectResolverPort`
- `BrokerHeaderFactoryPort`

もちろん実務では分ける場合もありますが、この教材 repo ではそこまで抽象化すると、

- 学習者が本質を見失いやすい
- port を切る意味より、port を増やす作業が主役になる

のでやりすぎです。

---

## 5. real broker adapter を入れると何が学べるのか

Sprint 6 の broker-like adapter だけでも、契約の話はできます。

しかし Sprint 8 で real broker adapter を入れると、さらに次が見えます。

- 接続 URL は adapter の設定である
- publish API は broker SDK に依存する
- connection lifecycle をどう閉じるかも adapter の責務である
- それでも use case の引数や戻り値は変えなくてよい

ここで初めて、

> **port を切る価値は「将来変わるかもしれない detail を core から切り離すこと」**

が、より実感しやすくなります。

---

## 6. それでも Sprint 8 ではまだ足りないもの

real broker adapter を入れても、まだ次は残っています。

- subscriber failure policy
- replay / re-drive
- durable consumer
- multi-worker concurrency
- observability 強化
- schema governance

つまり Sprint 8 は、

> **broker に publish できるようになる Sprint**

であって、

> **非同期システム全体を運用できるようになる Sprint**

ではありません。

この区別を持っておくと、学習の筋がぶれにくくなります。

---

## 7. 一言まとめ

- integration event contract は application の関心
- subject / header / URL / connection lifecycle は adapter の関心
- `IntegrationEventPublisherPort` を保つことで、その境界が見えやすくなる

つまり Sprint 8 で本当に学びたいのは、

> **real broker を使っても、Clean / Hexagonal の依存方向を崩さないこと**

です。
