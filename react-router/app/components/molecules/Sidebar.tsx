import { useCallback, useEffect, useRef } from "react";
import { Home, Menu, Search, User, X } from "lucide-react";
import { Link } from "react-router";

import styles from "./Sidebar.module.css";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
};

export default function Sidebar({ isOpen, onClose, onOpen }: SidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeSidebar = useCallback(() => {
    onClose();
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSidebar();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSidebar, isOpen]);

  return (
    <>
      <button
        ref={menuButtonRef}
        className={styles.menuButton}
        type="button"
        aria-label="メニューを開く"
        aria-controls="main-navigation"
        aria-expanded={isOpen}
        tabIndex={isOpen ? -1 : 0}
        onClick={onOpen}
      >
        <Menu aria-hidden="true" size={24} />
      </button>

      <button
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        type="button"
        aria-label="メニューを閉じる"
        tabIndex={isOpen ? 0 : -1}
        onClick={closeSidebar}
      />

      <aside
        id="main-navigation"
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        aria-label="メインメニュー"
      >
        <button
          ref={closeButtonRef}
          className={styles.closeButton}
          type="button"
          aria-label="メニューを閉じる"
          onClick={closeSidebar}
        >
          <X aria-hidden="true" size={22} />
        </button>

        <nav className={styles.navigation}>
          <Link
            className={`${styles.navLink} ${styles.activeLink}`}
            to="/"
            aria-current="page"
            onClick={closeSidebar}
          >
            <Home aria-hidden="true" size={19} />
            <span>Home</span>
          </Link>
          <Link
            className={styles.navLink}
            to="/search"
            onClick={closeSidebar}
          >
            <Search aria-hidden="true" size={19} />
            <span>検索</span>
          </Link>
          <Link
            className={styles.navLink}
            to="/mypage"
            onClick={closeSidebar}
          >
            <User aria-hidden="true" size={19} />
            <span>マイページ</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
