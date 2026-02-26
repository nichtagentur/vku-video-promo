import Anthropic from '@anthropic-ai/sdk';
import { ScrapedEvent, Scene } from '@/types';
import { BRAND } from './brand';

function getClient() {
  return new Anthropic({ apiKey: process.env.CLAUDE_API_KEY_1 });
}

export async function generateVideoScript(event: ScrapedEvent): Promise<Scene[]> {
  const prompt = `Du bist ein Social-Media-Texter fuer VKU Service GmbH (kommunaldigital.de).
Erstelle ein Video-Skript fuer ein kurzes Promo-Video (15-25 Sekunden) fuer folgendes Web-Seminar:

Titel: ${event.title}
Datum: ${event.date}
Typ: ${event.type}
Beschreibung: ${event.description}
${event.speaker ? `Referent: ${event.speaker}` : ''}

Erstelle genau 4 Szenen (ohne Intro und Outro, die werden automatisch hinzugefuegt).
Jede Szene hat einen kurzen, praegnanten Haupttext (max 8 Woerter) und optionalen Subtext (max 15 Woerter).
Der Stil ist professionell, modern und ansprechend fuer Fachkraefte kommunaler Unternehmen.

Antworte NUR als JSON-Array mit diesem Format:
[
  {
    "text": "Haupttext der Szene",
    "subtext": "Optionaler erklaerende Unterzeile",
    "duration": 4,
    "transition": "fade"
  }
]

Verwende abwechselnd die Transitions: "fade", "slide-left", "slide-up", "zoom".
Die Dauer sollte zwischen 3 und 5 Sekunden pro Szene liegen.`;

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response as JSON');
  }

  const rawScenes = JSON.parse(jsonMatch[0]);

  // Build complete scene list with intro and outro
  const scenes: Scene[] = [];

  // Scene 0: Logo intro
  scenes.push({
    id: 'intro',
    text: 'kommunaldigital.de',
    subtext: 'VKU Akademie',
    duration: 1.5,
    fontSize: 48,
    fontColor: BRAND.colors.textLight,
    backgroundColor: BRAND.colors.primary,
    transition: 'fade',
  });

  // Content scenes from AI
  const transitions: Scene['transition'][] = ['fade', 'slide-left', 'slide-up', 'zoom'];
  rawScenes.forEach((s: { text: string; subtext?: string; duration?: number; transition?: string }, i: number) => {
    scenes.push({
      id: `scene-${i + 1}`,
      text: s.text,
      subtext: s.subtext,
      duration: s.duration || 4,
      fontSize: 42,
      fontColor: BRAND.colors.textLight,
      backgroundColor: i % 2 === 0 ? BRAND.colors.backgroundDark : BRAND.colors.primary,
      transition: (s.transition as Scene['transition']) || transitions[i % transitions.length],
    });
  });

  // Final CTA scene
  scenes.push({
    id: 'outro',
    text: 'Jetzt anmelden!',
    subtext: `${event.date} | kommunaldigital.de`,
    duration: 3.5,
    fontSize: 58,
    fontColor: BRAND.colors.textLight,
    backgroundColor: BRAND.colors.accent,
    transition: 'zoom',
  });

  return scenes;
}
