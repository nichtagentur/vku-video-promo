'use client';

import { ScrapedEvent } from '@/types';
import EventCard from './EventCard';

interface EventGridProps {
  events: ScrapedEvent[];
  onGenerate: (event: ScrapedEvent) => void;
  generatingId?: string;
}

export default function EventGrid({ events, onGenerate, generatingId }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">Keine Veranstaltungen gefunden.</p>
        <p className="text-gray-400 text-sm mt-2">
          Versuchen Sie es spaeter erneut oder pruefen Sie kommunaldigital.de direkt.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onGenerate={onGenerate}
          generating={generatingId === event.id}
        />
      ))}
    </div>
  );
}
