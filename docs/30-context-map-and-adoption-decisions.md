# 30. Context Map / ACL / フル採用か部分採用か

Sprint 12 で一番大事なのは、

> **境界は code のためだけでなく、意味を守るためにある**

と分かることです。

このドキュメントは、

- bounded context
- context map
- anti-corruption layer (ACL)
- フル採用 / 部分採用 / 非採用

を、この repo に結びつけて説明するための補助資料です。

---

## 1. Bounded Context とは何か

bounded context は、ざっくり言うと

**言葉の意味が安定して通じる範囲**

です。

たとえば同じ `Order` でも、文脈が変わると意味はズレます。

- Sales 側の `Order`
  - 顧客が何を買ったか
  - price / payment / checkout を重視する
- Warehouse 側の `DispatchRequest`
  - 何をいつ出荷するか
  - shipment / pick / dispatch ticket を重視する
- Accounting 側の `Payment`
  - charge / refund / settlement を重視する

見た目は似ていても、
**大事にしている関心が違う** のがポイントです。

---

## 2. この repo をどう見るか

この repo は実装上は 1 つの教材 repo ですが、
概念上は次のように読めます。

### Sales / Checkout Context
- `Order`
- `placeOrder`
- `runOrderCheckoutSaga`
- `OrderAuthorizationPolicy`

### Integration / Delivery Context
- `OutboxPort`
- `dispatchOutbox`
- `pollOutbox`
- `IntegrationEventPublisherPort`
- subscriber replay / re-drive

### Warehouse / Fulfillment Context
- `FulfillmentPort`
- fulfillment adapter 群
- shipment / dispatch に近い外部都合

つまりこの repo は、

- tactical DDD / clean architecture の教材でありつつ
- strategic DDD の入口として context の接点も見せられる

ようになります。

---

## 3. Context Map とは何か

context map は、

**文脈同士がどうつながっているかの地図**

です。

この repo の最小イメージは、たとえば次です。

```text
[Sales / Checkout Context]
        |
        |  FulfillmentPort
        v
[ACL Adapter in adapters/fulfillment]
        |
        |  warehouse-specific request / response
        v
[Warehouse Context / External Service]
```

ここで大事なのは、

- application は `FulfillmentPort` しか知らない
- warehouse 側の field 名や意味は ACL adapter に閉じる
- context map は dependency diagram であると同時に meaning map でもある

という点です。

---

## 4. ACL は何を守るのか

ACL は anti-corruption layer の略です。

名前の通り、

**外の文脈の都合で自分の言葉が壊れるのを防ぐ層**

です。

もし ACL がないと、次のようなことが起きやすいです。

- core に warehouse 用の field 名が出てくる
- `Order` が shipment 都合で汚れる
- controller / use case に外部 API の DTO が入り込む
- 「この値は business 上何を意味するのか」が分かりにくくなる

ACL があると、

- `Order` は Sales 側の意味のまま保てる
- warehouse request は adapter で組み立てる
- response も adapter で internal meaning に戻せる

ようになります。

---

## 5. ACL は単なる format 変換なのか

完全に単なる format 変換ではありません。

もちろん、

- snake_case ↔ camelCase
- field 名の違い
- ID format の違い

のような変換も含みます。

でも ACL の本質は、

> **相手のモデルをそのまま自分の core model にしないこと**

です。

つまり ACL は、syntax よりも **meaning の保護** に近いです。

---

## 6. Full adoption / Partial adoption / Non-adoption

### フル採用が向く場合
- 複数 external system がある
- workflow が長い
- team / service / domain が増えている
- 用語衝突が起きやすい
- 境界設計の誤りが高コスト

この repo の Sprint 7〜12 の世界は、
フル採用寄りの論点を学ぶ教材です。

---

### 部分採用で十分な場合
- まずは use case 分離だけで十分
- persistence / external API の痛みはあるが、context split までは不要
- 1 チーム・1 アプリ・単純 workflow

この場合は、

- application / domain / adapter の分離
- port を痛いところにだけ切る

くらいで十分なことも多いです。

---

### 非採用でもよい場合
- CRUD 中心
- business rule が薄い
- external integration が少ない
- team も小さく変更コストも低い

この場合に何でも DDD / bounded context / ACL を入れると、
学習コストだけ増えてしまいます。

---

## 7. この repo での採用判断の見本

この repo 自体は教材なので、実案件より少し広めに扱っています。
でも実案件で同じことを全部やるべきとは限りません。

たとえば:

- `placeOrder` だけの小さな社内ツールなら
  - full strategic DDD は重いかもしれない
- payment / fulfillment / analytics / customer support が分かれてきたら
  - context map や ACL の価値が上がる

ここで大事なのは、

> **設計を採用する理由を、痛み・変更コスト・境界のズレで説明すること**

です。

---

## 8. Sprint 12 で本当に学びたいこと

Sprint 12 で見たいのは、
図だけ豪華にすることではありません。

見たいのは、

- どの context があるか
- どこで言葉がズレるか
- そのズレを ACL でどう守るか
- それを本当にやる価値があるのか

を理由つきで話せることです。

つまり Sprint 12 の観点は、

> **構造を分けること自体ではなく、意味の境界を守るためにどこまで分けるべきかを判断できるようになること**

にあります。

---

## 9. 一言まとめ

- bounded context は **意味が安定する範囲**
- context map は **文脈同士の関係図**
- ACL は **外の言葉で core が壊れるのを防ぐ層**
- フル採用するか部分採用に留めるかは、案件の痛みで決める

Sprint 12 で本当に学びたいのは、

> **設計パターンを増やすことではなく、どの境界を守るべきかを理由つきで選べるようになること**

です。
