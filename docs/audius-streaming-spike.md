# Audius API ストリーミング検証結果

## 結論

Audius REST APIから、ユーザー認証とAPI Keyなしで公開楽曲の情報を取得し、MP3ストリームへアクセスできることを確認した。MVPの公開楽曲再生には、ブラウザからAudius REST APIとstream endpointを直接利用できる。

React Routerサーバーで音源データを中継すると、帯域、Range Request、接続時間の負担をアプリ側が引き受けることになる。現時点ではAPI KeyやBearer Tokenを必要とせずCORSも許可されているため、BFFによる音源中継は採用しない。

## 検証日時

2026-09-14

## 検証結果

### 楽曲候補取得

```http
GET https://api.audius.co/v1/tracks/trending?limit=10
```

- API Keyなしで`200 OK`を確認した。
- `Access-Control-Allow-Origin: *`を確認した。
- 10件の楽曲情報を取得した。
- `is_stream_gated: false`かつ`access.stream: true`の楽曲を確認した。

### ストリーム取得

```http
GET https://api.audius.co/v1/tracks/{track_id}/stream
Range: bytes=0-1023
```

- Audius APIから配信ノードへの`302 Found`を確認した。
- リダイレクト先から`206 Partial Content`を確認した。
- `Content-Type: audio/mpeg`を確認した。
- `Accept-Ranges: bytes`と`Content-Range`を確認した。
- `Access-Control-Allow-Origin: *`を確認した。
- 取得した先頭1,024 bytesがMP3データであることを確認した。

以上から、ブラウザの`<audio>`要素へAudiusのstream endpointを設定し、リダイレクト追従、再生、シークを行える条件が揃っている。

## 実装判断

- 楽曲一覧: ブラウザからAudius REST APIを直接呼ぶ。
- 音源: `<audio src="https://api.audius.co/v1/tracks/{id}/stream">`で直接再生する。
- 認証: 公開楽曲の取得・再生では使用しない。
- API Key: MVPの疎通確認では使用しない。利用量やAudius側の要件が変わった場合に再検討する。
- Bearer Token: 使用しない。将来導入してもクライアントへ公開しない。
- SDK: 基本的なread-only REST呼び出しだけなので、`@audius/sdk`は追加しない。
- 対象楽曲: `is_stream_gated !== true`かつ`access.stream === true`の楽曲だけを選ぶ。
- 自動再生: 使用しない。ユーザーがnative audio controlsから再生する。

## 注意事項

- APIの認証要件、CORS、配信ノードの挙動は将来変更される可能性がある。
- Audius API障害、`429 Too Many Requests`、楽曲削除、gated化を考慮する必要がある。
- 通常のCIから実APIを呼ばず、レスポンス変換はfixtureでテストする。
- 本番利用前にAudius API Terms、Open Music License、楽曲ごとのアクセス条件を再確認する。

## 参考資料

- [Audius API Reference](https://api.audius.co/v1)
- [Audius JavaScript SDK](https://docs.audius.co/sdk/)
- [Audius API Plans](https://api.audius.co/plans)
- [Audius Terms of Service Update](https://blog.audius.co/posts/audius-terms-of-service-update)
