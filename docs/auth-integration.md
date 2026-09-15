# Firebase Authentication / Go API 接続契約

## フロントエンド設定

`react-router/.env.example`をもとにFirebase Webアプリの公開設定値を指定する。

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL`が空の場合、Go APIはフロントエンドと同じオリジンにあるものとして扱う。

Firebase Authenticationでは次のプロバイダーを有効にする。

- メールアドレス / パスワード
- Google
- Apple

Apple認証ではFirebaseのコールバックURLをApple DeveloperのReturn URLへ登録する。

## Go API

### `POST /api/auth/session`

Firebaseログイン直後、フロントエンドが次のAuthorizationヘッダーを送信する。

```text
Authorization: Bearer <Firebase ID token>
```

GoバックエンドはFirebase Admin SDKの`VerifyIDToken`でトークンを検証し、検証済みの`uid`をアプリ内ユーザーへ関連付ける。Cookieセッションを発行する場合は`HttpOnly`、`Secure`、適切な`SameSite`属性を付ける。

### `DELETE /api/auth/session`

ログアウト時にサーバー側セッションを破棄する。Firebase側のログアウトとは別に、Go側で発行したCookieやセッションレコードを無効化する。

フロントエンドとGo APIが異なるオリジンの場合は、Go側で許可するOriginを限定し、credential付きCORSを設定する。
