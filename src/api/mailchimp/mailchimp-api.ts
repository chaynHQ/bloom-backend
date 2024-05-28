import { mailchimp } from '@mailchimp/mailchimp_marketing';
import { UserEntity } from 'src/entities/user.entity';
import { mailchimpApiKey, mailchimpAudienceId, mailchimpServerPrefix } from 'src/utils/constants';

mailchimp.setConfig({
  apiKey: mailchimpApiKey,
  server: mailchimpServerPrefix,
});

export interface MailchimpAudience {
  NAME: string;
  SIGNUPD: string;
  FTHERAPYD: string;
  NTHERAPYD: string;
  LTHERAPYD: string;
  PARTNERS: string;
  COURSES: string;
}

export async function ping() {
  const response = await mailchimp.ping.get();
  console.log(response);
}

export async function createMailchimpProfile(user: UserEntity) {
  const response = await mailchimp.lists.addListMember(mailchimpAudienceId, {
    email_address: user.email,
    status: 'subscribed',
    language: user.signUpLanguage,
    marketingPermissions: { enabled: user.contactPermission },
    merge_fields: {
      FNAME: user.name,
    },
  });

  console.log(
    `Successfully added contact as an audience member. The contact's id is ${response.id}.`,
  );
}
