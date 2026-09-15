import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import styles from "./VoiceRecognation.module.css";

type SpeechRecognitionResultEvent = Event & {
	results: {
		[index: number]: {
			[index: number]: { transcript: string };
			isFinal: boolean;
		};
		length: number;
	};
};

type SpeechRecognitionErrorEvent = Event & { error: string };

interface SpeechRecognitionInstance {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onend: (() => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
	start: () => void;
	stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window & {
	SpeechRecognition?: SpeechRecognitionConstructor;
	webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoiceRecognationProps = {
	onResult: (transcript: string) => void;
	disabled?: boolean;
};

export default function VoiceRecognation({
	onResult,
	disabled = false,
}: VoiceRecognationProps) {
	const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
	const isListeningRef = useRef(false);
	const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [isSupported, setIsSupported] = useState(false);
	const [isListening, setIsListening] = useState(false);

	useEffect(() => {
		const speechWindow = window as SpeechRecognitionWindow;
		const Recognition =
			speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

		if (!Recognition) {
			return;
		}

		const recognition = new Recognition();
		recognition.continuous = true;
		recognition.interimResults = false;
		recognition.lang = "en-US";
		recognition.onresult = (event) => {
			const transcript = Array.from({ length: event.results.length }, (_, index) =>
				event.results[index][0].transcript,
			).join("");

			if (transcript.trim()) {
				onResult(transcript.trim());
			}
		};
		recognition.onend = () => {
			if (isListeningRef.current) {
				try {
					recognition.start();
				} catch {
					isListeningRef.current = false;
					setIsListening(false);
				}
			}
		};
		recognition.onerror = (event) => {
			if (event.error === "no-speech" && isListeningRef.current) {
				return;
			}

			isListeningRef.current = false;
			setIsListening(false);
		};
		recognitionRef.current = recognition;
		setIsSupported(true);

		return () => {
			isListeningRef.current = false;
			if (stopTimerRef.current) {
				clearTimeout(stopTimerRef.current);
			}
			recognition.stop();
			recognitionRef.current = null;
		};
	}, [onResult]);

	function toggleListening() {
		const recognition = recognitionRef.current;
		if (!recognition || disabled) {
			return;
		}

		if (isListening) {
			isListeningRef.current = false;
			if (stopTimerRef.current) {
				clearTimeout(stopTimerRef.current);
				stopTimerRef.current = null;
			}
			setIsListening(false);
			recognition.stop();
			return;
		}

		isListeningRef.current = true;
		setIsListening(true);
		try {
			recognition.start();
		} catch {
			isListeningRef.current = false;
			setIsListening(false);
			return;
		}
		stopTimerRef.current = setTimeout(() => {
			isListeningRef.current = false;
			setIsListening(false);
			recognition.stop();
			stopTimerRef.current = null;
		}, 10_000);
	}

	const isDisabled = disabled || !isSupported;

	return (
		<button
			className={`${styles.button} ${isListening ? styles.listening : ""}`}
			type="button"
			onClick={toggleListening}
			disabled={isDisabled}
			aria-label={isListening ? "音声認識を停止" : "音声認識を開始"}
			title={
				!isSupported
					? "このブラウザは音声認識に対応していません"
					: isListening
						? "音声認識を停止"
						: "音声認識を開始"
			}
			aria-pressed={isListening}
		>
			<span className={styles.icon}>
				{isListening ? (
					<Mic aria-hidden="true" size={18} />
				) : (
					<MicOff aria-hidden="true" size={18} />
				)}
			</span>
			{isListening && (
				<span className={styles.soundBars} aria-hidden="true">
					<span />
					<span />
					<span />
					<span />
					<span />
				</span>
			)}
		</button>
	);
}
