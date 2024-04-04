import { mailchimp } from '@mailchimp/mailchimp_marketing';
import { mailchimpApiKey, mailchimpServerPrefix } from 'src/utils/constants';

mailchimp.setConfig({
  apiKey: mailchimpApiKey,
  server: mailchimpServerPrefix,
});

export async function run() {
  const response = await mailchimp.ping.get();
  console.log(response);
}
