import dotenv from 'dotenv';
dotenv.config();

export const NETRADYNE = {
  url: 'https://idms.netradyne.com/console/#/alerts',
  loginUrl: 'https://idms.netradyne.com',
  timeRange: 'Last 12 Hours',
  maxRetries: 3,
  // Ban-risk floor: never poll a Netradyne account faster than this (5 min default).
  minPollMs: Number(process.env.NETRADYNE_MIN_POLL_MS) || 300000,
};
