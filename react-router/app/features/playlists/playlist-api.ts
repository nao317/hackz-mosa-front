import type { PlayableTrack } from "../audius/audius";
import { getCurrentIDToken } from "../auth/auth.client";

export const MAX_PLAYLIST_TRACKS = 30;

export type PlaylistTrack = {
  id: number;
  trackId: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  audiusUrl?: string;
  durationSeconds?: number;
  streamUrl: string;
  source: "audius";
  position: number;
  createdAt: string;
};

export type Playlist = {
  id: number;
  name: string;
  description: string;
  trackCount: number;
  tracks: PlaylistTrack[];
  createdAt: string;
  updatedAt: string;
};

type APIErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class PlaylistAPIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PlaylistAPIError";
  }
}

const errorMessages: Record<string, string> = {
  duplicate_track: "この曲はすでにプレイリストに追加されています。",
  invalid_playlist: "プレイリストまたは曲の内容を確認してください。",
  invalid_track_order: "曲の一覧が更新されています。もう一度お試しください。",
  not_found: "プレイリストまたは曲が見つかりませんでした。",
  playlist_full: "プレイリストに追加できる曲は30曲までです。",
  unauthorized: "プレイリストを利用するにはログインしてください。",
};

async function playlistRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const idToken = await getCurrentIDToken();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
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
    const statusMessage =
      response.status === 404
        ? "プレイリスト機能を現在利用できません。しばらくしてからもう一度お試しください。"
        : response.status === 401
          ? errorMessages.unauthorized
          : undefined;
    throw new PlaylistAPIError(
      (code && errorMessages[code]) ||
        body.error?.message ||
        statusMessage ||
        body.message ||
        "プレイリストの操作に失敗しました。",
      response.status,
      code,
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function listPlaylists(): Promise<Playlist[]> {
  const response = await playlistRequest<{ playlists: Playlist[] }>(
    "/playlists",
  );
  return response.playlists;
}

export async function getPlaylist(playlistId: number): Promise<Playlist> {
  const response = await playlistRequest<{ playlist: Playlist }>(
    `/playlists/${playlistId}`,
  );
  return response.playlist;
}

export async function createPlaylist(
  name: string,
  description: string,
): Promise<Playlist> {
  const response = await playlistRequest<{ playlist: Playlist }>(
    "/playlists",
    {
      method: "POST",
      body: JSON.stringify({ name, description }),
    },
  );
  return response.playlist;
}

export function deletePlaylist(playlistId: number): Promise<void> {
  return playlistRequest(`/playlists/${playlistId}`, { method: "DELETE" });
}

export async function addPlaylistTrack(
  playlistId: number,
  track: PlayableTrack,
): Promise<Playlist> {
  const response = await playlistRequest<{ playlist: Playlist }>(
    `/playlists/${playlistId}/tracks`,
    {
      method: "POST",
      body: JSON.stringify(track),
    },
  );
  return response.playlist;
}

export async function reorderPlaylistTracks(
  playlistId: number,
  itemIds: number[],
): Promise<Playlist> {
  const response = await playlistRequest<{ playlist: Playlist }>(
    `/playlists/${playlistId}/tracks/order`,
    {
      method: "PUT",
      body: JSON.stringify({ itemIds }),
    },
  );
  return response.playlist;
}

export async function deletePlaylistTrack(
  playlistId: number,
  itemId: number,
): Promise<Playlist> {
  const response = await playlistRequest<{ playlist: Playlist }>(
    `/playlists/${playlistId}/tracks/${itemId}`,
    { method: "DELETE" },
  );
  return response.playlist;
}

export function toPlayableTrack(track: PlaylistTrack): PlayableTrack {
  return {
    id: track.trackId,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    audiusUrl: track.audiusUrl,
    durationSeconds: track.durationSeconds,
    streamUrl: track.streamUrl,
    source: track.source,
  };
}
