// Server URL configuration
// Change this to your server's IP address or domain when hosting locally
// For example: 'http://192.168.1.100:3000' or 'http://localhost:3000'
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || '192.168.1.123:3000';

// Buzzer URL
export const BUZZER_URL = `${SERVER_URL}/buzzer`;

