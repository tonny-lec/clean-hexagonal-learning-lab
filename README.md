# Clean / Hexagonal Learning Lab

Clean Architecture と Hexagonal Architecture を **「いつ使うのか」「何を守るのか」「現場でどう判断するのか」まで説明できるようになる** ための TypeScript 学習プロジェクトです。

このプロジェクトは 2 つの軸で学べるように作っています。

1. **文章で理解する**
   - なぜ必要になるのか
   - 用語の意味
   - 全体像
   - 現場での判断基準
2. **コードで理解する**
   - ドメイン
   - ユースケース
   - ポート
   - アダプター
   - 依存方向

---

## まず最初に押さえる結論

Clean / Hexagonal アーキテクチャは、

- ビジネスルールを長く守りたい
- 外部システムやフレームワークの変更に振り回されたくない
- テストしやすくしたい
- 画面、CLI、バッチ、API など入口が増えても中核を再利用したい

という課題があるときに効きます。

逆に、

- 1画面だけの小さなツール
- すぐ捨てるプロトタイプ
- 業務ルールより画面実装が中心

のような場合は、オーバーエンジニアリングになることもあります。

---

## 学習順序

### 1. 文章で全体像をつかむ
- `docs/01-why-this-architecture.md`
- `docs/02-terminology-and-big-picture.md`
- `docs/03-when-to-use-it-in-the-real-world.md`
- `docs/04-explain-it-to-others.md`

### 2. コードを読む
- `src/domain/`
- `src/application/ports/`
- `src/application/use-cases/`
- `src/adapters/`
- `src/index.ts`

### 3. テストで確認する
- `tests/order.test.ts`
- `tests/place-order.test.ts`

---

## このサンプルの題材

題材は **注文作成 (Place Order)** です。

理由:
- ドメインルールがある
- 価格参照、支払い、保存など外部依存がある
- Clean / Hexagonal の「中核と外部の分離」を説明しやすい

### レイヤー対応
- **Domain**: `Order`
- **Application / Use Case**: `placeOrder`
- **Ports**: `ProductCatalogPort`, `OrderRepositoryPort`, `PaymentGatewayPort`
- **Adapters**: In-memory repository, static catalog, console payment gateway
- **Composition Root**: `src/index.ts`

---

## ディレクトリ構成

```text
clean-hexagonal-learning-lab/
  docs/
    01-why-this-architecture.md
    02-terminology-and-big-picture.md
    03-when-to-use-it-in-the-real-world.md
    04-explain-it-to-others.md
  src/
    domain/
    application/
      ports/
      use-cases/
    adapters/
      console/
      in-memory/
    index.ts
  tests/
```

---

## 実行方法

```bash
cd ~/workspace/hermes-agent/clean-hexagonal-learning-lab
npm install
npm test
npm run build
npm run dev
```

---

## このプロジェクトで見るべきポイント

### 1. 依存方向
- `domain` は外側を知らない
- `application` は port に依存する
- `adapters` が port を実装する
- `index.ts` で配線する

### 2. 変更に強い場所
たとえば支払い方法を変えても、`placeOrder` の本質は変えずに済みます。

### 3. テストしやすさ
ユースケースは本物の DB や外部 API なしで試せます。

---

## 学習ゴール

このプロジェクトを終えると、少なくとも次を説明できる状態を目指せます。

- Clean / Hexagonal は何の課題を解くのか
- Clean と Hexagonal はどう似ていて、何が違うのか
- Port / Adapter / Use Case / Entity の意味
- 現場でどんなときに採用候補になるか
- どんなときは採用しないほうがいいか
- なぜテストしやすくなるのか

---

## 次のおすすめ発展

この学習ラボを深めるなら、次の順で拡張すると理解が定着します。

1. REST API アダプターを追加する
2. 永続化アダプターを SQLite / PostgreSQL に変える
3. 入力 DTO とドメインモデルの変換を明示する
4. 失敗時のエラー設計を整理する
5. 依存注入コンテナを導入するか判断する

そうすると、"図として分かる" から "現場で設計できる" に進めます。
