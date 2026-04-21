// All digests fire at 09:00 Europe/London — late enough that GA4 "yesterday"
// data has stabilised (GA4 takes up to ~8h to finalise intraday data).
export const CRON_EXPRESSIONS = {
  daily: '45 9 * * *',
  weekly: '45 9 * * MON',
  monthly: '45 9 1 * *',
  quarterly: '45 9 1 1,4,7,10 *',
  yearly: '45 9 1 1 *',
} as const;

// Slack caps at 50 blocks per message; leave headroom for the truncation notice.
export const SLACK_BLOCK_SAFETY_MARGIN = 45;
