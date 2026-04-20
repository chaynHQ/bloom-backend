// ============================================================================
// ⚠️  TEMPORARY TEST CONFIGURATION — DO NOT MERGE
// ----------------------------------------------------------------------------
// All four period crons are set to fire at 19:28 Europe/London on every day
// for a one-off end-to-end test (all four digests will post simultaneously
// to Slack). This also means the idempotency guard will kick in after the
// first fire — only the first minute-match per period-slot actually posts,
// subsequent fires log `already claimed` and exit. That's expected and
// validates the idempotency path.
//
// REVERT before merge — original values are commented beside each line.
// ============================================================================
export const CRON_EXPRESSIONS = {
  daily: '42 22 * * *', // ORIGINAL: '0 9 * * *'
  weekly: '42 22 * * *', // ORIGINAL: '0 9 * * MON'
  monthly: '42 22 * * *', // ORIGINAL: '0 9 1 * *'
  quarterly: '42 22 * * *', // ORIGINAL: '0 9 1 1,4,7,10 *'
} as const;

// Slack's absolute cap is 50 blocks per message; stop short at 45 so the
// "truncated" notice itself can fit.
export const SLACK_BLOCK_SAFETY_MARGIN = 45;
