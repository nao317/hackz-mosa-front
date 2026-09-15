import { useEffect, useRef, useState } from "react";
import type { LatLng, LatLngExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

import {
	startLocationPolling,
	type Location,
} from "../../features/Geolocation/Location";
import styles from "./MapPoint.module.css";

type MapPointProps = {
	onPointsChange?: (points: LatLngTuple[]) => void;
	onAreaChange?: (area: LatLngTuple[]) => void;
	onLocationChange?: (location: Location) => void;
};

function MapInteraction({
	useMapEvents,
	onPoint,
	onDrawStart,
	onDrawMove,
	onDrawEnd,
}: {
	useMapEvents: typeof import("react-leaflet")["useMapEvents"];
	onPoint: (point: LatLngTuple) => void;
	onDrawStart: (point: LatLngTuple) => void;
	onDrawMove: (point: LatLngTuple) => void;
	onDrawEnd: () => void;
}) {
	const map = useMapEvents({
		contextmenu(event) {
			event.originalEvent.preventDefault();
		},
	});
	const drawingRef = useRef(false);

	useEffect(() => {
		const container = map.getContainer();

		function handleMouseDown(event: MouseEvent) {
			const point = map.containerPointToLatLng(
				map.mouseEventToContainerPoint(event),
			);

			if (event.button === 2) {
				event.preventDefault();
				drawingRef.current = true;
				onDrawStart(toTuple(point));
				map.dragging.disable();
			}
		}

		function handleMouseMove(event: MouseEvent) {
			if (drawingRef.current && event.buttons === 2) {
				const point = map.containerPointToLatLng(
					map.mouseEventToContainerPoint(event),
				);
				onDrawMove(toTuple(point));
			}
		}

		function handleMouseUp() {
			if (drawingRef.current) {
				drawingRef.current = false;
				onDrawEnd();
				map.dragging.enable();
			}
		}

		container.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			container.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			map.dragging.enable();
		};
	}, [map, onDrawEnd, onDrawMove, onDrawStart]);

	useMapEvents({
		click(event) {
			onPoint(toTuple(event.latlng));
		},
	});

	return null;
}

function CurrentLocationController({
	useMap,
	location,
}: {
	useMap: typeof import("react-leaflet")["useMap"];
	location: Location | null;
}) {
	const map = useMap();

	useEffect(() => {
		if (location) {
			map.setView([location.latitude, location.longitude], 15);
		}
	}, [location, map]);

	return null;
}

function toTuple(latlng: LatLng): LatLngTuple {
	return [latlng.lat, latlng.lng];
}

export default function MapPoint({
	onPointsChange,
	onAreaChange,
	onLocationChange,
}: MapPointProps) {
	const [leafletComponents, setLeafletComponents] = useState<
		typeof import("react-leaflet") | null
	>(null);
	const [points, setPoints] = useState<LatLngTuple[]>([]);
	const [area, setArea] = useState<LatLngTuple[]>([]);
	const [location, setLocation] = useState<Location | null>(null);
	const [locationError, setLocationError] = useState<string | null>(null);

	useEffect(() => {
		void import("react-leaflet").then(setLeafletComponents);
		return startLocationPolling(
			(nextLocation) => {
				setLocation(nextLocation);
				onLocationChange?.(nextLocation);
				setLocationError(null);
			},
			(error) => setLocationError(error.message),
		);
	}, [onLocationChange]);

	function addPoint(point: LatLngTuple) {
		setPoints((currentPoints) => {
			const nextPoints = [...currentPoints, point];
			onPointsChange?.(nextPoints);
			return nextPoints;
		});
	}

	function startDrawing(point: LatLngTuple) {
		setArea([point]);
	}

	function moveDrawing(point: LatLngTuple) {
		setArea((currentArea) => [...currentArea, point]);
	}

	function finishDrawing() {
		setArea((currentArea) => {
			if (currentArea.length > 2) {
				const closedArea = [...currentArea, currentArea[0]];
				onAreaChange?.(closedArea);
				return closedArea;
			}

			onAreaChange?.([]);
			return [];
		});
	}

	function clearSelection() {
		setPoints([]);
		setArea([]);
		onPointsChange?.([]);
		onAreaChange?.([]);
	}

	if (!leafletComponents) {
		return <div className={styles.loading}>地図を読み込んでいます。</div>;
	}

	const { CircleMarker, MapContainer, Polyline, TileLayer } = leafletComponents;

	return (
		<section className={styles.wrapper} aria-label="地図上の範囲指定">
			<p className={styles.instructions}>
				左ドラッグで地図を移動、右ドラッグで範囲を描画できます。
				{locationError && ` ${locationError}`}
			</p>
			<div className={styles.toolbar}>
				<button type="button" className={styles.clearButton} onClick={clearSelection}>
					クリア
				</button>
			</div>
			<MapContainer
				className={styles.map}
				center={[35.681236, 139.767125]}
				zoom={13}
				scrollWheelZoom
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<CurrentLocationController
					useMap={leafletComponents.useMap}
					location={location}
				/>
				<MapInteraction
					useMapEvents={leafletComponents.useMapEvents}
					onPoint={addPoint}
					onDrawStart={startDrawing}
					onDrawMove={moveDrawing}
					onDrawEnd={finishDrawing}
				/>
				{points.map((point, index) => (
					<CircleMarker center={point} radius={8} key={`${point.join("-")}-${index}`} />
				))}
				{location && (
					<CircleMarker
						center={[location.latitude, location.longitude]}
						radius={7}
						pathOptions={{ color: "#d4af37", fillColor: "#d4af37" }}
					/>
				)}
				{area.length > 1 && <Polyline positions={area as LatLngExpression[]} />}
			</MapContainer>
		</section>
	);
}
