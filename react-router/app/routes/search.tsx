import { useState } from "react";

import SearchSpace from "../components/atoms/SearchSpace";
import styles from "./search.module.css";

export default function SearchPage() {
	const [query, setQuery] = useState("");

	function handleSubmit(nextQuery: string) {
		setQuery(nextQuery);
	}

	return (
		<main className={styles.page}>
			<h1 className={styles.visuallyHidden}>検索</h1>
			<SearchSpace
				value={query}
				onChange={setQuery}
				onSubmit={handleSubmit}
				placeholder="検索する文字を入力"
			/>
		</main>
	);
}