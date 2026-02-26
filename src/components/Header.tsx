'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b border-vku-border bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-vku-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <div>
              <span className="font-bold text-lg text-vku-primary">kommunaldigital</span>
              <span className="text-xs text-gray-500 block -mt-1">Video Promo Generator</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://kommunaldigital.de/vku-akademie"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-vku-primary transition-colors"
            >
              VKU Akademie
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
