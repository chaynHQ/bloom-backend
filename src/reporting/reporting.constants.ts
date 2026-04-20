export const CRON_EXPRESSIONS = {
  daily: '0 9 * * *', // 09:00 every day
  weekly: '0 9 * * MON', // 09:00 every Monday
  monthly: '0 9 1 * *', // 09:00 on the 1st of every month
  quarterly: '0 9 1 1,4,7,10 *', // 09:00 on the 1st of Jan/Apr/Jul/Oct
} as const;

// Slack's absolute cap is 50 blocks per message; stop short at 45 so the
// "truncated" notice itself can fit.
export const SLACK_BLOCK_SAFETY_MARGIN = 45;
