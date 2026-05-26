// Each cron fires at 09:00 Europe/London — late enough that GA4 "yesterday"
// data has stabilised (GA4 takes up to ~8h to finalise intraday data).
// Cadence is encoded directly in the cron rather than relying on idempotency
// to suppress duplicate sends, so a non-prod environment with idempotency
// bypassed doesn't post the same digest every day.
export const CRON_EXPRESSIONS = {
  daily: '0 9 * * *', // every day
  weekly: '0 9 * * 1', // Mondays
  monthly: '0 9 1 * *', // 1st of each month
  quarterly: '0 9 1 1,4,7,10 *', // 1st of Jan / Apr / Jul / Oct
  yearly: '0 9 1 1 *', // 1st of January
} as const;

// Slack caps at 50 blocks per message. Each thread reply is independently
// bounded by this limit; the parent message is short by construction. 49 keeps
// one block of headroom for the truncation notice if a runaway breakdown ever
// pushes a single reply over the ceiling.
export const SLACK_BLOCK_SAFETY_MARGIN = 49;
