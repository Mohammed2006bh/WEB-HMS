interface YTPlayerEvent {
  target: YT.Player;
}

interface YTOnStateChangeEvent {
  target: YT.Player;
  data: number;
}

declare namespace YT {
  interface PlayerOptions {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, unknown>;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
    };
  }

  interface Player {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getPlayerState(): number;
    destroy(): void;
    new (elementId: string, options: PlayerOptions): Player;
  }

  type PlayerEvent = YTPlayerEvent;
  type OnStateChangeEvent = YTOnStateChangeEvent;

  const PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };

  const Player: {
    new (elementId: string, options: PlayerOptions): Player;
  };
}

interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady: () => void;
}
