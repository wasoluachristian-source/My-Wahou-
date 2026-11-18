import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AppSettings } from '../types';
import { BrandBirdLogo } from './BrandBirdLogo';

interface SplashScreenProps {
  appSettings: AppSettings;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ appSettings, onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    // Smooth 10-second progress bar update
    const startTime = Date.now();
    const durationMs = 10000;

    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);

    // Stay visible for at least 10 seconds (10000 ms) before fading out smoothly
    const timer = window.setTimeout(() => {
      setProgress(100);
      setIsFadingOut(true);
      window.setTimeout(() => {
        onFinishRef.current();
      }, 500);
    }, durationMs);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      id="mywahou-splash-screen"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', minHeight: '100dvh', zIndex: 99999 }}
      className={`fixed inset-0 z-[99999] bg-zinc-50 dark:bg-[#09090b] flex flex-col items-center justify-between p-8 select-none transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-600/20 dark:bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/15 dark:bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top spacing */}
      <div className="w-full flex justify-center pt-8">
        <span className="text-[11px] px-3.5 py-1 rounded-full font-black uppercase tracking-widest bg-zinc-200/70 dark:bg-white/5 text-zinc-700 dark:text-zinc-400 border border-zinc-300/60 dark:border-white/10 flex items-center gap-1.5 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>Messagerie & Communauté</span>
        </span>
      </div>

      {/* Central Logo & App Title: my Wahou */}
      <div className="flex flex-col items-center justify-center text-center space-y-5 relative z-10 animate-fade-in">
        <div className="relative">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 p-1 shadow-2xl shadow-violet-600/40 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-white to-sky-50 dark:from-white dark:to-sky-100 rounded-[22px] flex items-center justify-center overflow-hidden border border-white/60 p-2">
              <BrandBirdLogo
                logoUrl={appSettings.logoUrl}
                alt={appSettings.appName || 'my Wahou'}
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500 text-white shadow-md border border-white/20 whitespace-nowrap">
            MY WAHOU
          </span>
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white drop-shadow-sm">
            {appSettings.appName || 'my Wahou'}
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 font-medium">
            Discussions privées • Groupes Lisanga • Journée Live
          </p>
        </div>

        {/* Smooth 10s Loader Bar */}
        <div className="w-48 h-1.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-emerald-400 rounded-full transition-all duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom Developer Signature as explicitly requested */}
      <div className="w-full text-center pb-6 relative z-10">
        <p className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300 tracking-wide flex items-center justify-center gap-1.5">
          <span>développé par</span>
          <span className="text-violet-600 dark:text-violet-400 font-black">Wastus Spart 2026</span>
        </p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-1">
          Tous droits réservés • Version Web & Application
        </p>
      </div>
    </div>
  );
};
