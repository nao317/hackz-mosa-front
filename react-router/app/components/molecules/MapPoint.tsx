import { useCallback, useEffect, useRef, useState } from "react";
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
	isEditing,
	onPoint,
	onDrawStart,
	onDrawMove,
	onDrawEnd,
}: {
	useMapEvents: typeof import("react-leaflet")["useMapEvents"];
	isEditing: boolean;
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

		function handlePointerDown(event: PointerEvent) {
			if (!isEditing || (event.pointerType === "mouse" && event.button !== 0)) {
				return;
			}

			const point = map.containerPointToLatLng(
				map.mouseEventToContainerPoint(event),
			);

			event.preventDefault();
		drawingRef.current = true;
			map.dragging.disable();
			container.setPointerCapture(event.pointerId);
			onDrawStart(toTuple(point));
		}

		function handlePointerMove(event: PointerEvent) {
			if (drawingRef.current && isEditing) {
				const point = map.containerPointToLatLng(
					map.mouseEventToContainerPoint(event),
				);
				onDrawMove(toTuple(point));
			}
		}

		function handlePointerUp() {
			if (drawingRef.current) {
				drawingRef.current = false;
				onDrawEnd();
				map.dragging.enable();
			}
		}

		container.addEventListener("pointerdown", handlePointerDown);
		container.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			container.removeEventListener("pointerdown", handlePointerDown);
			container.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			if (drawingRef.current) {
				drawingRef.current = false;
				onDrawEnd();
			}
			map.dragging.enable();
		};
	}, [isEditing, map, onDrawEnd, onDrawMove, onDrawStart]);

	useMapEvents({
		click(event) {
			if (!isEditing) {
				onPoint(toTuple(event.latlng));
			}
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
	const [isEditing, setIsEditing] = useState(false);

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
			const nextArea =
				nextPoints.length >= 3
					? [...nextPoints, nextPoints[0]]
					: nextPoints;

			setArea(nextArea);
			onPointsChange?.(nextPoints);
			onAreaChange?.(nextPoints.length >= 3 ? nextArea : []);
			return nextPoints;
		});
	}

	const startDrawing = useCallback((point: LatLngTuple) => {
		setArea([point]);
	}, []);

	const moveDrawing = useCallback((point: LatLngTuple) => {
		setArea((currentArea) => [...currentArea, point]);
	}, []);

	const finishDrawing = useCallback(() => {
		setArea((currentArea) => {
			if (currentArea.length > 2) {
				const closedArea = [...currentArea, currentArea[0]];
				onAreaChange?.(closedArea);
				return closedArea;
			}

			onAreaChange?.([]);
			return [];
		});
	}, [onAreaChange]);

	function clearSelection() {
		setPoints([]);
		setArea([]);
		onPointsChange?.([]);
		onAreaChange?.([]);
	}

	if (!leafletComponents) {
		return <div className={styles.loading}>地図を読み込んでいます。</div>;
	}

	const { CircleMarker, MapContainer, Polygon, Polyline, TileLayer } =
		leafletComponents;

	return (
		<section className={styles.wrapper} aria-label="地図上の範囲指定">
			<p className={styles.instructions}>
				編集モードOFFで地図をクリックすると点を追加し、3点以上で図形になります。
				編集モードONでは指または左ドラッグで手書きできます。
				{locationError && ` ${locationError}`}
			</p>
			<div className={styles.toolbar}>
				<button type="button" className={styles.clearButton} onClick={clearSelection}>
					クリア
				</button>
			</div>
			<div className={styles.mapFrame}>
				<button
					type="button"
					className={isEditing ? styles.editButtonActive : styles.editButton}
					aria-pressed={isEditing}
					onClick={() => setIsEditing((editing) => !editing)}
				>
					{isEditing ? "編集を終了" : "範囲を編集"}
				</button>
				<MapContainer
					className={`${styles.map} ${isEditing ? styles.editingMap : ""}`}
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
					isEditing={isEditing}
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
				{area.length === 3 && <Polyline positions={area as LatLngExpression[]} />}
				{area.length >= 4 && <Polygon positions={area as LatLngExpression[]} />}
				</MapContainer>
			</div>
		</section>
	);
}
