import { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Check
} from 'lucide-react';
import { downloadMediaFile } from '../utils/mediaUtils';

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  senderName?: string;
  timestamp?: number;
}

export function MediaViewer({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  senderName = 'my Wahou',
  timestamp = Date.now(),
}: MediaViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotation(0);
      setIsDownloaded(false);
      setIsPlaying(true);
    }
  }, [isOpen, mediaUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mediaUrl) return null;

  const handleDownload = () => {
    const ext = mediaType === 'video' ? 'mp4' : 'jpg';
    const dateStr = new Date(timestamp).toISOString().slice(0, 10);
    const filename = `myWahou_${mediaType}_${dateStr}_${Date.now().toString().slice(-4)}.${ext}`;
    downloadMediaFile(mediaUrl, filename);
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2500);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div
      id="media-lightbox-modal"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-6 animate-fade-in select-none"
    >
      {/* Top Action Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md z-10 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{senderName}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-500/40">
                {mediaType === 'video' ? '🎬 Vidéo HD' : '🖼️ Photo HD'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              {new Date(timestamp).toLocaleDateString([], {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {mediaType === 'image' && (
            <>
              <button
                id="lightbox-zoom-in-btn"
                onClick={handleZoomIn}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
                title="Zoom Avant (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                id="lightbox-zoom-out-btn"
                onClick={handleZoomOut}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
                title="Zoom Arrière (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                id="lightbox-rotate-btn"
                onClick={handleRotate}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
                title="Pivoter l'image"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* SAVE / DOWNLOAD BUTTON */}
          <button
            id="lightbox-download-btn"
            onClick={handleDownload}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/30 transition active:scale-95"
            title="Enregistrer sur votre téléphone / ordinateur"
          >
            {isDownloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="hidden sm:inline text-emerald-200">Enregistré !</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Enregistrer</span>
              </>
            )}
          </button>

          {/* Close Lightbox */}
          <button
            id="lightbox-close-btn"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition ml-1"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Media Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative"
      >
        {mediaType === 'image' ? (
          <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto">
            <img
              src={mediaUrl}
              alt="Photo"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-zinc-800/80 cursor-zoom-in"
              onClick={handleZoomIn}
            />
          </div>
        ) : (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <video
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[75vh] rounded-2xl bg-black shadow-2xl border border-zinc-800/80"
            />
          </div>
        )}
      </div>

      {/* Bottom Information & Quick Action Tip */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 backdrop-blur-md text-xs text-zinc-400 z-10"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Fichier haute résolution sauvegardable instantanément</span>
        </div>

        <div className="flex items-center gap-2">
          {mediaType === 'image' && zoomLevel !== 1 && (
            <button
              onClick={handleReset}
              className="text-[11px] text-violet-400 hover:text-pink-300 underline font-semibold"
            >
              Réinitialiser zoom ({Math.round(zoomLevel * 100)}%)
            </button>
          )}
          <button
            onClick={handleDownload}
            className="text-[11px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger le média</span>
          </button>
        </div>
      </div>
    </div>
  );
}
