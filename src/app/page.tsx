'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrapedEvent } from '@/types';
import Header from '@/components/Header';
import EventGrid from '@/components/EventGrid';

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<ScrapedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | undefined>();

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const res = await fetch('/api/scrape');
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      } else {
        setError(data.error || 'Keine Events gefunden');
      }
    } catch (err) {
      setError('Fehler beim Laden der Veranstaltungen');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(event: ScrapedEvent) {
    setGeneratingId(event.id);
    try {
      // Store event data in sessionStorage for the editor page
      sessionStorage.setItem('currentEvent', JSON.stringify(event));

      // Generate script
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();

      if (data.scenes) {
        sessionStorage.setItem('currentScenes', JSON.stringify(data.scenes));
        router.push(`/editor/${encodeURIComponent(event.id)}`);
      } else {
        alert('Fehler bei der Skriptgenerierung: ' + (data.error || 'Unbekannter Fehler'));
      }
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Generierung. Bitte erneut versuchen.');
    } finally {
      setGeneratingId(undefined);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header />

      {/* Hero section */}
      <div className="bg-gradient-to-r from-vku-primary to-vku-dark py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Video Promo Generator</h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Erstellen Sie in Sekunden ansprechende Promo-Videos fuer Ihre Web-Seminare.
            Waehlen Sie eine Veranstaltung und lassen Sie die KI ein Video-Skript generieren.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Aktuelle Web-Seminare</h2>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="text-sm text-vku-primary hover:text-vku-primary/80 font-medium transition-colors"
          >
            {loading ? 'Laden...' : 'Aktualisieren'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-vku-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={fetchEvents}
              className="text-sm text-vku-primary hover:underline"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <EventGrid
            events={events}
            onGenerate={handleGenerate}
            generatingId={generatingId}
          />
        )}
      </main>
    </div>
  );
}
