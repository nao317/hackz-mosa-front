import { type ChangeEvent, type FormEvent, useId } from "react";
import { Search } from "lucide-react";

import styles from "./SearchSpace.module.css";
import VoiceRecognation from "./VoiceRecognation";
import ImageRecognation from "./ImageRecognation";

type SearchSpaceProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	onVoiceResult?: (value: string) => void;
	placeholder?: string;
	label?: string;
	disabled?: boolean;
};

export default function SearchSpace({
	value,
	onChange,
	onSubmit,
	onVoiceResult,
	placeholder = "検索",
	label = "検索",
	disabled = false,
}: SearchSpaceProps) {
	const inputId = useId();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const query = value.trim();

		if (query) {
			onSubmit(query);
		}
	}

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		onChange(event.target.value);
	}

	return (
		<form className={styles.form} role="search" onSubmit={handleSubmit}>
			<label className={styles.label} htmlFor={inputId}>
				{label}
			</label>
			<div className={styles.field}>
				<input
					id={inputId}
					className={styles.input}
					type="search"
					value={value}
					placeholder={placeholder}
					onChange={handleChange}
					disabled={disabled}
				/>
				{onVoiceResult && (
					<VoiceRecognation
						onResult={onVoiceResult}
						disabled={disabled}
					/>
				)}
				<ImageRecognation />
				<button
					className={styles.button}
					type="submit"
					aria-label="検索を実行"
					title="検索を実行"
					disabled={disabled || !value.trim()}
				>
					<Search aria-hidden="true" size={18} />
				</button>
			</div>
		</form>
	);
}
