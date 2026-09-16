import { useEffect, useState } from "react";
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
}: {
	useMapEvents: typeof import("react-leaflet")["useMapEvents"];
	onPoint: (point: LatLngTuple) => void;
}) {
	useMapEvents({
		contextmenu(event) {
			event.originalEvent.preventDefault();
		},
	});

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
			map.setView([location.latitude, location.longitude], map.getZoom());
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
				地図をクリックすると点を追加し、3点以上で範囲になります。
				{locationError && ` ${locationError}`}
			</p>
			<div className={styles.toolbar}>
				<button type="button" className={styles.clearButton} onClick={clearSelection}>
					クリア
				</button>
			</div>
			<div className={styles.mapFrame}>
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
