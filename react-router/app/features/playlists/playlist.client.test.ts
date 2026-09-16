import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/auth.client", () => ({
  getCurrentIDToken: vi.fn().mockResolvedValue("firebase-token"),
}));

import {
  PlaylistAPIError,
  createPlaylist,
  deletePlaylist,
  listPlaylists,
  reorderPlaylistTracks,
  toPlayableTrack,
  type Playlist,
} from "./playlist-api";

const playlist: Playlist = {
  id: 7,
  name: "朝の曲",
  description: "通勤用",
  trackCount: 0,
  tracks: [],
  createdAt: "2026-09-16T00:00:00Z",
  updatedAt: "2026-09-16T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("playlist API client", () => {
  it("lists playlists with a Firebase bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ playlists: [playlist] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPlaylists()).resolves.toEqual([playlist]);
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer firebase-token",
    );
  });

  it("creates a playlist with the backend request shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ playlist }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createPlaylist("朝の曲", "通勤用");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/playlists");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "朝の曲",
      description: "通勤用",
    });
  });

  it("sends every item id when reordering tracks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ playlist }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await reorderPlaylistTracks(7, [3, 1, 2]);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ itemIds: [3, 1, 2] });
  });

  it("deletes a playlist with the backend endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deletePlaylist(7);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/playlists/7");
    expect(init.method).toBe("DELETE");
  });

  it("maps backend error codes to a user-facing error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "playlist_full", message: "full" },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(createPlaylist("朝の曲", "")).rejects.toEqual(
      expect.objectContaining<Partial<PlaylistAPIError>>({
        code: "playlist_full",
        status: 422,
        message: "プレイリストに追加できる曲は30曲までです。",
      }),
    );
  });

  it("reports a missing playlist API as temporarily unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(listPlaylists()).rejects.toEqual(
      expect.objectContaining<Partial<PlaylistAPIError>>({
        status: 404,
        message:
          "プレイリスト機能を現在利用できません。しばらくしてからもう一度お試しください。",
      }),
    );
  });

  it("converts a stored playlist track back to a playable track", () => {
    expect(
      toPlayableTrack({
        id: 12,
        trackId: "audius-id",
        title: "Song",
        artist: "Artist",
        streamUrl: "https://api.audius.co/v1/tracks/audius-id/stream",
        source: "audius",
        position: 1,
        createdAt: "2026-09-16T00:00:00Z",
      }).id,
    ).toBe("audius-id");
  });
});
