import type { Location } from "../Geolocation/Location";
import type { GeoPoint, MapMapping } from "./map-mapping-api";

export function isLocationInsideArea(
	location: Pick<Location, "latitude" | "longitude">,
	area: GeoPoint[],
): boolean {
	if (area.length < 3) {
		return false;
	}

	let isInside = false;
	for (
		let index = 0, previous = area.length - 1;
		index < area.length;
		previous = index++
	) {
		const currentPoint = area[index];
		const previousPoint = area[previous];
		const crossesLatitude =
			currentPoint.latitude > location.latitude !==
			previousPoint.latitude > location.latitude;
		const intersectionLongitude =
			((previousPoint.longitude - currentPoint.longitude) *
				(location.latitude - currentPoint.latitude)) /
				(previousPoint.latitude - currentPoint.latitude) +
			currentPoint.longitude;

		if (crossesLatitude && location.longitude < intersectionLongitude) {
			isInside = !isInside;
		}
	}
	return isInside;
}

export function findMappingAtLocation(
	location: Pick<Location, "latitude" | "longitude"> | undefined,
	mappings: MapMapping[],
): MapMapping | undefined {
	if (!location) {
		return undefined;
	}
	return mappings.find((mapping) =>
		isLocationInsideArea(location, mapping.area),
	);
}

export function getAreaPlaybackTransition(
	previousMappingId: number | null,
	nextMappingId: number | null,
): { changed: boolean; shouldStart: boolean } {
	const changed = previousMappingId !== nextMappingId;
	return {
		changed,
		shouldStart: changed && nextMappingId !== null,
	};
}
