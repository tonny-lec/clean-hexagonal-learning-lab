# 13. Auth / Authorization / Policy Placement: 誰が何をしてよいかをどこで判断するか

この章では、認証と認可を Clean / Hexagonal の中でどこに置くべきかを整理します。

---

## まず結論

- **Authentication (認証)**: 「誰として来たか」を組み立てる
- **Authorization (認可)**: 「その人がその操作をしてよいか」を判断する

このリポジトリでは、次のように分けます。

### input adapter が担うこと
- HTTP header / token / session から current actor を取り出す
- `ActorDto` に変換する

### application が担うこと
- その actor が use case を実行してよいか判断する
- 業務ルールに沿って 401 / 403 を返せる形にする

---

## なぜ controller に全部書かないのか

HTTP handler に認可ロジックをベタ書きすると、

- HTTP 以外の入口で再利用しにくい
- ルール変更時に各 controller に散らばる
- 何が input parsing で、何が業務判断か混ざる

という問題が起きます。

Clean / Hexagonal では、

> **「誰が実行するか」は入口で組み立てるが、「実行してよいか」は application の関心として扱う**

のが分かりやすいです。

---

## このリポジトリで導入する actor モデル

`ActorDto` は、use case の判断に必要な最小情報です。

例:
- `actorId`
- `role`
- `customerId` (customer actor のとき)

ここで重要なのは、

> **HTTP request 全体を use case に渡さず、判断に必要な actor 情報だけを持ち込む**

ことです。

---

## 認証と認可の違い

### 認証
- この request は誰のものか
- token / session / header を読む
- adapter 側で current actor を組み立てる

### 認可
- この actor はこの操作をしてよいか
- `placeOrder` や `getOrderSummary` の実行条件を判定する
- application policy として表現する

この2つを混ぜると、
「誰か分からない」と「誰かは分かるが権限がない」が区別しづらくなります。

---

## このサンプルのルール例

### View order
- admin は全注文を見られる
- customer は自分の注文だけ見られる

### Place order
- customer は自分の注文だけ作れる
- 高額注文は privileged actor のみ許可する

このようなルールは、HTTP の都合ではなく
**業務上の権限ルール** です。

そのため application policy として置く価値があります。

---

## どこで評価するのか

### HTTP adapter
1. request を parse する
2. current actor を取り出す
3. command / query を組み立てる
4. use case を呼ぶ
5. response へ写像する

### Use case
- 必要な domain data を集める
- policy を使って authorization を評価する
- 実行継続 / 拒否を決める

ここでのポイントは、
高額注文のように **domain data が分からないと判定できないルール** があることです。

たとえば `placeOrder` では total amount を計算したあとでないと、
高額注文かどうかを判断できません。

だからこそ、

> **認可判断の本体は application に置いたほうが自然**

になります。

---

## 401 と 403 の違い

### 401 Authentication Required
- current actor を組み立てられない
- そもそも誰として来たかが不足している

### 403 Forbidden
- actor は分かっている
- しかしその操作は許可されていない

この違いを分けておくと、
API 設計と説明の両方が分かりやすくなります。

---

## このサンプルで実装していること

Sprint 3 では次を追加しています。

- `ActorDto`
- HTTP auth middleware
- `OrderAuthorizationPolicy`
- `placeOrder` / `getOrderSummary` での authorization 評価
- HTTP adapter の `auth -> policy -> use case` flow

これにより、
- current actor の組み立て
- policy 評価
- use case 実行
- response mapping

の責務差をコード上で追えるようになっています。

---

## この章で説明できるようになること

- auth と authorization の違い
- なぜ current actor は adapter で組み立てるのか
- なぜ authorization policy は application に置くのか
- 401 と 403 の違い
- controller に認可をベタ書きしない理由

---

## まだ未解決のこと

この章では、まだ次は扱っていません。

- JWT 検証そのもの
- RBAC / ABAC の本格設計
- policy composition
- audit log
- multi-tenant 境界

つまり今は、

> **認証と認可の責務差を説明できる最小構成**

までを実装しています。
