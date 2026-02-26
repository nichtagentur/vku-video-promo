'use client';

import { Scene } from '@/types';
import { BRAND } from '@/lib/brand';

interface SceneEditorProps {
  scene: Scene;
  onUpdate: (updated: Scene) => void;
  onGenerateImage: (sceneId: string) => void;
  generatingImage?: boolean;
  onGenerateVideo?: (sceneId: string) => void;
  generatingVideo?: boolean;
  eventImage?: string;
}

const TRANSITIONS: Scene['transition'][] = ['fade', 'slide-left', 'slide-up', 'zoom', 'cut'];

const BG_COLORS = [
  { label: 'Dunkel', value: '#1a1a2e' },
  { label: 'Blau', value: '#008bdd' },
  { label: 'Rot', value: '#e53517' },
  { label: 'Schwarz', value: '#111111' },
  { label: 'Grau', value: '#374151' },
  { label: 'Dunkelblau', value: '#0c2d48' },
];

export default function SceneEditor({ scene, onUpdate, onGenerateImage, generatingImage, onGenerateVideo, generatingVideo, eventImage }: SceneEditorProps) {
  const update = (partial: Partial<Scene>) => {
    onUpdate({ ...scene, ...partial });
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide">
        Szene bearbeiten
      </h3>

      {/* Main text */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Haupttext</label>
        <textarea
          value={scene.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-vku-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-vku-primary/30"
        />
      </div>

      {/* Subtext */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Unterzeile</label>
        <input
          type="text"
          value={scene.subtext || ''}
          onChange={(e) => update({ subtext: e.target.value })}
          className="w-full px-3 py-2 border border-vku-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-vku-primary/30"
        />
      </div>

      {/* Duration */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Dauer: {scene.duration.toFixed(1)}s
        </label>
        <input
          type="range"
          min={1}
          max={8}
          step={0.5}
          value={scene.duration}
          onChange={(e) => update({ duration: parseFloat(e.target.value) })}
          className="w-full accent-vku-primary"
        />
      </div>

      {/* Font size */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Schriftgroesse: {scene.fontSize}px
        </label>
        <input
          type="range"
          min={24}
          max={72}
          step={2}
          value={scene.fontSize}
          onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
          className="w-full accent-vku-primary"
        />
      </div>

      {/* Transition */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Uebergang</label>
        <div className="flex flex-wrap gap-1.5">
          {TRANSITIONS.map((t) => (
            <button
              key={t}
              onClick={() => update({ transition: t })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                scene.transition === t
                  ? 'bg-vku-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Background color */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Hintergrundfarbe</label>
        <div className="flex flex-wrap gap-2">
          {BG_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => update({ backgroundColor: c.value })}
              className={`w-8 h-8 rounded-md border-2 transition-all ${
                scene.backgroundColor === c.value
                  ? 'border-vku-accent scale-110'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Generate background image */}
      <div>
        <button
          onClick={() => onGenerateImage(scene.id)}
          disabled={generatingImage || generatingVideo}
          className="w-full py-2 px-3 rounded-md text-xs font-semibold border border-vku-border hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {generatingImage ? 'Bild wird generiert...' : 'KI-Hintergrundbild generieren'}
        </button>
        {scene.backgroundImage && (
          <button
            onClick={() => update({ backgroundImage: undefined })}
            className="w-full mt-1 py-1 px-3 rounded-md text-xs text-gray-500 hover:text-vku-accent transition-colors"
          >
            Bild entfernen
          </button>
        )}
      </div>

      {/* Generate video from event image */}
      {eventImage && onGenerateVideo && (
        <div>
          <button
            onClick={() => onGenerateVideo(scene.id)}
            disabled={generatingVideo || generatingImage}
            className="w-full py-2 px-3 rounded-md text-xs font-semibold border-2 border-vku-accent text-vku-accent hover:bg-vku-accent/5 transition-colors disabled:opacity-50"
          >
            {generatingVideo ? 'Video wird generiert (~60s)...' : 'Video-Clip aus Eventbild generieren'}
          </button>
          {scene.backgroundVideo && (
            <button
              onClick={() => update({ backgroundVideo: undefined })}
              className="w-full mt-1 py-1 px-3 rounded-md text-xs text-gray-500 hover:text-vku-accent transition-colors"
            >
              Video entfernen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
