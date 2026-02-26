export interface ScrapedEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: string;
  description: string;
  image?: string;
  url: string;
  speaker?: string;
}

export interface Scene {
  id: string;
  text: string;
  subtext?: string;
  duration: number; // seconds
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundImage?: string; // base64 or URL
  backgroundVideo?: string; // data URI for Veo-generated video
  transition: 'fade' | 'slide-left' | 'slide-up' | 'zoom' | 'cut';
  kenBurns?: boolean;
}

export interface VideoProject {
  event: ScrapedEvent;
  scenes: Scene[];
  format: VideoFormat;
  fps: number;
}

export type VideoFormat = '4:5' | '9:16' | '1:1' | '16:9';

export interface VideoDimensions {
  width: number;
  height: number;
}

export const FORMAT_DIMENSIONS: Record<VideoFormat, VideoDimensions> = {
  '4:5': { width: 864, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};
