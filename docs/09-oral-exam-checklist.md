# 09. 説明できるレベルに達したかを測る口頭試問リスト

このドキュメントは、Clean / Hexagonal Architecture を **「知っている」から「自分の言葉で説明できる」** 段階まで到達したかを測るための口頭試問リストです。

使い方はシンプルです。

- 声に出して答える
- できれば 30 秒 / 1 分 / 3 分で答え分ける
- 詰まったところは対応する docs とコードへ戻る
- 最終的には、相手のレベルに合わせて説明を変えられることを目指す

---

## 判定の目安

### レベル1: 用語を知っている
- 用語の定義を短く言える
- ただし理由や使い分けはまだ弱い

### レベル2: サンプルで説明できる
- このリポジトリのコードを使って説明できる
- どのファイルが何の役割か言える

### レベル3: 判断理由を言える
- なぜこの分け方をするのか説明できる
- いつ採用し、いつ見送るか言える

### レベル4: 人に教えられる
- 初学者に順序立てて説明できる
- よくある誤解やアンチパターンまで説明できる

この口頭試問のゴールは、**最低でもレベル3、理想はレベル4** です。

---

## Part 1. 30秒で説明できるか

### Q1. Clean / Hexagonal Architecture を30秒で説明してください
**見たいポイント**
- 業務の中心を外部都合から守る設計だと言えるか
- DB / フレームワーク / 外部 API が detail だと言えるか
- 変更容易性やテスト容易性に触れられるか

**合格ラインの例**
> Clean / Hexagonal Architecture は、業務の中心ロジックを DB や Web フレームワーク、外部 API などの詳細から分離する設計です。中核は port を通じて外とやり取りし、adapter が具体実装を担います。その結果、変更に強く、テストしやすくなります。

---

### Q2. Clean と Hexagonal の違いを30秒で説明してください
**見たいポイント**
- Hexagonal は接続点 / ports and adapters の視点
- Clean は依存方向 / layer の視点
- 実務ではかなり重なって使われると説明できるか

---

## Part 2. 用語を自分の言葉で言えるか

### Q3. Domain とは何ですか？
**見たいポイント**
- 業務そのものの知識だと言えるか
- HTTP / DB / framework 知識を持ち込まないと言えるか
- この repo では `Order` や `Money` を例に出せるか

### Q4. Entity とは何ですか？
**見たいポイント**
- identity を持つ業務上重要な概念と言えるか
- この repo では `Order` を例に出せるか

### Q5. Value Object とは何ですか？
**見たいポイント**
- identity より意味が重要だと言えるか
- この repo では `Money` を例に出せるか
- ただの `number` と何が違うか言えるか

### Q6. Use Case とは何ですか？
**見たいポイント**
- 「何をしたいか」を表す処理だと言えるか
- Domain を使い、port を呼び、業務フローを組み立てると言えるか
- `placeOrder` や `getOrderSummary` を例に出せるか

### Q7. Port とは何ですか？
**見たいポイント**
- アプリケーションが外に依頼したいことの抽象だと言えるか
- この repo の catalog / payment / repository / publisher / unit of work を例に出せるか

### Q8. Adapter とは何ですか？
**見たいポイント**
- port の具体実装だと言えるか
- in-memory / SQLite / HTTP / CLI / batch を例に出せるか

### Q9. Composition Root とは何ですか？
**見たいポイント**
- 実装を配線する場所だと言えるか
- この repo では `src/composition-root.ts` だと言えるか

### Q10. Dependency Rule とは何ですか？
**見たいポイント**
- 依存方向を内側へ保つ原則だと言えるか
- domain は外側を知らないと言えるか
- application は port を知ってよいが adapter 実装は知らないと言えるか

---

## Part 3. このリポジトリを使って説明できるか

### Q11. この repo の Domain はどこですか？ なぜそこが Domain ですか？
**見たいポイント**
- `src/domain/` を挙げられるか
- `Order` と `Money` の責務を説明できるか

### Q12. `Order` はなぜ Domain / Entity ですか？
**見たいポイント**
- 不変条件を持つ
- 注文作成という業務概念を表している
- 外部技術都合を持っていない

### Q13. `Money` はなぜ Value Object ですか？
**見たいポイント**
- amount + currency を意味として扱っている
- 加算や乗算のルールを閉じ込めている
- identity を主題にしていない

### Q14. `placeOrder` はなぜ Use Case ですか？
**見たいポイント**
- 業務フローを組み立てている
- port を使っている
- HTTP や DB の具象に依存していない

