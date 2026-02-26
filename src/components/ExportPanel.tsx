'use client';

import { useState } from 'react';
import { ScrapedEvent } from '@/types';
import { generateCaption, shareToLinkedIn, shareToX, shareToWhatsApp, shareByEmail, copyToClipboard } from '@/lib/share';

interface ExportPanelProps {
  event: ScrapedEvent;
  onExportWebM: () => Promise<Blob>;
  onExportMp4: () => Promise<Blob>;
  onClose: () => void;
}

export default function ExportPanel({ event, onExportWebM, onExportMp4, onClose }: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'webm' | 'mp4' | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState('');

  const caption = generateCaption(event);

  const handleExport = async (type: 'webm' | 'mp4') => {
    setExporting(true);
    setExportType(type);
    try {
      setProgress(type === 'mp4' ? 'Video wird aufgenommen...' : 'Video wird exportiert...');
      const blob = type === 'webm' ? await onExportWebM() : await onExportMp4();

      setProgress('Download wird vorbereitet...');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vku-promo-${event.id}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProgress('Fertig!');
    } catch (err) {
      console.error('Export error:', err);
      setProgress('Fehler beim Export. Bitte erneut versuchen.');
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(caption);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-vku-border">
          <h2 className="font-bold text-lg">Video exportieren</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Export buttons */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Format</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('webm')}
                disabled={exporting}
                className="flex-1 py-3 rounded-md bg-vku-primary text-white font-semibold text-sm hover:bg-vku-primary/90 transition-colors disabled:opacity-50"
              >
                {exportType === 'webm' ? progress : 'WebM (schnell)'}
              </button>
              <button
                onClick={() => handleExport('mp4')}
                disabled={exporting}
                className="flex-1 py-3 rounded-md bg-vku-dark text-white font-semibold text-sm hover:bg-vku-dark/90 transition-colors disabled:opacity-50"
              >
                {exportType === 'mp4' ? progress : 'MP4 (kompatibel)'}
              </button>
            </div>
          </div>

          {/* Caption */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Begleittext</h3>
            <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-line">
              {caption}
            </div>
            <button
              onClick={handleCopy}
              className="mt-2 text-xs font-medium text-vku-primary hover:text-vku-primary/80 transition-colors"
            >
              {copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
            </button>
          </div>

          {/* Share buttons */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Teilen</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => shareToLinkedIn(caption, event.url)}
                className="px-4 py-2 rounded-md bg-[#0077B5] text-white text-xs font-semibold hover:opacity-90"
              >
                LinkedIn
              </button>
              <button
                onClick={() => shareToX(caption)}
                className="px-4 py-2 rounded-md bg-black text-white text-xs font-semibold hover:opacity-90"
              >
                X / Twitter
              </button>
              <button
                onClick={() => shareToWhatsApp(caption)}
                className="px-4 py-2 rounded-md bg-[#25D366] text-white text-xs font-semibold hover:opacity-90"
              >
                WhatsApp
              </button>
              <button
                onClick={() => shareByEmail(caption, event.title)}
                className="px-4 py-2 rounded-md bg-gray-600 text-white text-xs font-semibold hover:opacity-90"
              >
                E-Mail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
