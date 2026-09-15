import { useCallback, useState } from "react";

import Sidebar from "../components/molecules/Sidebar";
import styles from "./mypage.module.css";

export function meta() {
  return [{ title: "マイページ" }];
}

export default function MyPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <div className={styles.appShell}>
      <Sidebar
        isOpen={isSidebarOpen}
        onOpen={openSidebar}
        onClose={closeSidebar}
      />
      <main className={styles.page}>
        <h1 className={styles.visuallyHidden}>マイページ</h1>
      </main>
    </div>
  );
}
