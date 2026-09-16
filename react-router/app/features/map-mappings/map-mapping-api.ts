import type { PlayableTrack } from "../audius/audius";
import { getCurrentIDToken } from "../auth/auth.client";

export type GeoPoint = {
	latitude: number;
	longitude: number;
};

export type MapMapping = {
	id: number;
	area: GeoPoint[];
	track: PlayableTrack;
	createdAt: string;
};

type APIErrorBody = {
	error?: {
		code?: string;
		message?: string;
	};
};

export class MapMappingAPIError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string,
	) {
		super(message);
		this.name = "MapMappingAPIError";
	}
}

const errorMessages: Record<string, string> = {
	invalid_map_mapping: "範囲または曲の内容を確認してください。",
	not_found: "登録したエリアが見つかりませんでした。",
	unauthorized: "マッピング機能を利用するにはログインしてください。",
};

async function mapMappingRequest<T>(
	path: string,
	init: RequestInit = {},
): Promise<T> {
	let idToken: string;
	try {
		idToken = await getCurrentIDToken();
	} catch {
		throw new MapMappingAPIError(errorMessages.unauthorized, 401, "unauthorized");
	}
	const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
	const headers = new Headers(init.headers);
	headers.set("Accept", "application/json");
	headers.set("Authorization", `Bearer ${idToken}`);
	if (init.body) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
		...init,
		headers,
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as APIErrorBody;
		const code = body.error?.code;
		throw new MapMappingAPIError(
			(code && errorMessages[code]) ||
				body.error?.message ||
				(response.status === 404
					? "マッピングAPIを利用できません。バックエンドを更新してください。"
					: "マッピングの操作に失敗しました。"),
			response.status,
			code,
		);
	}
	if (response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

export async function listMapMappings(): Promise<MapMapping[]> {
	const response = await mapMappingRequest<{ mappings: MapMapping[] }>(
		"/map-mappings",
	);
	return response.mappings;
}

export async function createMapMapping(
	area: GeoPoint[],
	track: PlayableTrack,
): Promise<MapMapping> {
	const response = await mapMappingRequest<{ mapping: MapMapping }>(
		"/map-mappings",
		{
			method: "POST",
			body: JSON.stringify({ area, track }),
		},
	);
	return response.mapping;
}

export function deleteMapMapping(mappingId: number): Promise<void> {
	return mapMappingRequest(`/map-mappings/${mappingId}`, {
		method: "DELETE",
	});
}
