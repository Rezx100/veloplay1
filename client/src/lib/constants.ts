// League configuration

export const LEAGUES = [
  { 
    id: 'nba',
    name: 'NBA',
    fullName: 'National Basketball Association',
    icon: 'basketball-ball',
    color: '#C9082A',
    api: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=basketball&league=nba'
  },
  { 
    id: 'nfl',
    name: 'NFL',
    fullName: 'National Football League',
    icon: 'football-ball',
    color: '#013369',
    api: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=football&league=nfl'
  },
  { 
    id: 'nhl',
    name: 'NHL',
    fullName: 'National Hockey League',
    icon: 'hockey-puck',
    color: '#0033A0',
    api: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=hockey&league=nhl'
  },
  { 
    id: 'mlb',
    name: 'MLB',
    fullName: 'Major League Baseball',
    icon: 'baseball-ball',
    color: '#002D72',
    api: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=baseball&league=mlb'
  }
];

// Subscription plans
export const SUBSCRIPTION_PLANS = [
  {
    id: 1,
    name: 'Monthly',
    price: 1500, // in cents ($15.00)
    durationDays: 30,
    description: 'Basic access to all live games',
    features: [
      'Access to all live games',
      'HD streaming quality',
      'Watch on mobile and desktop',
      'Game alerts and notifications'
    ],
    isPopular: false
  },
  {
    id: 2,
    name: 'Quarterly',
    price: 3500, // in cents ($35.00)
    durationDays: 90,
    description: 'Best value for regular viewers',
    features: [
      'Access to all live games',
      'HD streaming quality',
      'Watch on mobile and desktop',
      'Game alerts and notifications',
      'No ads during game breaks',
      'Save 23% compared to monthly'
    ],
    isPopular: true
  },
  {
    id: 3,
    name: 'Semi-Annual',
    price: 5000, // in cents ($50.00)
    durationDays: 180,
    description: 'Our best deal for committed fans',
    features: [
      'Access to all live games',
      'HD streaming quality',
      'Watch on mobile and desktop',
      'Game alerts and notifications',
      'No ads during game breaks',
      'Save 44% compared to monthly'
    ],
    isPopular: false
  }
];

// Game state display text
export const GAME_STATES = {
  pre: {
    label: 'UPCOMING',
    className: 'bg-blue-500',
    icon: null,
    color: 'bg-blue-500',
    textColor: 'text-white'
  },
  in: {
    label: 'LIVE',
    className: 'bg-primary',
    icon: 'pulse', // For the pulsing animation
    color: 'bg-red-600',
    textColor: 'text-white'
  },
  post: {
    label: 'FINAL',
    className: 'bg-gray-600',
    icon: null,
    color: 'bg-gray-600',
    textColor: 'text-white'
  },
  delayed: {
    label: 'DELAYED',
    className: 'bg-amber-500',
    icon: 'warning',
    color: 'bg-amber-500',
    textColor: 'text-white'
  },
  postponed: {
    label: 'POSTPONED',
    className: 'bg-purple-600',
    icon: 'cancel',
    color: 'bg-purple-600',
    textColor: 'text-white'
  }
};

// Default fallback stream URL for all games
export const FALLBACK_STREAM_URL = 'https://live.webcastserver.online/hdstream/embed/86.m3u8';

// Base URL pattern for streams
export const STREAM_BASE_URL = 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/';
