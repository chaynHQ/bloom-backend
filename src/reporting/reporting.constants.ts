// All digests fire at 09:00 Europe/London — late enough that GA4 "yesterday"
// data has stabilised (GA4 takes up to ~8h to finalise intraday data).
export const CRON_EXPRESSIONS = {
  daily: '4 9 * * *',
  weekly: '4 9 * * TUE',
  monthly: '4 9 21 * *',
  quarterly: '4 9 21 4 *',
  yearly: '4 9 21 4 *',
} as const;

// Slack caps at 50 blocks per message; leave headroom for the truncation notice.
export const SLACK_BLOCK_SAFETY_MARGIN = 45;
