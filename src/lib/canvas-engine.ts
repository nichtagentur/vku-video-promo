import { Scene, VideoFormat, FORMAT_DIMENSIONS } from '@/types';
import { BRAND, VIDEO_DEFAULTS } from './brand';

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scenes: Scene[] = [];
  private format: VideoFormat = '16:9';
  private currentTime = 0;
  private playing = false;
  private animFrameId = 0;
  private lastTimestamp = 0;
  private imageCache = new Map<string, HTMLImageElement>();
  private onTimeUpdate?: (time: number) => void;
  private onPlayStateChange?: (playing: boolean) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setScenes(scenes: Scene[]) {
    this.scenes = scenes;
    this.render();
  }

  setFormat(format: VideoFormat) {
    this.format = format;
    const dims = FORMAT_DIMENSIONS[format];
    this.canvas.width = dims.width;
    this.canvas.height = dims.height;
    this.render();
  }

  setOnTimeUpdate(cb: (time: number) => void) {
    this.onTimeUpdate = cb;
  }

  setOnPlayStateChange(cb: (playing: boolean) => void) {
    this.onPlayStateChange = cb;
  }

  getTotalDuration(): number {
    return this.scenes.reduce((sum, s) => sum + s.duration, 0);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  seekTo(time: number) {
    this.currentTime = Math.max(0, Math.min(time, this.getTotalDuration()));
    this.render();
    this.onTimeUpdate?.(this.currentTime);
  }

  play() {
    if (this.playing) return;
    if (this.currentTime >= this.getTotalDuration()) {
      this.currentTime = 0;
    }
    this.playing = true;
    this.lastTimestamp = performance.now();
    this.onPlayStateChange?.(true);
    this.tick();
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.animFrameId);
    this.onPlayStateChange?.(false);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private tick = () => {
    if (!this.playing) return;
    const now = performance.now();
    const delta = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    this.currentTime += delta;

    if (this.currentTime >= this.getTotalDuration()) {
      this.currentTime = this.getTotalDuration();
      this.playing = false;
      this.onPlayStateChange?.(false);
      this.render();
      this.onTimeUpdate?.(this.currentTime);
      return;
    }

    this.render();
    this.onTimeUpdate?.(this.currentTime);
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private getSceneAt(time: number): { scene: Scene; sceneIndex: number; sceneTime: number; sceneProgress: number } | null {
    let elapsed = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      const scene = this.scenes[i];
      if (time < elapsed + scene.duration) {
        const sceneTime = time - elapsed;
        return {
          scene,
          sceneIndex: i,
          sceneTime,
          sceneProgress: sceneTime / scene.duration,
        };
      }
      elapsed += scene.duration;
    }
    return null;
  }

  render() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const current = this.getSceneAt(this.currentTime);
    if (!current) {
      // Show last frame
      if (this.scenes.length > 0) {
        this.renderScene(this.scenes[this.scenes.length - 1], 1, 1);
      }
      return;
    }

    const { scene, sceneTime, sceneProgress } = current;
    const transitionDuration = VIDEO_DEFAULTS.transitionDuration;
    const transitionProgress = Math.min(sceneTime / transitionDuration, 1);

    this.renderScene(scene, sceneProgress, transitionProgress);
  }

  private renderScene(scene: Scene, progress: number, transitionProgress: number) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Background
    if (scene.backgroundImage && this.imageCache.has(scene.backgroundImage)) {
      const img = this.imageCache.get(scene.backgroundImage)!;
      this.renderKenBurns(img, progress);
    } else {
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, scene.backgroundColor);
      gradient.addColorStop(1, this.darken(scene.backgroundColor, 0.3));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Semi-transparent overlay for text readability
    if (scene.backgroundImage) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, width, height);
    }

    // Decorative accent line
    const accentY = height * 0.42;
    ctx.fillStyle = BRAND.colors.accent;
    ctx.fillRect(width * 0.1, accentY, width * 0.15, 4);

    // Text animation (fade-in with slide up)
    const textAlpha = this.easeOutCubic(transitionProgress);
    const slideOffset = (1 - this.easeOutCubic(transitionProgress)) * 40;

    ctx.save();
    ctx.globalAlpha = textAlpha;

    // Main text
    const fontSize = scene.fontSize * (width / 1080);
    ctx.font = `bold ${fontSize}px ${BRAND.fonts.heading}`;
    ctx.fillStyle = scene.fontColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = height * 0.5 + slideOffset;
    this.wrapText(ctx, scene.text, width / 2, textY, width * 0.8, fontSize * 1.2);

    // Subtext
    if (scene.subtext) {
      const subFontSize = fontSize * 0.55;
      ctx.font = `${subFontSize}px ${BRAND.fonts.body}`;
      ctx.fillStyle = scene.fontColor;
      ctx.globalAlpha = textAlpha * 0.85;
      const subY = textY + fontSize * 1.5 + slideOffset * 0.5;
      this.wrapText(ctx, scene.subtext, width / 2, subY, width * 0.75, subFontSize * 1.3);
    }

    ctx.restore();

    // Bottom bar with branding
    const barHeight = height * 0.04;
    ctx.fillStyle = BRAND.colors.primary;
    ctx.fillRect(0, height - barHeight, width, barHeight);
  }

  private renderKenBurns(img: HTMLImageElement, progress: number) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const scale = 1 + progress * 0.08; // Gentle zoom
    const offsetX = progress * 20;
    const offsetY = progress * 10;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2 - offsetX, -height / 2 - offsetY);

    // Cover-fit the image
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    let drawW, drawH, drawX, drawY;
    if (imgRatio > canvasRatio) {
      drawH = height;
      drawW = height * imgRatio;
      drawX = (width - drawW) / 2;
      drawY = 0;
    } else {
      drawW = width;
      drawH = width / imgRatio;
      drawX = 0;
      drawY = (height - drawH) / 2;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private darken(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (num & 0xff) * (1 - amount));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  async loadImage(url: string): Promise<void> {
    if (this.imageCache.has(url)) return;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy() {
    this.pause();
    this.imageCache.clear();
  }
}
