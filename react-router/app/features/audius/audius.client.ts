import { selectPlayableTracks, type PlayableTrack } from "./audius";

const AUDIUS_SEARCH_URL = "https://api.audius.co/v1/tracks/search";

export async function searchAudiusTracks(
  query: string,
  signal?: AbortSignal,
): Promise<PlayableTrack[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const params = new URLSearchParams({ query: normalizedQuery });
  const response = await fetch(`${AUDIUS_SEARCH_URL}?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Audius API request failed with ${response.status}.`);
  }

  return selectPlayableTracks(await response.json());
}