### Q15. `getOrderSummary` を追加した意味は何ですか？
**見たいポイント**
- command と query を分けて考える入口
- 更新系と参照系の責務差を学べる

### Q16. `handlePlaceOrderHttp` はなぜ adapter ですか？
**見たいポイント**
- HTTP request を use case 入力へ変換している
- application error を HTTP response へ写像している
- 業務フロー本体は持っていない

### Q17. `order-presenter.ts` を分けた理由は何ですか？
**見たいポイント**
- 出力形式を use case から切り離すため
- CLI / HTTP / 他形式への展開を見据えた境界であると説明できるか

### Q18. `SqliteOrderRepository` を追加した意味は何ですか？
**見たいポイント**
- persistence detail を差し替えられることを見せるため
- in-memory との違いを学ぶため
- 本番現実ではこれだけでは足りないと分かっているか

---

## Part 4. なぜそう切るのかを説明できるか

### Q19. なぜ request JSON をそのまま domain に渡さないのですか？
**見たいポイント**
- 外側の都合を内側へ漏らさないため
- request DTO / command / domain の責務差を説明できるか

### Q20. なぜ payment gateway を port にするのですか？
**見たいポイント**
- 外部サービスは detail だから
- 差し替えとテスト容易性のため
- Fake / Stripe / Failure 実装に発展できると説明できるか

### Q21. なぜ repository を port にするのですか？
**見たいポイント**
- persistence を detail に閉じ込めるため
- domain / use case を DB 都合から守るため

### Q22. なぜ presenter / mapper を使うことがあるのですか？
**見たいポイント**
- 出力形式の都合を use case に持ち込まないため
- 入口だけでなく出口にも adapter の責務があると説明できるか

### Q23. なぜ複数 entrypoint を用意したのですか？
**見たいポイント**
- CLI / batch / HTTP から同じ use case を使い回せることを示すため
- 入口ごとのロジック複製を避けるため

---

## Part 5. 実務論点を説明できるか

### Q24. いつ Clean / Hexagonal を採用する価値が高いですか？
**見たいポイント**
- 長期運用
- 複雑な業務ルール
- 外部依存が多い
- 複数 entrypoint
- テスト容易性が重要

### Q25. いつは過剰設計になりやすいですか？
**見たいポイント**
- 単純 CRUD
- すぐ捨てる試作
- 業務ルールが薄いケース

### Q26. 「全面採用」ではなく「部分採用」で十分とはどういう意味ですか？
**見たいポイント**
- use case だけ分ける
- repository だけ抽象化する
- 入出力 DTO だけ切る
などの現実的説明ができるか

### Q27. idempotency を考えないと何が起きますか？
**見たいポイント**
- create API の再送で二重処理の危険
- payment / order の二重実行の問題

### Q28. transaction と整合性は何が違いますか？
**見たいポイント**
- transaction は一つの境界の管理
- 整合性は外部 API を跨ぐともっと難しい
- saga / outbox / compensation に発展する話だと分かっているか

### Q29. domain event は何のためにありますか？
**見たいポイント**
- 業務上意味のある出来事を表す
- 後続処理へつなげる
- 単なるログではない

### Q30. in-memory repository と SQLite repository の違いから何を学ぶべきですか？
**見たいポイント**
- port / adapter の本質
- persistence detail の差し替え
- 現実では migration / transaction / mapping がさらに必要になると理解しているか

### Q31. Outbox pattern は何を守るために入れるのですか？
**見たいポイント**
- save 成功 / publish 失敗の穴を説明できるか
- 「まず durable に残す」意味を言えるか
- sync publish と outbox persist の役割差を説明できるか

### Q32. Outbox table は domain event そのものと何が違いますか？
**見たいポイント**
- domain event は業務上の出来事
- outbox は配送待ちの durable record
- integration event へ発展する余地を理解しているか

### Q33. Authentication と Authorization の違いは何ですか？
**見たいポイント**
- actor を組み立てることと、操作可否判定の違い
- adapter と application の責務差を説明できるか
- 401 と 403 の違いを言えるか

### Q34. なぜ current actor は input adapter で組み立て、policy は application に置くのですか？
**見たいポイント**
- HTTP detail を内側へ漏らさないため
- 入口ごとに認可ロジックを複製しないため
- high-value order のように業務データが必要な判定があると説明できるか

