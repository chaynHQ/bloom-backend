// All digests fire at 09:00 Europe/London — late enough that GA4 "yesterday"
// data has stabilised (GA4 takes up to ~8h to finalise intraday data).
export const CRON_EXPRESSIONS = {
  daily: '30 9 * * *',
  weekly: '30 9 * * TUE',
  monthly: '30 9 21 * *',
  quarterly: '30 9 21 4 *',
  yearly: '30 9 21 4 *',
} as const;

// Slack caps at 50 blocks per message; leave headroom for the truncation notice.
export const SLACK_BLOCK_SAFETY_MARGIN = 45;
