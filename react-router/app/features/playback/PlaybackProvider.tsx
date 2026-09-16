import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { PlayableTrack } from "../audius/audius";

const STORAGE_KEY = "mosa-playback:v1";

type SavedPlayback = {
  track?: PlayableTrack;
  queue: PlayableTrack[];
  index: number;
  currentTime: number;
  autoPlay: boolean;
};

type PlaybackContextValue = {
  track?: PlayableTrack;
  queue: PlayableTrack[];
  index: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  autoPlay: boolean;
  setQueue: (tracks: PlayableTrack[], index?: number, play?: boolean) => void;
  selectTrack: (track: PlayableTrack, play?: boolean) => void;
  toggle: () => void;
  seek: (time: number) => void;
  setAutoPlay: (enabled: boolean) => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

function readSavedPlayback(): SavedPlayback {
  if (typeof window === "undefined") {
    return { queue: [], index: -1, currentTime: 0, autoPlay: true };
  }
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<SavedPlayback> | null;
    return {
      track: saved?.track,
      queue: Array.isArray(saved?.queue) ? saved.queue : [],
      index: typeof saved?.index === "number" ? saved.index : -1,
      currentTime: typeof saved?.currentTime === "number" ? saved.currentTime : 0,
      autoPlay: saved?.autoPlay !== false,
    };
  } catch {
    return { queue: [], index: -1, currentTime: 0, autoPlay: true };
  }
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const saved = useRef(readSavedPlayback()).current;
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<PlayableTrack | undefined>(saved.track);
  const pendingPlayRef = useRef(false);
  const [track, setTrack] = useState<PlayableTrack | undefined>(saved.track);
  const [queue, setQueueState] = useState<PlayableTrack[]>(saved.queue);
  const [index, setIndex] = useState(saved.index);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(saved.currentTime);
  const [duration, setDuration] = useState(0);
  const [autoPlay, setAutoPlayState] = useState(saved.autoPlay);

  trackRef.current = track;

  useEffect(() => {
    if (!track || !audioRef.current) {
      return;
    }
    const audio = audioRef.current;
    audio.src = track.streamUrl;
    audio.load();
    setCurrentTime(
      track.id === saved.track?.id ? saved.currentTime : 0,
    );
    setDuration(0);
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      void audio.play().catch(() => setIsPlaying(false));
    }
  }, [track]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const value: SavedPlayback = { track, queue, index, currentTime, autoPlay };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }, [autoPlay, currentTime, index, queue, track]);

  const setQueue = useCallback((tracks: PlayableTrack[], nextIndex = 0, play = false) => {
    const nextTrack = tracks[nextIndex];
    setQueueState(tracks);
    setIndex(nextTrack ? nextIndex : -1);
    if (nextTrack) {
      pendingPlayRef.current = play;
      setTrack(nextTrack);
    }
  }, []);

  const selectTrack = useCallback((nextTrack: PlayableTrack, play = true) => {
    const nextIndex = queue.findIndex((item) => item.id === nextTrack.id);
    if (nextIndex >= 0) {
      setIndex(nextIndex);
    } else {
      setQueueState([nextTrack]);
      setIndex(0);
    }
    pendingPlayRef.current = play;
    setTrack(nextTrack);
  }, [queue]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !trackRef.current) {
      return;
    }
    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }, []);

  const setAutoPlay = useCallback((enabled: boolean) => {
    setAutoPlayState(enabled);
    if (enabled && track && !isPlaying) {
      pendingPlayRef.current = true;
      void audioRef.current?.play().catch(() => setIsPlaying(false));
    }
  }, [isPlaying, track]);

  const playNext = useCallback(() => {
    if (!autoPlay || queue.length === 0) {
      return;
    }
    const nextIndex = (index + 1) % queue.length;
    pendingPlayRef.current = true;
    setIndex(nextIndex);
    setTrack(queue[nextIndex]);
  }, [autoPlay, index, queue]);

  return (
    <PlaybackContext.Provider
      value={{ track, queue, index, isPlaying, currentTime, duration, autoPlay, setQueue, selectTrack, toggle, seek, setAutoPlay }}
    >
      {children}
      <audio
        ref={audioRef}
        hidden
        preload="metadata"
        onCanPlay={(event) => {
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            void event.currentTarget.play().catch(() => setIsPlaying(false));
          }
        }}
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) {
            setDuration(event.currentTarget.duration);
          }
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={playNext}
      />
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within PlaybackProvider");
  }
  return context;
}