### Q35. outbox dispatcher は何の責務を持ちますか？
**見たいポイント**
- pending message を運ぶ責務
- business transaction の外で delivery を進めること
- mark-as-published / retry / dead-letter の境界だと説明できるか
- poller / worker から呼ばれる理由を言えるか

### Q36. domain event と integration event は何が違いますか？
**見たいポイント**
- domain 内の意味と外部共有契約の違い
- versioning / schema evolution の論点に触れられるか
- `order.placed.v1` と `order.placed.v2` を同時に流す意味を説明できるか

### Q37. なぜ `getOrderSummary` を read model に寄せる価値があるのですか？
**見たいポイント**
- query side を write model から分ける意味
- eventual consistency を受け入れる代わりに読みやすさを得る構造だと言えるか

### Q38. observability と audit log は何が違いますか？
**見たいポイント**
- 運用観測と履歴証跡の違い
- 同じログっぽく見えても目的が違うと説明できるか

---

## Part 6. 説明の深さを測る応用問題

### Q39. この repo でまだ「本番向けには足りない」ところはどこですか？
**見たいポイント**
- dedicated worker / scheduler 運用
- real message broker / queue 連携
- subscriber ごとの failure policy / replay
- schema registry / contract governance
- structured logging / metrics / tracing の強化
- advanced validation / rate limit / security hardening
- 実 DB / 実外部認証 / 実決済接続
などを挙げられるか

### Q40. この repo を次に1段階進化させるなら何を追加しますか？ なぜですか？
**見たいポイント**
- dedicated worker / cron / queue consumer
- real broker adapter
- subscriber replay / re-drive
- contract compatibility check
- policy composition
- payment workflow の saga 化
- observability の structured 化
など、**Sprint 6 の実装済み要素の次** を目的付きで答えられるか

### Q41. 「Controller に業務ルールが入る」と何がつらいのですか？
**見たいポイント**
- 再利用できない
- テストしづらい
- 入口ごとにロジックが散る
- 変更影響が広がる

### Q42. Ubiquitous Language はなぜ DDD の出発点なのですか？
**見たいポイント**
- docs と code と会話の意味を揃えるためだと言えるか
- `Order`, `Payment`, `Money` を混同しない意義を説明できるか

### Q43. なぜ `Order` を aggregate root と見なすのですか？
**見たいポイント**
- 一貫性境界
- repository が aggregate 単位である理由
- `OrderLine` は内部要素であり、`Payment` は外側 detail だと言えるか

### Q44. 「なんでも interface 化する」のはなぜダメですか？
**見たいポイント**
- 変わらないものまで抽象化すると儀式になる
- 学習コストや複雑さが上がる
- 境界は痛いところから切るべきだと理解しているか

### Q45. 「この案件はフル採用すべきではない」と説明してください
**見たいポイント**
- 非採用や部分採用の理由を言えるか
- 設計は目的でなく手段だと理解しているか

---

## Part 7. 最終口頭試問

以下は最終確認です。録音して 5〜10 分で話せると強いです。

### 最終試問1
**このリポジトリを使って、Clean / Hexagonal Architecture を初学者に5分で説明してください。**

**見たいポイント**
- 目的
- 用語
- コード例
- 価値
- 限界
- 採用判断

### 最終試問2
**このプロジェクトを題材に、「なぜこの構造にしたのか」をチームメンバーへ説明してください。**

**見たいポイント**
- 何を core と見たか
- 何を detail と見たか
- なぜ port を置いたか
- なぜ adapter を分けたか
- どこまでやって、どこからはまだやっていないか

### 最終試問3
**新しい案件を1つ想定して、Clean / Hexagonal をフル採用・部分採用・非採用のどれにするか、その理由を説明してください。**

**見たいポイント**
- 知識の再生ではなく、判断ができているか

---

## 合格の目安

### 合格
- 用語の定義だけでなく「なぜ」を言える
- この repo の具体例を使って説明できる
- 採用 / 非採用の判断理由を言える
- 相手に合わせて説明の粒度を変えられる

### まだ途中
- フォルダ名でしか説明できない
- 用語は言えるが、理由が言えない
- なんでも interface 化したくなる
- 「いつ使わないか」が言えない

---

## 最後に

この口頭試問の本当のゴールは、

> **構造を暗記したかではなく、課題に対して理由付きで設計を選び、その理由を人に説明できるか**

です。

もしこのリストにかなり答えられるなら、あなたはもう「学習者」から **設計を語れる人** に近づいています。
