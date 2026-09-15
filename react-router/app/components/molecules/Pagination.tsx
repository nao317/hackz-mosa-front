import { ChevronLeft, ChevronRight } from "lucide-react";

import styles from "./Pagination.module.css";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

type PageItem = number | "ellipsis";

function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  if (page <= 3) {
    return [1, 2, 3, "ellipsis", pageCount];
  }
  if (page >= pageCount - 2) {
    return [1, "ellipsis", pageCount - 2, pageCount - 1, pageCount];
  }
  return [1, "ellipsis", page, "ellipsis", pageCount];
}

export default function Pagination({
  page,
  pageCount,
  onPageChange,
}: PaginationProps) {
  const pageItems = getPageItems(page, pageCount);

  return (
    <nav className={styles.pagination} aria-label="ページ切り替え">
      <button
        className={styles.arrowButton}
        type="button"
        aria-label="前のページ"
        title="前のページ"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" size={19} />
      </button>

      <div className={styles.pages}>
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              className={styles.ellipsis}
              key={`ellipsis-${index}`}
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              className={styles.pageButton}
              type="button"
              key={item}
              aria-label={`${item}ページ目`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        className={styles.arrowButton}
        type="button"
        aria-label="次のページ"
        title="次のページ"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight aria-hidden="true" size={19} />
      </button>
    </nav>
  );
}
