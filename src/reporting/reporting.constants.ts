// All digests fire at 09:00 Europe/London — late enough that GA4 "yesterday"
// data has stabilised (GA4 takes up to ~8h to finalise intraday data).
export const CRON_EXPRESSIONS = {
  daily: '35 10 * * *',
  weekly: '35 10 * * *',
  monthly: '35 10 * * *',
  quarterly: '35 10 * * *',
  yearly: '35 10 * * *',
} as const;

// Slack caps at 50 blocks per message; leave headroom for the truncation notice.
export const SLACK_BLOCK_SAFETY_MARGIN = 45;
