import Anthropic from '@anthropic-ai/sdk';
import { ScrapedEvent } from '../types';
import { Phase } from './scheduler';
import { logInfo } from './logger';

interface CaptionResult {
  caption: string;
  hashtags: string[];
}

/**
 * Generate an Instagram-optimized caption with hashtags.
 */
export async function generateCaption(
  event: ScrapedEvent,
  phase: Phase,
  daysUntilEvent: number,
): Promise<CaptionResult> {
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY_1 });

  const phaseInstructions: Record<Phase, string> = {
    'awareness': 'Informativ, neugierig machend. Stelle das Thema vor und warum es relevant ist.',
    'reminder': 'Nutzen betonen, ggf. Referent hervorheben. Konkreten Mehrwert kommunizieren.',
    'urgency': `Dringlichkeit erzeugen. Noch ${daysUntilEvent} Tage bis zum Event. "Jetzt anmelden!"`,
    'last-call': `Letzte Chance! Event ist in ${daysUntilEvent === 1 ? 'einem Tag' : daysUntilEvent + ' Tagen'}. Starker CTA.`,
  };

  const prompt = `Du schreibst eine Instagram-Caption fuer die VKU Akademie (kommunaldigital.de).

Event: ${event.title}
Typ: ${event.type}
Datum: ${event.date}
Beschreibung: ${event.description}
${event.speaker ? `Referent: ${event.speaker}` : ''}

Phase: ${phase}
Stil: ${phaseInstructions[phase]}

Regeln:
- Max 2200 Zeichen (Instagram-Limit)
- Erster Satz muss Hook sein (wird in Feed-Vorschau angezeigt)
- Emojis sparsam einsetzen (max 3-4 insgesamt)
- Link-Hinweis: "Link in Bio" (keine URLs in Caption)
- Zielgruppe: Fachkraefte kommunaler Unternehmen
- Sprache: Deutsch, professionell aber nahbar
- CTA am Ende

Antworte NUR als JSON:
{
  "caption": "Die vollstaendige Caption...",
  "hashtags": ["VKUAkademie", "Kommunalwirtschaft", ...]
}

Verwende 5-8 relevante Hashtags. Immer dabei: VKUAkademie, Kommunalwirtschaft`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse caption response');
  }

  const result = JSON.parse(jsonMatch[0]);
  const hashtags: string[] = result.hashtags || ['VKUAkademie', 'Kommunalwirtschaft'];
  const hashtagStr = hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ');
  const fullCaption = `${result.caption}\n\n${hashtagStr}`;

  logInfo(`Generated caption for ${event.title} (${phase}), length: ${fullCaption.length}`);

  return {
    caption: fullCaption,
    hashtags,
  };
}
