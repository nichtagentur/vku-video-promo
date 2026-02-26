'use client';

import { Scene } from '@/types';
import { BRAND } from '@/lib/brand';

interface TimelineProps {
  scenes: Scene[];
  currentTime: number;
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onSeek: (time: number) => void;
}

export default function Timeline({ scenes, currentTime, selectedSceneId, onSelectScene, onSeek }: TimelineProps) {
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  let elapsed = 0;
  const sceneBlocks = scenes.map((scene) => {
    const start = elapsed;
    const widthPercent = (scene.duration / totalDuration) * 100;
    elapsed += scene.duration;
    return { scene, start, widthPercent };
  });

  // Current time indicator position
  const indicatorPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="bg-gray-50 border-t border-vku-border p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</span>
        <span className="text-xs text-gray-400">
          {scenes.length} Szenen | {totalDuration.toFixed(1)}s gesamt
        </span>
      </div>
      <div
        className="relative flex h-12 rounded-md overflow-hidden cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = x / rect.width;
          onSeek(pct * totalDuration);
        }}
      >
        {sceneBlocks.map(({ scene, widthPercent }, i) => (
          <div
            key={scene.id}
            className="h-full flex items-center justify-center border-r border-white/30 transition-all"
            style={{
              width: `${widthPercent}%`,
              backgroundColor: selectedSceneId === scene.id
                ? BRAND.colors.accent
                : scene.backgroundColor,
              opacity: selectedSceneId === scene.id ? 1 : 0.8,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectScene(scene.id);
            }}
          >
            <span className="text-[10px] text-white font-semibold truncate px-1">
              {i === 0 ? 'Intro' : i === scenes.length - 1 ? 'CTA' : `${i}`}
            </span>
          </div>
        ))}
        {/* Playhead indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none z-10"
          style={{ left: `${indicatorPercent}%` }}
        />
      </div>
    </div>
  );
}
