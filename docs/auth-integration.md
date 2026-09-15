# Firebase Authentication / Go API 接続契約

## フロントエンド設定

`react-router/.env.example`をもとにFirebase Webアプリの公開設定値を指定する。

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:8080
```

ローカル開発ではReact Routerが5173、Go APIが8080で起動する。リバースプロキシで同一Originに
まとめる環境だけ `VITE_API_BASE_URL` を空にする。

Firebase Authenticationでは次のプロバイダーを有効にする。

- メールアドレス / パスワード
- Google

## Go API

### `POST /api/v1/auth/login`

Firebaseログイン直後、フロントエンドが次のAuthorizationヘッダーを送信する。

```text
Authorization: Bearer <Firebase ID token>
```

GoバックエンドはFirebase Admin SDKの`VerifyIDTokenAndCheckRevoked`でトークンを検証し、検証済みの`uid`をPostgreSQLのアプリ内ユーザーへ関連付ける。

### `GET /api/v1/me`

認証が必要なリクエストでは、最新のFirebase ID tokenを同じAuthorizationヘッダーで送信する。
ログアウトはFirebase Client SDKの`signOut`でクライアントの認証状態を破棄する。

フロントエンドとGo APIが異なるオリジンの場合は、Go側の`CORS_ALLOWED_ORIGINS`で許可するOriginを限定する。
