import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import type { GestureRecognizer } from "@mediapipe/tasks-vision";

import styles from "./ImageRecognation.module.css";

type ImageAnalysis = {
	averageColor: string;
	brightness: string;
	width: number;
	height: number;
};

type HandGesture = "good" | "bad";

type ImageRecognationProps = {
	onGesture?: (gesture: HandGesture) => void;
};

function toHex(value: number): string {
	return Math.round(value).toString(16).padStart(2, "0");
}

export default function ImageRecognation({ onGesture }: ImageRecognationProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	function stopCamera() {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	}

	function closeCamera() {
		stopCamera();
		setMessage("カメラを停止しました。");
	}

	useEffect(() => {
		let isStopped = false;
		let animationFrameId = 0;
		let lastAnalysisAt = 0;
		let lastGesture: HandGesture | null = null;
		let matchingGestureFrames = 0;
		let lastGestureNotifiedAt = 0;
		let gestureRecognizer: GestureRecognizer | null = null;

		async function loadGestureRecognizer() {
			if (!onGesture) {
				return;
			}

			try {
				const { FilesetResolver, GestureRecognizer } = await import(
					"@mediapipe/tasks-vision"
				);
				const vision = await FilesetResolver.forVisionTasks(
					"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
				);
				gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
					baseOptions: {
						modelAssetPath:
							"https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
					},
					runningMode: "VIDEO",
					numHands: 1,
				});
				if (!isStopped) {
					setMessage(null);
				}
			} catch {
				if (!isStopped) {
					setMessage("手の認識モデルを読み込めませんでした。");
				}
			}
		}

		async function startCamera() {
			if (!navigator.mediaDevices?.getUserMedia) {
				setMessage("このブラウザではカメラを利用できません。");
				return;
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user" },
					audio: false,
				});
				if (isStopped) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}

				streamRef.current = stream;
				const video = videoRef.current;
				if (!video) {
					return;
				}
				video.srcObject = stream;
				await video.play();
			} catch {
				if (!isStopped) {
					setMessage("カメラへのアクセスが許可されていません。");
				}
			}
		}

		function analyzeFrame(timestamp: number) {
			const video = videoRef.current;
			const canvas = canvasRef.current;
			if (!video || !canvas || timestamp - lastAnalysisAt < 250) {
				animationFrameId = requestAnimationFrame(analyzeFrame);
				return;
			}
			if (video.videoWidth === 0 || video.videoHeight === 0) {
				animationFrameId = requestAnimationFrame(analyzeFrame);
				return;
			}

			lastAnalysisAt = timestamp;
			if (gestureRecognizer && onGesture) {
				try {
					const result = gestureRecognizer.recognizeForVideo(video, timestamp);
					const category = result.gestures[0]?.[0]?.categoryName;
					const gesture: HandGesture | null =
						category === "Thumb_Up"
							? "good"
							: category === "Thumb_Down"
								? "bad"
								: null;
					if (gesture && gesture === lastGesture) {
						matchingGestureFrames += 1;
					} else {
						lastGesture = gesture;
						matchingGestureFrames = gesture ? 1 : 0;
					}
					if (
						gesture &&
						matchingGestureFrames >= 3 &&
						timestamp - lastGestureNotifiedAt > 1_500
					) {
						onGesture(gesture);
						lastGestureNotifiedAt = timestamp;
						matchingGestureFrames = 0;
					}
				} catch {
					lastGesture = null;
					matchingGestureFrames = 0;
				}
			}
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const context = canvas.getContext("2d");
			if (!context) {
				setMessage("映像の解析に失敗しました。");
				return;
			}

			context.drawImage(video, 0, 0, canvas.width, canvas.height);
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			let red = 0;
			let green = 0;
			let blue = 0;
			let brightness = 0;
			for (let index = 0; index < imageData.data.length; index += 4) {
				red += imageData.data[index];
				green += imageData.data[index + 1];
				blue += imageData.data[index + 2];
				brightness +=
					0.299 * imageData.data[index] +
					0.587 * imageData.data[index + 1] +
					0.114 * imageData.data[index + 2];
			}

			const pixelCount = imageData.data.length / 4;
			const averageBrightness = brightness / pixelCount;
			setAnalysis({
				averageColor: `#${toHex(red / pixelCount)}${toHex(green / pixelCount)}${toHex(blue / pixelCount)}`,
				brightness:
					averageBrightness >= 170
						? "明るい"
						: averageBrightness >= 85
							? "標準"
							: "暗い",
				width: canvas.width,
				height: canvas.height,
			});
			animationFrameId = requestAnimationFrame(analyzeFrame);
		}

		void startCamera();
		void loadGestureRecognizer();
		animationFrameId = requestAnimationFrame(analyzeFrame);

		return () => {
			isStopped = true;
			cancelAnimationFrame(animationFrameId);
			stopCamera();
			void gestureRecognizer?.close();
		};
	}, [onGesture]);

	return (
		<div className={styles.overlay} role="presentation">
					<section
						className={styles.dialog}
						role="dialog"
						aria-modal="true"
						aria-labelledby="image-recognition-title"
					>
						<header className={styles.header}>
							<h2 id="image-recognition-title">カメラ映像を解析</h2>
							<button
								className={styles.closeButton}
								type="button"
								onClick={closeCamera}
								aria-label="カメラを閉じる"
							>
								<X aria-hidden="true" size={20} />
							</button>
						</header>

						<div className={styles.previewFrame}>
							<video
								ref={videoRef}
								className={styles.video}
								muted
								playsInline
								aria-label="カメラのライブ映像"
							/>
							<ScanLine className={styles.scanLine} aria-hidden="true" size={36} />
						</div>
						<canvas ref={canvasRef} className={styles.hiddenCanvas} />

						{message && <p className={styles.message}>{message}</p>}
						{analysis && (
							<dl className={styles.analysis}>
								<div>
									<dt>平均色</dt>
									<dd>
										<span
											className={styles.colorSwatch}
											style={{ backgroundColor: analysis.averageColor }}
										/>
										{analysis.averageColor}
									</dd>
								</div>
								<div>
									<dt>明るさ</dt>
									<dd>{analysis.brightness}</dd>
								</div>
								<div>
									<dt>解像度</dt>
									<dd>{analysis.width} x {analysis.height}</dd>
								</div>
							</dl>
						)}

					</section>
		</div>
	);
}
