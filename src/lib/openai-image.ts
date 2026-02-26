import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSceneBackground(
  sceneText: string,
  eventTitle: string
): Promise<string> {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `Abstract professional background for a corporate web seminar promo video.
Theme: "${sceneText}" for event "${eventTitle}".
Style: Modern, clean, dark blue and white corporate design. Abstract geometric shapes, subtle gradients.
NO text, NO words, NO letters in the image. Only abstract visual elements.
Suitable as a background with text overlay.`,
    n: 1,
    size: '1024x1024',
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
