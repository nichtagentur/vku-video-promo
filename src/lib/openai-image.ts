import OpenAI from 'openai';

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateSceneBackground(
  sceneText: string,
  eventTitle: string
): Promise<string> {
  const response = await getClient().images.generate({
    model: 'gpt-image-1',
    prompt: `Professional photo for a corporate web seminar promo video.
Theme: "${sceneText}" for event "${eventTitle}".
Show diverse business professionals in a modern conference or office setting. Realistic, warm lighting, shallow depth of field.
People should appear engaged, collaborative, and approachable. Mix of ages and backgrounds.
NO text, NO words, NO letters in the image. The image will be used as a background with text overlay, so keep composition slightly out of focus or with space for text.`,
    n: 1,
    size: '1024x1536',
    quality: 'medium',
  });

  // gpt-image-1 returns b64_json by default
  const item = response.data?.[0];
  if (!item) throw new Error('No image data returned');

  const b64 = (item as Record<string, unknown>).b64_json as string | undefined;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }

  // Fallback to URL if available
  return (item as Record<string, unknown>).url as string || '';
}
