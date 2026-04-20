export const CRON_EXPRESSIONS = {
  daily: '25 19 * * *', // 19:25 every day
  weekly: '25 19 * * MON', // 19:25 every Monday
  monthly: '25 19 1 * *', // 19:25 on the 1st of every month
  quarterly: '25 19 1 1,4,7,10 *', // 19:25 on the 1st of Jan/Apr/Jul/Oct
} as const;

// Slack's absolute cap is 50 blocks per message; stop short at 45 so the
// "truncated" notice itself can fit.
export const SLACK_BLOCK_SAFETY_MARGIN = 45;
