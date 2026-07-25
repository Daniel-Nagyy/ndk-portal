import dotenv from 'dotenv';
dotenv.config();

export const NETRADYNE = {
  url: 'https://idms.netradyne.com/console/#/alerts',
  email: process.env.NETRADYNE_EMAIL,
  password: process.env.NETRADYNE_PASSWORD,
  pollInterval: Number(process.env.NETRADYNE_POLL_INTERVAL_MS) || 60000,
  maxRetries: 3,
  timeRange: 'Last 12 Hours',
};