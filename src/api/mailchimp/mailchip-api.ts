import mailchimpClient from '@mailchimp/mailchimp_transactional';
import { mailchimpMandrillApiKey } from 'src/utils/constants';

const mailchimp = mailchimpClient(mailchimpMandrillApiKey);

export const healthCheck = async () => await mailchimp.users.ping();
