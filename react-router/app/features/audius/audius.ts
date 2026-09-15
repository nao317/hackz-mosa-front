export type PlayableTrack = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  audiusUrl?: string;
  durationSeconds?: number;
  streamUrl: string;
  source: "audius";
};

const AUDIUS_API_BASE_URL = "https://api.audius.co/v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getArtworkUrl(track: Record<string, unknown>): string | undefined {
  if (!isRecord(track.artwork)) {
    return undefined;
  }

  for (const size of ["480x480", "1000x1000", "150x150"]) {
    const url = track.artwork[size];
    if (typeof url === "string" && url.length > 0) {
      return url;
    }
  }

  return undefined;
}

function toPlayableTrack(value: unknown): PlayableTrack | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  if (value.is_stream_gated === true) {
    return null;
  }

  if (value.is_streamable === false || value.is_available === false) {
    return null;
  }

  if (!isRecord(value.access) || value.access.stream !== true) {
    return null;
  }

  if (
    typeof value.title !== "string" ||
    !isRecord(value.user) ||
    typeof value.user.name !== "string"
  ) {
    return null;
  }

  const permalink =
    typeof value.permalink === "string" ? value.permalink : undefined;
  const duration =
    typeof value.duration === "number" && Number.isFinite(value.duration)
      ? value.duration
      : undefined;

  return {
    id: value.id,
    title: value.title,
    artist: value.user.name,
    artworkUrl: getArtworkUrl(value),
    audiusUrl: permalink ? `https://audius.co${permalink}` : undefined,
    durationSeconds: duration,
    streamUrl: `${AUDIUS_API_BASE_URL}/tracks/${encodeURIComponent(value.id)}/stream`,
    source: "audius",
  };
}

export function selectPlayableTracks(response: unknown): PlayableTrack[] {
  if (!isRecord(response) || !("data" in response)) {
    throw new Error("Audius API returned an invalid response.");
  }

  const tracks = Array.isArray(response.data) ? response.data : [response.data];
  return tracks
    .map(toPlayableTrack)
    .filter((track): track is PlayableTrack => track !== null);
}

export function selectPlayableTrack(response: unknown): PlayableTrack {
  const [track] = selectPlayableTracks(response);

  if (!track) {
    throw new Error("Audius API returned no public streamable tracks.");
  }

  return track;
}

export function getSelectedTrackFromNavigation(
  value: unknown,
): PlayableTrack | undefined {
  if (!isRecord(value) || !isRecord(value.selectedTrack)) {
    return undefined;
  }

  const track = value.selectedTrack;
  if (
    typeof track.id !== "string" ||
    typeof track.title !== "string" ||
    typeof track.artist !== "string" ||
    typeof track.streamUrl !== "string" ||
    track.source !== "audius"
  ) {
    return undefined;
  }

  return track as PlayableTrack;
}
