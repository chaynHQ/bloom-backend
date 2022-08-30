import mailchimp from '@mailchimp/mailchimp_marketing';
import { mailchimpApiKey, mailchimpServerPrefix } from 'src/utils/constants';

mailchimp.setConfig({
  apiKey: mailchimpApiKey,
  server: mailchimpServerPrefix,
});
enum MAILCHIMP_SUBSCRIBER_STATUS {
  SUBSCRIBED = 'subscribed',
  UNSUBSCRIBED = 'unsubscribed',
  CLEANED = 'cleaned',
  PENDING = 'pending',
  TRANSACTIONAL = 'transactional',
}

enum MAILCHIMP_LIST {
  LISTA = 'listid',
}

export const healthCheck = async () => await mailchimp.ping.get();

export const createMailChimpContact = async (
  listId: MAILCHIMP_LIST,
  email: string,
  status: MAILCHIMP_SUBSCRIBER_STATUS,
  tags: string[],
) => {
  const response = await mailchimp.addListMember(listId, {
    email_address: email,
    status,
    tags,
  });
  return response;
};
