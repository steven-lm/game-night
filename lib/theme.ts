export type RoundTheme = {
  name: string;
  background: string;
  backgroundGradient: string;
  cardBackground: string;
  cardBorder: string;
  cardText: string;
  primary: string;
  secondary: string;
  accent: string;
  specialCardGlow: string;
};

export const roundThemes: Record<number, RoundTheme> = {
  1: {
    name: 'Round 1',
    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
    backgroundGradient: 'from-slate-50 via-blue-50 to-slate-50',
    cardBackground: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)',
    cardBorder: '1px solid rgba(147, 197, 253, 0.4)',
    cardText: '#1e293b',
    primary: '#93c5fd',
    secondary: '#bfdbfe',
    accent: '#a78bfa',
    specialCardGlow: '0 0 20px rgba(167, 139, 250, 0.3)',
  },
  2: {
    name: 'Round 2',
    background: 'linear-gradient(180deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)',
    backgroundGradient: 'from-purple-50 via-pink-50 to-purple-50',
    cardBackground: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)',
    cardBorder: '1px solid rgba(216, 180, 254, 0.4)',
    cardText: '#1e293b',
    primary: '#d8b4fe',
    secondary: '#e9d5ff',
    accent: '#f0abfc',
    specialCardGlow: '0 0 25px rgba(240, 171, 252, 0.4)',
  },
  3: {
    name: 'Final Round',
    background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
    backgroundGradient: 'from-amber-50 via-yellow-50 to-amber-50',
    cardBackground: 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)',
    cardBorder: '1px solid rgba(251, 191, 36, 0.5)',
    cardText: '#1e293b',
    primary: '#fbbf24',
    secondary: '#fcd34d',
    accent: '#f472b6',
    specialCardGlow: '0 0 30px rgba(244, 114, 182, 0.4)',
  },
};

export const colors = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  buzzer: {
    active: '#ef4444',
    pressed: '#dc2626',
    glow: '0 0 50px rgba(239, 68, 68, 0.8)',
  },
  team: [
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange-red
  ],
};

export const animations = {
  cardFlip: {
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1],
  },
  bounce: {
    duration: 0.5,
    ease: [0.68, -0.55, 0.265, 1.55],
  },
  slide: {
    duration: 0.4,
    ease: [0.4, 0, 0.2, 1],
  },
  scale: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
  },
};

export const typography = {
  display: {
    fontFamily: "'Patua One', 'Arial Black', serif",
    fontWeight: '400',
  },
  heading: {
    fontFamily: "'Patua One', 'Arial Black', serif",
    fontWeight: '400',
  },
  body: {
    fontFamily: "'Roboto', 'Arial', sans-serif",
    fontWeight: '400',
  },
};

