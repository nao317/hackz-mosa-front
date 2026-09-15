import type { PlayableTrack } from "../audius/audius";
import type { FeedbackValue } from "./feedback";

const STORAGE_KEY = "feedback-playlists:v1";
export const FEEDBACK_CHANGED_EVENT = "feedback-playlists-changed";

export type FeedbackTrack = {
  feedback: FeedbackValue;
  track: PlayableTrack;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayableTrack(value: unknown): value is PlayableTrack {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.artist === "string" &&
    typeof value.streamUrl === "string" &&
    value.source === "audius"
  );
}

function isFeedbackTrack(value: unknown): value is FeedbackTrack {
  return (
    isRecord(value) &&
    (value.feedback === "good" || value.feedback === "bad") &&
    isPlayableTrack(value.track) &&
    typeof value.updatedAt === "string"
  );
}

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readEntries(): FeedbackTrack[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isFeedbackTrack) : [];
  } catch {
    return [];
  }
}

export function getFeedbackTracks(feedback: FeedbackValue): FeedbackTrack[] {
  return readEntries()
    .filter((entry) => entry.feedback === feedback)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getTrackFeedback(trackId: string): FeedbackValue | null {
  return readEntries().find((entry) => entry.track.id === trackId)?.feedback ?? null;
}

export function updateTrackFeedback(
  track: PlayableTrack,
  feedback: FeedbackValue | null,
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const nextEntries = readEntries().filter(
    (entry) => entry.track.id !== track.id,
  );
  if (feedback) {
    nextEntries.push({
      feedback,
      track,
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
    window.dispatchEvent(new Event(FEEDBACK_CHANGED_EVENT));
  } catch {
    // Playback feedback remains usable in memory if browser storage is unavailable.
  }
}
