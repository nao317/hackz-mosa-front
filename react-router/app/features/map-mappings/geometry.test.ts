import { describe, expect, it } from "vitest";

import type { MapMapping } from "./map-mapping-api";
import {
	findMappingAtLocation,
	getAreaPlaybackTransition,
	isLocationInsideArea,
} from "./geometry";

const area = [
	{ latitude: 35, longitude: 139 },
	{ latitude: 36, longitude: 139 },
	{ latitude: 36, longitude: 140 },
	{ latitude: 35, longitude: 140 },
];

const mapping: MapMapping = {
	id: 1,
	area,
	track: {
		id: "track-1",
		title: "Mapped song",
		artist: "Artist",
		streamUrl: "https://example.com/track-1",
		source: "audius",
	},
	createdAt: "2026-09-16T00:00:00Z",
};

describe("map mapping geometry", () => {
	it("detects whether the current location is inside a polygon", () => {
		expect(
			isLocationInsideArea({ latitude: 35.5, longitude: 139.5 }, area),
		).toBe(true);
		expect(
			isLocationInsideArea({ latitude: 34.9, longitude: 139.5 }, area),
		).toBe(false);
	});

	it("selects the first registered area containing the current location", () => {
		expect(
			findMappingAtLocation(
				{ latitude: 35.5, longitude: 139.5 },
				[mapping],
			)?.id,
		).toBe(mapping.id);
		expect(
			findMappingAtLocation(
				{ latitude: 34.9, longitude: 139.5 },
				[mapping],
			),
		).toBeUndefined();
	});

	it("starts once on entry and rearms only after exit", () => {
		expect(getAreaPlaybackTransition(null, 1)).toEqual({
			changed: true,
			shouldStart: true,
		});
		expect(getAreaPlaybackTransition(1, 1)).toEqual({
			changed: false,
			shouldStart: false,
		});
		expect(getAreaPlaybackTransition(1, null)).toEqual({
			changed: true,
			shouldStart: false,
		});
		expect(getAreaPlaybackTransition(null, 1).shouldStart).toBe(true);
	});
});
