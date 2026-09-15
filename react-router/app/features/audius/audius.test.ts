import { describe, expect, it } from "vitest";

import {
  getSelectedTrackFromNavigation,
  selectPlayableTrack,
  selectPlayableTracks,
} from "./audius";

describe("selectPlayableTrack", () => {
  it("maps a single track response", () => {
    const track = selectPlayableTrack({
      data: {
        id: "RKjXQ",
        title: "Stale Whiskey",
        permalink: "/lofi_universe/stale-whiskey-119561",
        duration: 192,
        is_stream_gated: false,
        access: { stream: true },
        user: { name: "lofi universe" },
      },
    });

    expect(track.title).toBe("Stale Whiskey");
    expect(track.artist).toBe("lofi universe");
    expect(track.streamUrl).toBe(
      "https://api.audius.co/v1/tracks/RKjXQ/stream",
    );
  });

  it("maps the first public streamable Audius track", () => {
    const track = selectPlayableTrack({
      data: [
        {
          id: "track-id",
          title: "Track title",
          permalink: "/artist/track-title",
          duration: 120,
          is_stream_gated: false,
          access: { stream: true },
          artwork: { "480x480": "https://example.com/artwork.jpg" },
          user: { name: "Artist name" },
        },
      ],
    });

    expect(track).toEqual({
      id: "track-id",
      title: "Track title",
      artist: "Artist name",
      artworkUrl: "https://example.com/artwork.jpg",
      audiusUrl: "https://audius.co/artist/track-title",
      durationSeconds: 120,
      streamUrl: "https://api.audius.co/v1/tracks/track-id/stream",
      source: "audius",
    });
  });

  it("skips gated and non-streamable tracks", () => {
    const track = selectPlayableTrack({
      data: [
        {
          id: "gated",
          title: "Gated",
          is_stream_gated: true,
          access: { stream: true },
          user: { name: "Artist" },
        },
        {
          id: "unavailable",
          title: "Unavailable",
          is_stream_gated: false,
          is_streamable: false,
          access: { stream: true },
          user: { name: "Artist" },
        },
        {
          id: "disabled",
          title: "Disabled",
          is_stream_gated: false,
          access: { stream: false },
          user: { name: "Artist" },
        },
        {
          id: "public",
          title: "Public",
          is_stream_gated: false,
          access: { stream: true },
          user: { name: "Artist" },
        },
      ],
    });

    expect(track.id).toBe("public");
  });

  it("rejects responses without playable tracks", () => {
    expect(() => selectPlayableTrack({ data: [] })).toThrow(
      "Audius API returned no public streamable tracks.",
    );
  });

  it("rejects invalid API responses", () => {
    expect(() => selectPlayableTrack({})).toThrow(
      "Audius API returned an invalid response.",
    );
  });

  it("maps every public streamable search result", () => {
    const tracks = selectPlayableTracks({
      data: [
        {
          id: "first",
          title: "First",
          is_stream_gated: false,
          access: { stream: true },
          user: { name: "Artist" },
        },
        {
          id: "gated",
          title: "Gated",
          is_stream_gated: true,
          access: { stream: true },
          user: { name: "Artist" },
        },
        {
          id: "second",
          title: "Second",
          is_stream_gated: false,
          access: { stream: true },
          user: { name: "Artist" },
        },
      ],
    });

    expect(tracks.map((track) => track.id)).toEqual(["first", "second"]);
  });

  it("reads a valid selected track from navigation state", () => {
    expect(
      getSelectedTrackFromNavigation({
        selectedTrack: {
          id: "track-id",
          title: "Track title",
          artist: "Artist",
          streamUrl: "https://api.audius.co/v1/tracks/track-id/stream",
          source: "audius",
        },
      })?.id,
    ).toBe("track-id");
    expect(getSelectedTrackFromNavigation({ selectedTrack: null })).toBeUndefined();
  });
});
