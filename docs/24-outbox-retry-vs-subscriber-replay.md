# 24. Outbox Retry と Subscriber Replay は何が違うのか

Sprint 9 で一番大事なのは、

> **失敗を全部 outbox retry に押し込まない**

ことです。

このドキュメントは、その違いを言葉で説明するための補助資料です。

---

## 1. Outbox retry が扱う失敗

outbox retry が扱うのは、基本的に

- publish そのものが失敗した
- publish は成功したが ack に失敗した

という、**publisher 側の delivery failure** です。

ここで守りたいのは、

- durable に残した event を
- ちゃんと broker / downstream へ届けること

です。

だから outbox retry は、

- pending
- retry
- dead-letter

という形で、**まだ publish の責務が終わっていない失敗** を持ちます。

---

## 2. Subscriber replay が扱う失敗

subscriber replay が扱うのは、

- event はすでに publish された
- でも subscriber の 1 つが処理に失敗した

という、**consumer 側 / subscriber 側の失敗** です。

ここではもう、publisher の責務は大筋終わっています。

たとえば:
- broker には出せた
- outbox message も published にできた
- でも read model projector が壊れた
- あるいは email notifier が落ちた

この時点で必要なのは、outbox retry ではなく、

- subscriber 名
- 何の event で失敗したか
- 何回失敗したか
- 次いつ replay するか

を持つ **subscriber failure store** です。

---

## 3. なぜ 1 つの retry で済ませないのか

もしこれを全部 outbox retry に戻すと、次の問題が起きます。

- もう publish 済みなのに、同じ event をまた publish してしまうかもしれない
- subscriber 1 個の失敗で、publish 全体を未完了扱いしてしまう
- 「publisher の責務」と「subscriber の責務」が混ざる
- replay の対象が粗すぎる

つまり、

> **1 つの subscriber が失敗しただけなのに、delivery 全体を巻き戻そうとしてしまう**

のが問題です。

---

## 4. 例: read model projector が失敗したとき

たとえば `order.placed.v1` を publish したあとで、
`order-summary-projector` が失敗したとします。

このとき:

### outbox retry に戻す発想
- message をもう一度 publish する
- 外部 subscriber まで重複させる危険がある
- publisher 側の責務をやり直しすぎる

### subscriber replay に分ける発想
- `order-summary-projector` だけの failure record を作る
- あとでその subscriber だけ replay する
- 他 subscriber や broker delivery は巻き込まない

Sprint 9 で学びたいのは、後者です。

---

## 5. なぜ subscriber ごとに policy を変えるのか

subscriber は全部同じ重さではありません。

例:
- `order-summary-projector`
  - query side に効く
  - 比較的重要
  - retry したい
- `email-notifier`
  - 補助通知
  - retry は少なめでよいかもしれない
- `analytics-recorder`
  - 欠落許容度が比較的高い場合もある

だから、

- maxAttempts
- retryDelaySeconds

を subscriber ごとに分けられる価値があります。

ここで初めて、

> **「失敗したら retry」ではなく、「誰が失敗したかで扱いを変える」**

という実務感に近づきます。

---

## 6. なぜ direct read model path を卒業したいのか

Sprint 9 では、`dispatchOutbox` から **direct read model fallback を外し**、
subscriber boundary を通す前提を強めています。

これは学習上、とても重要です。

なぜなら direct path のままだと、

- subscriber 名がない
- replay store へ切り出しにくい
- failure policy を当てにくい

からです。

逆に subscriber boundary を先に切っておくと、

- `order-summary-projector`
- `email-notifier`
- `analytics-recorder`

のように、失敗の責務を subscriber 単位で扱えます。

つまり Sprint 9 で見たいのは、

> **read model 更新も「ただの内部 detail」ではなく、失敗と replay を持つ subscriber の一種として見ること**

です。

---

## 7. 一言まとめ

- outbox retry は **publish が終わっていない失敗** を扱う
- subscriber replay は **publish は終わった後の subscriber failure** を扱う
- 2 つを分けることで、責務も再試行の粒度も明確になる

Sprint 9 で本当に学びたいのは、

> **非同期処理の失敗を 1 種類で済ませず、どこで失敗したかによって扱いを分けること**

です。
