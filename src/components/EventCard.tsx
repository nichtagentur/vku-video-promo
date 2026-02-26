'use client';

import { ScrapedEvent } from '@/types';

interface EventCardProps {
  event: ScrapedEvent;
  onGenerate: (event: ScrapedEvent) => void;
  generating?: boolean;
}

export default function EventCard({ event, onGenerate, generating }: EventCardProps) {
  return (
    <div className="bg-white rounded-md border border-vku-border overflow-hidden hover:shadow-lg transition-shadow">
      {event.image ? (
        <div className="h-44 overflow-hidden bg-gray-100">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-44 bg-gradient-to-br from-vku-primary to-vku-dark flex items-center justify-center">
          <span className="text-white/80 text-5xl font-bold">KD</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-vku-primary/10 text-vku-primary">
            {event.type}
          </span>
          <span className="text-xs text-gray-500">{event.date}</span>
        </div>
        <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2">
          {event.title}
        </h3>
        {event.speaker && (
          <p className="text-xs text-gray-500 mb-3">Referent: {event.speaker}</p>
        )}
        <button
          onClick={() => onGenerate(event)}
          disabled={generating}
          className="w-full py-2 px-4 rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: generating ? '#999' : '#e53517' }}
        >
          {generating ? 'Wird generiert...' : 'Video generieren'}
        </button>
      </div>
    </div>
  );
}
