export const colors = {
  // Backgrounds
  bg:       '#0A0A0A',
  splashBg: '#191F2F',
  surface:  '#1A1F2E',
  cardBg:   '#12172A',
  overlay:  'rgba(0,0,0,0.85)',

  // Map pins
  pinActive:   '#1B2A4A',
  pinInactive: '#2A3A5A',

  // Brand
  accent: '#FFD60A',

  // Neutrals
  white:       '#FFFFFF',
  black:       '#000000',
  muted:       '#888888',
  borderSubtle: 'rgba(255,255,255,0.2)',
  borderMuted:  'rgba(136,136,136,0.2)',

  // Status badges (background)
  statusOpen:    'rgba(52,199,89,0.3)',
  statusClosed:  'rgba(255,59,48,0.3)',
  statusUnknown: 'rgba(142,142,147,0.25)',

  // Status text
  statusOpenText: '#34C759',

  // Feedback
  error:         '#FF3B30',
  reportLink:    '#4A90D9',
  reportSuccess: 'rgba(255,255,255,0.55)',
} as const;

export type ColorKey = keyof typeof colors;
