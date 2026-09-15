import { useEffect } from "react";

type SoundRecognationProps = {
	onSnap: () => void;
};

const SNAP_COOLDOWN_MS = 800;
const SNAP_THRESHOLD = 50 / 255;

export default function SoundRecognation({
	onSnap,
}: SoundRecognationProps) {
	useEffect(() => {
		let isStopped = false;
		let animationFrameId = 0;
		let audioContext: AudioContext | undefined;
		let stream: MediaStream | undefined;
		let source: MediaStreamAudioSourceNode | undefined;
		let analyser: AnalyserNode | undefined;
		let lastSnapAt = -SNAP_COOLDOWN_MS;
		let wasAboveThreshold = false;
		let previousPeak = 0;

		async function listenForSnap() {
			if (!navigator.mediaDevices?.getUserMedia) {
				return;
			}

			try {
				stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						autoGainControl: false,
						echoCancellation: false,
						noiseSuppression: false,
					},
					video: false,
				});

				if (isStopped) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}

				audioContext = new AudioContext();
				if (audioContext.state === "suspended") {
					await audioContext.resume();
				}

				source = audioContext.createMediaStreamSource(stream);
				analyser = audioContext.createAnalyser();
				analyser.fftSize = 1024;
				analyser.smoothingTimeConstant = 0.05;
				source.connect(analyser);

				const timeDomainData = new Uint8Array(analyser.fftSize);
				let noiseFloor = 0.025;

				function detectSnap() {
					if (!analyser || isStopped) {
						return;
					}

					analyser.getByteTimeDomainData(timeDomainData);

					let peak = 0;
					let squaredSum = 0;
					for (const sample of timeDomainData) {
						const amplitude = Math.abs(sample - 128) / 128;
						peak = Math.max(peak, amplitude);
						squaredSum += amplitude * amplitude;
					}

					const rms = Math.sqrt(squaredSum / timeDomainData.length);
					const threshold = Math.max(SNAP_THRESHOLD, noiseFloor * 2.5);
					const isAboveThreshold =
						peak > threshold || rms > threshold * 0.45;
					const isSnapWaveform =
						peak > threshold &&
						peak - previousPeak > 0.04 &&
						peak / Math.max(rms, 0.001) > 1.5;
					const now = performance.now();

					if (
						isAboveThreshold &&
						(!wasAboveThreshold || isSnapWaveform) &&
						now - lastSnapAt >= SNAP_COOLDOWN_MS
					) {
						lastSnapAt = now;
						onSnap();
					}

					if (!isAboveThreshold) {
						noiseFloor = noiseFloor * 0.98 + rms * 0.02;
					}
					wasAboveThreshold = isAboveThreshold;
					previousPeak = peak;
					animationFrameId = requestAnimationFrame(detectSnap);
				}

				detectSnap();
			} catch {
				return;
			}
		}

		void listenForSnap();

		return () => {
			isStopped = true;
			cancelAnimationFrame(animationFrameId);
			source?.disconnect();
			analyser?.disconnect();
			stream?.getTracks().forEach((track) => track.stop());
			void audioContext?.close();
		};
	}, [onSnap]);

	return null;
}
