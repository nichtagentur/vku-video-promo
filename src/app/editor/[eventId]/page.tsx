'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Scene, ScrapedEvent, VideoFormat } from '@/types';
import { CanvasEngine } from '@/lib/canvas-engine';
import { VideoRecorder, downloadBlob } from '@/lib/recorder';
import Header from '@/components/Header';
import VideoPreview from '@/components/VideoPreview';
import Timeline from '@/components/Timeline';
import SceneEditor from '@/components/SceneEditor';
import ExportPanel from '@/components/ExportPanel';

const FORMATS: { label: string; value: VideoFormat }[] = [
  { label: '9:16 Story', value: '9:16' },
  { label: '1:1 Feed', value: '1:1' },
  { label: '16:9 Landscape', value: '16:9' },
];

export default function EditorPage() {
  const router = useRouter();
  const engineRef = useRef<CanvasEngine | null>(null);

  const [event, setEvent] = useState<ScrapedEvent | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [format, setFormat] = useState<VideoFormat>('16:9');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

  useEffect(() => {
    const eventData = sessionStorage.getItem('currentEvent');
    const scenesData = sessionStorage.getItem('currentScenes');

    if (eventData && scenesData) {
      setEvent(JSON.parse(eventData));
      const loadedScenes = JSON.parse(scenesData);
      setScenes(loadedScenes);
      if (loadedScenes.length > 0) {
        setSelectedSceneId(loadedScenes[0].id);
      }
    } else {
      router.push('/');
    }
  }, [router]);

  const selectedScene = scenes.find(s => s.id === selectedSceneId) || null;

  const handleSceneUpdate = useCallback((updated: Scene) => {
    setScenes(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  const handleSeek = useCallback((time: number) => {
    engineRef.current?.seekTo(time);
  }, []);

  const handleGenerateImage = useCallback(async (sceneId: string) => {
    if (!event) return;
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setGeneratingImageFor(sceneId);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneText: scene.text,
          eventTitle: event.title,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setScenes(prev => prev.map(s =>
          s.id === sceneId ? { ...s, backgroundImage: data.imageUrl, kenBurns: true } : s
        ));
      }
    } catch (err) {
      console.error('Image generation error:', err);
    } finally {
      setGeneratingImageFor(null);
    }
  }, [event, scenes]);

  const handleExportWebM = useCallback(async (): Promise<Blob> => {
    const engine = engineRef.current;
    if (!engine) throw new Error('Engine not ready');

    const recorder = new VideoRecorder(engine.getCanvas());
    engine.seekTo(0);
    await recorder.startRecording(30);
    engine.play();

    // Wait for playback to complete
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!engine.isPlaying()) {
          clearInterval(check);
          recorder.stopRecording().then(resolve);
        }
      }, 100);
    });
  }, []);

  const handleExportMp4 = useCallback(async (): Promise<Blob> => {
    const webm = await handleExportWebM();
    const recorder = new VideoRecorder(engineRef.current!.getCanvas());
    return recorder.convertToMp4(webm);
  }, [handleExportWebM]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-vku-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />

      {/* Top bar with event title + controls */}
      <div className="bg-white border-b border-vku-border px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-vku-primary"
            >
              &larr; Zurueck
            </button>
            <div>
              <h1 className="font-bold text-sm truncate max-w-md">{event.title}</h1>
              <p className="text-xs text-gray-500">{event.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Format selector */}
            <div className="flex bg-gray-100 rounded-md p-0.5">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    format === f.value
                      ? 'bg-white shadow text-vku-primary'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowExport(true)}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#e53517' }}
            >
              Exportieren
            </button>
          </div>
        </div>
      </div>

      {/* Editor workspace */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        {/* Left: Preview */}
        <div className="flex-1 flex items-center justify-center p-6">
          <VideoPreview
            scenes={scenes}
            format={format}
            onTimeUpdate={setCurrentTime}
            engineRef={engineRef}
          />
        </div>

        {/* Right: Scene editor */}
        <div className="w-80 bg-white border-l border-vku-border overflow-y-auto">
          {selectedScene ? (
            <SceneEditor
              scene={selectedScene}
              onUpdate={handleSceneUpdate}
              onGenerateImage={handleGenerateImage}
              generatingImage={generatingImageFor === selectedScene.id}
            />
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm">
              Waehlen Sie eine Szene aus der Timeline
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Timeline */}
      <Timeline
        scenes={scenes}
        currentTime={currentTime}
        selectedSceneId={selectedSceneId}
        onSelectScene={setSelectedSceneId}
        onSeek={handleSeek}
      />

      {/* Export modal */}
      {showExport && (
        <ExportPanel
          event={event}
          onExportWebM={handleExportWebM}
          onExportMp4={handleExportMp4}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
