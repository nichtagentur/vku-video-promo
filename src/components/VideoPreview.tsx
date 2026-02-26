'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Scene, VideoFormat, FORMAT_DIMENSIONS } from '@/types';
import { CanvasEngine } from '@/lib/canvas-engine';

interface VideoPreviewProps {
  scenes: Scene[];
  format: VideoFormat;
  onTimeUpdate?: (time: number) => void;
  engineRef?: React.MutableRefObject<CanvasEngine | null>;
}

export default function VideoPreview({ scenes, format, onTimeUpdate, engineRef }: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localEngineRef = useRef<CanvasEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const engine = localEngineRef.current;

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new CanvasEngine(canvasRef.current);
    localEngineRef.current = eng;
    if (engineRef) engineRef.current = eng;

    eng.setOnTimeUpdate((t) => {
      setCurrentTime(t);
      onTimeUpdate?.(t);
    });
    eng.setOnPlayStateChange(setPlaying);

    return () => eng.destroy();
  }, []);

  useEffect(() => {
    if (!localEngineRef.current) return;
    const eng = localEngineRef.current;
    eng.setFormat(format);
  }, [format]);

  useEffect(() => {
    if (!localEngineRef.current) return;
    const eng = localEngineRef.current;
    eng.setScenes(scenes);
    setTotalDuration(eng.getTotalDuration());

    // Preload background images
    scenes.forEach(s => {
      if (s.backgroundImage) {
        eng.loadImage(s.backgroundImage).then(() => eng.render());
      }
    });
  }, [scenes]);

  const togglePlay = useCallback(() => {
    if (!localEngineRef.current) return;
    if (localEngineRef.current.isPlaying()) {
      localEngineRef.current.pause();
    } else {
      localEngineRef.current.play();
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!localEngineRef.current) return;
    localEngineRef.current.seekTo(parseFloat(e.target.value));
  }, []);

  const restart = useCallback(() => {
    if (!localEngineRef.current) return;
    localEngineRef.current.seekTo(0);
    localEngineRef.current.play();
  }, []);

  const formatTime = (t: number) => {
    const s = Math.floor(t);
    const ms = Math.floor((t - s) * 10);
    return `${s}.${ms}s`;
  };

  const dims = FORMAT_DIMENSIONS[format];
  // Scale canvas to fit container while maintaining aspect ratio
  const maxWidth = 560;
  const scale = maxWidth / dims.width;
  const displayWidth = maxWidth;
  const displayHeight = dims.height * scale;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="bg-black rounded-md overflow-hidden shadow-lg"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3 w-full max-w-[560px]">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-vku-primary text-white flex items-center justify-center hover:bg-vku-primary/90 transition-colors text-sm font-bold"
        >
          {playing ? '\u23F8' : '\u25B6'}
        </button>
        <button
          onClick={restart}
          className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300 transition-colors text-sm"
          title="Neustart"
        >
          {'\u21BA'}
        </button>
        <input
          type="range"
          min={0}
          max={totalDuration}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 accent-vku-primary"
        />
        <span className="text-xs text-gray-500 w-20 text-right font-mono">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
}
