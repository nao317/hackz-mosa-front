import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayableTrack } from "../audius/audius";
import {
  getFeedbackTracks,
  getTrackFeedback,
  updateTrackFeedback,
} from "./feedback-storage";

const track: PlayableTrack = {
  id: "track-1",
  title: "Night Drive",
  artist: "Test Artist",
  streamUrl: "https://example.com/stream/track-1",
  source: "audius",
};

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("feedback playlists", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      localStorage: createStorage(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores a track in its selected feedback playlist", () => {
    updateTrackFeedback(track, "good");

    expect(getTrackFeedback(track.id)).toBe("good");
    expect(getFeedbackTracks("good").map((entry) => entry.track.id)).toEqual([
      track.id,
    ]);
  });

  it("moves and removes a track without leaving duplicates", () => {
    updateTrackFeedback(track, "good");
    updateTrackFeedback(track, "bad");

    expect(getFeedbackTracks("good")).toEqual([]);
    expect(getFeedbackTracks("bad")).toHaveLength(1);

    updateTrackFeedback(track, null);
    expect(getTrackFeedback(track.id)).toBeNull();
    expect(getFeedbackTracks("bad")).toEqual([]);
  });
});
