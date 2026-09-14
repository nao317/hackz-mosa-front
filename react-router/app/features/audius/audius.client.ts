import { selectPlayableTrack, type PlayableTrack } from "./audius";

const STALE_WHISKEY_TRACK_URL = "https://api.audius.co/v1/tracks/RKjXQ";

export async function fetchStaleWhiskeyTrack(
  signal?: AbortSignal,
): Promise<PlayableTrack> {
  const response = await fetch(STALE_WHISKEY_TRACK_URL, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Audius API request failed with ${response.status}.`);
  }

  return selectPlayableTrack(await response.json());
}
