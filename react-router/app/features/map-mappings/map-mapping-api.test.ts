import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/auth.client", () => ({
	getCurrentIDToken: vi.fn().mockResolvedValue("firebase-token"),
}));

import type { PlayableTrack } from "../audius/audius";
import { getCurrentIDToken } from "../auth/auth.client";
import {
	createMapMapping,
	deleteMapMapping,
	listMapMappings,
	MapMappingAPIError,
	type MapMapping,
} from "./map-mapping-api";

const track: PlayableTrack = {
	id: "track-1",
	title: "Mapped song",
	artist: "Artist",
	streamUrl: "https://example.com/track-1",
	source: "audius",
};

const mapping: MapMapping = {
	id: 8,
	area: [
		{ latitude: 35.68, longitude: 139.76 },
		{ latitude: 35.69, longitude: 139.76 },
		{ latitude: 35.69, longitude: 139.77 },
	],
	track,
	createdAt: "2026-09-16T00:00:00Z",
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.mocked(getCurrentIDToken).mockResolvedValue("firebase-token");
});

describe("map mapping API client", () => {
	it("lists mappings with a Firebase bearer token", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ mappings: [mapping] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(listMapMappings()).resolves.toEqual([mapping]);
		const [, init] = fetchMock.mock.calls[0];
		expect(new Headers(init.headers).get("Authorization")).toBe(
			"Bearer firebase-token",
		);
	});

	it("creates a mapping with its area and track", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ mapping }), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await createMapMapping(mapping.area, track);
		const [, init] = fetchMock.mock.calls[0];
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body)).toEqual({ area: mapping.area, track });
	});

	it("deletes a mapping by id", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(null, { status: 204 }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await deleteMapMapping(mapping.id);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain("/api/v1/map-mappings/8");
		expect(init.method).toBe("DELETE");
	});

	it("requires a signed-in Firebase user", async () => {
		vi.mocked(getCurrentIDToken).mockRejectedValueOnce(new Error("signed out"));

		await expect(listMapMappings()).rejects.toEqual(
			expect.objectContaining<Partial<MapMappingAPIError>>({
				status: 401,
				code: "unauthorized",
				message: "マッピング機能を利用するにはログインしてください。",
			}),
		);
	});
});
