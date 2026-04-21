# 11. PostgreSQL Adapter + Migration: SQLite から本番寄り persistence へ進む

この章では、学習用の SQLite adapter から、より本番に近い PostgreSQL adapter へ進むときに何が増えるのかを整理します。

---

## まず結論

PostgreSQL adapter を追加する目的は、

> **repository を本物の RDBMS に接続したとき、どの責務が adapter 側に増えるのかを理解すること**

です。

SQLite の学習価値は高いですが、実務では通常さらに次が必要になります。

- connection lifecycle
- migration
- transaction 管理
- schema evolution
- SQL / row と domain model の mapping
- retry / timeout / observability との接続

---

## このリポジトリで PostgreSQL を追加する理由

この学習プロジェクトはすでに、
- in-memory repository
- SQLite repository

を持っています。

ここに PostgreSQL を足すと、次が比較しやすくなります。

### In-memory
- 一番本質が見える
- 最速でテストできる
- persistence の現実は薄い

### SQLite
- 単一ファイル DB として分かりやすい
- SQL を扱う入口になる
- 本番の複数接続や migration の複雑さはまだ薄い

### PostgreSQL
- 接続・migration・table 設計・transaction を意識できる
- 現実に一歩近い
- ただし learning curve は上がる

---

## 何を adapter 側に閉じ込めるのか

この章で大事なのは、

> **PostgreSQL を使うこと自体が問題ではなく、その detail を内側へ漏らさないこと**

です。

### domain / application に漏らしたくないもの
- SQL 文
- テーブル構造
- column 名
- `Pool`, `Client` の扱い
- migration 実行手順

### adapter 側に閉じ込めるもの
- query 実行
- row -> domain mapping
- domain -> row / payload mapping
- idempotency record の保存
- migration 実行の土台

---

## このサンプルで採用する方針

### 1. Repository interface は変えない
`OrderRepositoryPort` はそのまま維持します。

つまり application は:
- `save`
- `findById`
- `findByIdempotencyKey`

だけを知ります。

### 2. PostgreSQL adapter は row mapping を持つ
PostgreSQL adapter は、

- `orders`
- `idempotency_records`

テーブルを扱い、row から `Order` を再構築します。

### 3. migration は SQL ファイルで管理する
学習上は ORM に寄せすぎず、**migration は SQL で見える形**にします。

理由:
- テーブル設計を学びやすい
- outbox 追加時にもつながりやすい
- schema evolution の意識を持ちやすい

---

## このサンプルで想定するテーブル

## `orders`
保存対象の aggregate 本体。

### 役割
- `order_id`
- `customer_id`
- `payload_json`
- `created_at`
- `updated_at`

のような列を持つ。

`payload_json` に寄せる理由は、学習プロジェクトとして:
- row mapping を極端に複雑化しない
- aggregate 再構築の責務を見やすくする

ためです。

将来的には、lines を別テーブルに切る議論へ進んでもよいです。

---

## `idempotency_records`
同一 create request の再送を抑止するためのテーブル。

### 役割
- `idempotency_key`
- `order_id`
- `payment_confirmation_id`
- `created_at`

を持つ。

これにより、同じ request を再送しても既存の結果を返しやすくなります。

---

## migration を入れる理由

学習用の小さなプロジェクトでは、手で table を作っても動きます。
しかし実務へ近づくなら migration を避けて通れません。

### migration が必要な理由
- schema 変更履歴を残すため
- チームで同じ DB 形状を再現するため
- 新環境を同じ状態で立ち上げるため
- outbox 追加や column 追加に備えるため

### このプロジェクトで学んでほしいこと
- migration は application の責務ではない
- migration は infrastructure / adapter 側の detail である
- しかし system 全体を動かすには不可欠である

---

## transaction をどう考えるか

PostgreSQL adapter を入れると、transaction の現実感が増します。

この段階で学ぶべきことは:
- repository save は DB transaction の一部になりうる
- idempotency record と order save を同一 transaction に置く価値がある
- 将来 outbox を追加すると、さらに transaction 設計が重要になる

今の段階では、

> **PostgreSQL adapter は、outbox pattern の前提を整えるための足場**

と捉えるとよいです。

---

## テスト方針

この学習プロジェクトでは PostgreSQL adapter のテストを、
**`pg-mem` を使った in-memory PostgreSQL 互換環境** で行います。

理由:
- 本物の Postgres server を毎回立てなくてもよい
- SQL / table / query の感覚は学べる
- CI やローカル実行が簡単

ただし注意点もあります。

- `pg-mem` は実 PostgreSQL の完全代替ではない
- production 互換の最終保証にはならない
- それでも学習プロジェクトには十分価値がある

---

## この章で説明できるようになること

- なぜ SQLite の次に PostgreSQL を学ぶ価値があるのか
- なぜ migration は adapter / infrastructure 側の責務なのか
- row mapping を adapter に閉じる理由
- idempotency table が必要な理由
- PostgreSQL adapter が outbox pattern の前提になる理由

---

## 人に説明するときの言い方

> SQLite までは repository の抽象化を学ぶ入口です。  
> PostgreSQL adapter を追加すると、接続管理、migration、row mapping、idempotency record といった本番寄りの detail が見えてきます。  
> それでも application が知るのは repository port のままで、DB 都合は adapter 側に閉じ込める、というのが学習ポイントです。

---

## この章のチェックポイント

- なぜ migration は必要なのか説明できるか？
- なぜ migration は application の責務ではないのか説明できるか？
- PostgreSQL adapter がどの detail を隠すのか言えるか？
- なぜ `idempotency_records` テーブルが必要なのか説明できるか？
- なぜこの段階で `pg-mem` テストが有効なのか説明できるか？
