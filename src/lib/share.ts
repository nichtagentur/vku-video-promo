import { ScrapedEvent } from '@/types';

export function generateCaption(event: ScrapedEvent): string {
  return `${event.title}

${event.date} | Web-Seminar von kommunaldigital.de

Jetzt anmelden: ${event.url}

#kommunaldigital #VKU #WebSeminar #Digitalisierung`;
}

export function shareToLinkedIn(caption: string, url: string) {
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(caption);
  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}&summary=${text}`,
    '_blank'
  );
}

export function shareToX(caption: string) {
  const text = encodeURIComponent(caption.slice(0, 280));
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
}

export function shareToWhatsApp(caption: string) {
  const text = encodeURIComponent(caption);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

export function shareByEmail(caption: string, eventTitle: string) {
  const subject = encodeURIComponent(`Web-Seminar: ${eventTitle}`);
  const body = encodeURIComponent(caption);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
