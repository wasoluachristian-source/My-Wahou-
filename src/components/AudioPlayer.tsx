import { useState, useRef, useEffect, MouseEvent } from 'react';
import { Play, Pause, FastForward, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  isSelf?: boolean;
}

export function AudioPlayer({ audioUrl, duration = 0, isSelf = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setAudioDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Audio play error:', err);
      });
    }
  };

  const toggleSpeed = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = Math.max(0, Math.min(pos * audioDuration, audioDuration));
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Waveform bars simulation
  const barHeights = [25, 45, 75, 95, 60, 40, 80, 100, 70, 50, 85, 65, 40, 90, 75, 55, 30, 70, 85, 45];

  return (
    <div
      id={`audio-player-${Math.round(audioDuration)}`}
      className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-200 ${
        isSelf
          ? 'bg-purple-900/40 border border-purple-400/20 text-white'
          : 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-100'
      }`}
    >
      {/* Play/Pause Button */}
      <button
        id="audio-play-toggle-btn"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md shrink-0 ${
          isSelf
            ? 'bg-gradient-to-tr from-purple-500 to-pink-500 text-white'
            : 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white'
        }`}
        title={isPlaying ? 'Pause' : 'Écouter'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 flex flex-col justify-center min-w-[130px] max-w-[220px]">
        <div
          onClick={handleSeek}
          className="h-8 flex items-center gap-[3px] cursor-pointer py-1 group select-none"
          title="Cliquer pour naviguer"
        >
          {barHeights.map((h, i) => {
            const barProgress = (i / barHeights.length) * 100;
            const isPlayed = barProgress <= progress;
            return (
              <span
                key={i}
                style={{ height: `${Math.max(15, h)}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isSelf ? 'bg-pink-400' : 'bg-violet-400'
                    : isSelf ? 'bg-purple-400/30' : 'bg-zinc-600'
                } group-hover:opacity-90 ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-medium opacity-80 pt-0.5">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
              Gratuit
            </span>
            <span>{formatTime(audioDuration || duration)}</span>
          </div>
        </div>
      </div>

      {/* Speed Rate Toggle */}
      <button
        id="audio-speed-btn"
        onClick={toggleSpeed}
        className="px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-700/50 text-zinc-300 shrink-0 transition"
        title="Vitesse de lecture"
      >
        {playbackRate}x
      </button>
    </div>
  );
}
