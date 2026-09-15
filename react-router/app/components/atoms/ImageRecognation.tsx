import { useEffect, useRef } from "react";
import type { GestureRecognizer } from "@mediapipe/tasks-vision";

import styles from "./ImageRecognation.module.css";

type HandGesture = "good" | "bad";

type ImageRecognationProps = {
	onGesture?: (gesture: HandGesture) => void;
};

export default function ImageRecognation({ onGesture }: ImageRecognationProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	function stopCamera() {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
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
			} catch {
				return;
			}
		}

		async function startCamera() {
			if (!navigator.mediaDevices?.getUserMedia) {
				return;
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user" },
					audio: false,
				});
				if (isStopped) {
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
				return;
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
				return;
			}

			context.drawImage(video, 0, 0, canvas.width, canvas.height);
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
		<>
			<video
				ref={videoRef}
				className={styles.recognitionSource}
				muted
				playsInline
				aria-hidden="true"
			/>
			<canvas ref={canvasRef} className={styles.recognitionCanvas} aria-hidden="true" />
		</>
	);
}
