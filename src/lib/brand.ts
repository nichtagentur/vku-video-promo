export const BRAND = {
  colors: {
    primary: '#008bdd',
    accent: '#e53517',
    border: '#d5dee3',
    text: '#000000',
    textLight: '#ffffff',
    background: '#ffffff',
    backgroundDark: '#1a1a2e',
  },
  fonts: {
    heading: '"Saira", system-ui, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
  },
  borderRadius: '6px',
} as const;

export const VIDEO_DEFAULTS = {
  fps: 30,
  defaultSceneDuration: 4,
  introDuration: 1.5,
  outroDuration: 3,
  transitionDuration: 0.5,
} as const;
