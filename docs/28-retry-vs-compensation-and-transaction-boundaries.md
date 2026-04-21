# 28. Retry / Compensation / Transaction Boundary は何が違うのか

Sprint 11 で一番大事なのは、

> **失敗を全部 retry で済ませない**

ことです。

このドキュメントは、

- local transaction
- retry
- compensation

の違いを言葉で説明するための補助資料です。

---

## 1. Local transaction が守るもの

DB transaction が強いのは、
**同じ transaction boundary の中で一緒に commit / rollback できるもの**です。

たとえば:

- order を保存する
- outbox に message を保存する

のように、同じ DB に同じ transaction で書けるものは、かなり強く守れます。

だからこの repo でも、

- order persistence
- outbox persistence

は local transaction の世界として説明できます。

---

## 2. Retry が向いている失敗

retry が向いているのは、
**まだ action が完了していない / もう一度やる意味がある** 失敗です。

例:
- payment API 呼び出しが timeout した
- broker publish に失敗した
- subscriber replay をあとで再試行したい

この repo でいうと:

- outbox retry
- subscriber replay / re-drive
- 一時的 external failure の再試行

は retry の話です。

ここで見ているのは、

> **まだ成功させるべき処理を、あとで再度やる**

という設計です。

---

## 3. Compensation が向いている失敗

compensation が必要になるのは、
**前の step はもう成功していて、それをそのままにすると業務的につらい** 場合です。

例:
- payment は成功した
- でも fulfillment booking が失敗した
- このままだと「お金だけ取れて配送できない」

このとき欲しいのは、単なる retry ではなく、

- payment を refund / cancel する
- workflow を compensated として残す

という **戻す action** です。

つまり compensation は、

> **失敗した step をもう一度やる話ではなく、前に成功した step の影響を打ち消す話**

です。

---

## 4. なぜ retry と compensation を混ぜると困るのか

もし全部を retry で済ませようとすると、次の問題が起きます。

- すでに成功した payment を何度も触ってしまうかもしれない
- 「未完了だから再試行」と「成功済みを戻す」が混ざる
- business failure と transport failure の境界がぼやける

逆に全部を compensation で考えると、今度は

- 一時的 timeout まで毎回 refund / rollback 的に扱ってしまう
- 成功させればよい処理を戻しすぎる

だから大事なのは、

- まだ完了していない処理 → retry
- すでに成功した処理の影響を戻したい → compensation

と分けることです。

---

## 5. この repo での見分け方

### Outbox publish failure
- まだ publish が完了していない
- **retry** の世界

### Subscriber failure after publish success
- publish は完了した
- subscriber 側だけやり直したい
- **replay / re-drive** の世界

### Payment success, fulfillment failure
- payment は完了した
- でも workflow 全体としては完了扱いにしにくい
- **compensation** の世界

この 3 つは、全部「失敗」ではありますが、
**どこで失敗したかで扱いが違う** のが重要です。

---

## 6. なぜ DB transaction だけでは足りないのか

たとえば payment gateway や fulfillment API は、
こちらの DB transaction の rollback に付き合ってはくれません。

つまり:

- DB だけ rollback できても
- 外部で起きた charge や reservation は残る

ことがあります。

ここで初めて、

- local transaction
- outbox / replay の retry
- saga / compensation

を階層的に分けて考える必要が出ます。

---

## 7. observability がなぜ効くのか

Sprint 10 までで telemetry / audit log を整えたので、
Sprint 11 では次のような見方がしやすくなります。

- workflow のどの step で失敗したか
- retry したのか
- compensate したのか
- 最終状態が completed なのか compensated なのか

つまり observability は、

> **saga を本番級にするための飾りではなく、失敗の種類を説明するための補助線**

として効きます。

---

## 8. 一言まとめ

- local transaction は **同じ境界の中で一緒に commit / rollback できるもの** を守る
- retry は **まだ成功させるべき処理をもう一度やる**
- compensation は **すでに成功した action の影響を戻す**

Sprint 11 で本当に学びたいのは、

> **「失敗したら再試行」だけでは説明できない世界があり、そこでは workflow と compensation を設計する必要がある**

という点です。
