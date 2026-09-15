import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  UserPlus,
  UserRound,
} from "lucide-react";

import Sidebar from "../components/molecules/Sidebar";
import {
  createAccountWithEmail,
  observeAuthState,
  requestPasswordReset,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
  type AuthUser,
} from "../features/auth/auth.client";
import styles from "./mypage.module.css";

const GOOGLE_LOGO_URL =
  "https://developers.google.com/static/identity/images/g-logo.png";
const APPLE_LOGO_URL =
  "https://appleid.cdn-apple.com/appleid/button/logo?color=white&border=false&border_radius=0&scale=1&size=48";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser };
type AuthMode = "login" | "signup";

export function meta() {
  return [{ title: "マイページ" }];
}

function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "このメールアドレスはすでに登録されています。",
    "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません。",
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/popup-closed-by-user": "認証画面が閉じられました。",
    "auth/too-many-requests": "時間をおいてからもう一度お試しください。",
    "auth/weak-password": "パスワードは6文字以上で入力してください。",
  };

  if (messages[code]) {
    return messages[code];
  }
  return error instanceof Error ? error.message : "認証に失敗しました。";
}

function getProviderLabel(providerId: string): string {
  const labels: Record<string, string> = {
    "apple.com": "Apple",
    "google.com": "Google",
    password: "メールアドレス",
  };
  return labels[providerId] ?? providerId;
}

export default function MyPage() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    return observeAuthState((user) => {
      setAuthState(
        user
          ? { status: "authenticated", user }
          : { status: "unauthenticated" },
      );
    });
  }, []);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage(null);
    setNoticeMessage(null);
  }

  async function runAuth(action: () => Promise<AuthUser>) {
    setIsPending(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const user = await action();
      setAuthState({ status: "authenticated", user });
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAuth(() =>
      mode === "login"
        ? signInWithEmail(email, password)
        : createAccountWithEmail(email, password),
    );
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    try {
      await requestPasswordReset(email.trim());
      setNoticeMessage("パスワード再設定メールを送信しました。");
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  async function handleSignOut() {
    setIsPending(true);
    setErrorMessage(null);
    try {
      await signOutCurrentUser();
      setAuthState({ status: "unauthenticated" });
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={styles.appShell}>
      <Sidebar
        isOpen={isSidebarOpen}
        onOpen={openSidebar}
        onClose={closeSidebar}
      />
      <main className={styles.page}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1>マイページ</h1>
          </header>

          {authState.status === "loading" && (
            <p className={styles.status} aria-live="polite">
              アカウント情報を確認しています。
            </p>
          )}

          {authState.status === "unauthenticated" && (
            <section className={styles.authPanel} aria-label="アカウント認証">
              <div className={styles.providerButtons}>
                <button
                  className={styles.providerButton}
                  type="button"
                  disabled={isPending}
                  onClick={() => void runAuth(signInWithGoogle)}
                >
                  <span className={styles.providerIconFrame}>
                    <img src={GOOGLE_LOGO_URL} alt="" />
                  </span>
                  <span>Googleで続ける</span>
                  <span aria-hidden="true" />
                </button>
                <button
                  className={styles.providerButton}
                  type="button"
                  disabled={isPending}
                  onClick={() => void runAuth(signInWithApple)}
                >
                  <span className={styles.providerIconFrame}>
                    <img
                      className={styles.appleLogo}
                      src={APPLE_LOGO_URL}
                      alt=""
                    />
                  </span>
                  <span>Appleで続ける</span>
                  <span aria-hidden="true" />
                </button>
              </div>

              <div className={styles.divider}>
                <span>またはメールアドレスで</span>
              </div>

              <div className={styles.modeTabs} role="tablist" aria-label="認証方法">
                <button
                  className={mode === "login" ? styles.activeTab : undefined}
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  onClick={() => changeMode("login")}
                >
                  <LogIn aria-hidden="true" size={18} />
                  ログイン
                </button>
                <button
                  className={mode === "signup" ? styles.activeTab : undefined}
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  onClick={() => changeMode("signup")}
                >
                  <UserPlus aria-hidden="true" size={18} />
                  新規登録
                </button>
              </div>

              <form className={styles.form} onSubmit={handleEmailSubmit}>
                <label className={styles.field}>
                  <Mail aria-hidden="true" size={21} />
                  <span className={styles.visuallyHidden}>メールアドレス</span>
                  <input
                    type="email"
                    value={email}
                    placeholder="メールアドレス"
                    autoComplete="email"
                    required
                    disabled={isPending}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                  />
                </label>

                <label className={styles.field}>
                  <LockKeyhole aria-hidden="true" size={21} />
                  <span className={styles.visuallyHidden}>パスワード</span>
                  <input
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    placeholder="パスワード"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={6}
                    required
                    disabled={isPending}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                  />
                  <button
                    className={styles.passwordVisibility}
                    type="button"
                    aria-label={
                      isPasswordVisible
                        ? "パスワードを隠す"
                        : "パスワードを表示"
                    }
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                  >
                    {isPasswordVisible ? (
                      <EyeOff aria-hidden="true" size={21} />
                    ) : (
                      <Eye aria-hidden="true" size={21} />
                    )}
                  </button>
                </label>

                {mode === "login" && (
                  <button
                    className={styles.resetPassword}
                    type="button"
                    disabled={isPending}
                    onClick={() => void handlePasswordReset()}
                  >
                    パスワードを忘れた方
                  </button>
                )}

                <p
                  className={
                    errorMessage
                      ? styles.formError
                      : noticeMessage
                        ? styles.formNotice
                        : styles.formMessage
                  }
                  role={errorMessage ? "alert" : "status"}
                  aria-live="polite"
                >
                  {errorMessage ?? noticeMessage ?? ""}
                </p>

                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={isPending}
                >
                  {mode === "login" ? (
                    <LogIn aria-hidden="true" size={19} />
                  ) : (
                    <UserPlus aria-hidden="true" size={19} />
                  )}
                  {isPending
                    ? "処理中"
                    : mode === "login"
                      ? "ログイン"
                      : "アカウントを作成"}
                </button>
              </form>
            </section>
          )}

          {authState.status === "authenticated" && (
            <section className={styles.accountPanel} aria-label="アカウント情報">
              <div className={styles.profile}>
                <div className={styles.avatar}>
                  {authState.user.photoUrl ? (
                    <img src={authState.user.photoUrl} alt="" />
                  ) : (
                    <UserRound aria-hidden="true" size={36} />
                  )}
                </div>
                <div className={styles.profileText}>
                  <h2>{authState.user.displayName ?? "名前未設定"}</h2>
                  <p>{authState.user.email ?? "メールアドレス未登録"}</p>
                </div>
              </div>

              <dl className={styles.accountDetails}>
                <div>
                  <dt>ユーザーID</dt>
                  <dd>{authState.user.id}</dd>
                </div>
                <div>
                  <dt>認証方法</dt>
                  <dd>
                    {authState.user.providers.map(getProviderLabel).join("、") ||
                      "未設定"}
                  </dd>
                </div>
                <div>
                  <dt>メール確認</dt>
                  <dd>{authState.user.emailVerified ? "確認済み" : "未確認"}</dd>
                </div>
              </dl>

              {errorMessage && (
                <p className={styles.formError} role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                className={styles.signOutButton}
                type="button"
                disabled={isPending}
                onClick={() => void handleSignOut()}
              >
                <LogOut aria-hidden="true" size={19} />
                ログアウト
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
