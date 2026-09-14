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

export function selectPlayableTrack(response: unknown): PlayableTrack {
  if (!isRecord(response) || !("data" in response)) {
    throw new Error("Audius API returned an invalid response.");
  }

  const tracks = Array.isArray(response.data) ? response.data : [response.data];

  for (const track of tracks) {
    const playableTrack = toPlayableTrack(track);
    if (playableTrack) {
      return playableTrack;
    }
  }

  throw new Error("Audius API returned no public streamable tracks.");
}
