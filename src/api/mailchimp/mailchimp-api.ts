import { mailchimp } from '@mailchimp/mailchimp_marketing';
import { createHash } from 'crypto';
import { mailchimpApiKey, mailchimpAudienceId, mailchimpServerPrefix } from 'src/utils/constants';
import { ListMember, ListMemberPartial, UpdateListMemberRequest } from './mailchimp-api.interfaces';

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

export async function getEmailMD5Hash(email: string) {
  return createHash('md5').update(email).digest('hex');
}

export async function ping() {
  const response = await mailchimp.ping.get();
  console.log(response);
}

export async function createMailchimpProfile(profileData: Partial<UpdateListMemberRequest>) {
  const response = await mailchimp.lists.addListMember(mailchimpAudienceId, profileData);

  console.log(
    `Successfully added contact as an audience member. The contact's id is ${response.id}.`,
  );
}

// Note getMailchimpProfile is not currently used
export const getMailchimpProfile = async (email: string): Promise<ListMember> => {
  return await mailchimp.lists.getListMember(mailchimpAudienceId, getEmailMD5Hash(email));
};

export const updateMailchimpProfile = async (
  newProfileData: ListMemberPartial,
  email: string,
): Promise<ListMember> => {
  return await mailchimp.lists.updateListMember(mailchimpAudienceId, getEmailMD5Hash(email), {
    newProfileData,
  });
};

export const deleteMailchimpProfile = async (email: string) => {
  return await mailchimp.lists.deleteListMember(mailchimpAudienceId, getEmailMD5Hash(email));
};

export const deleteCypressMailchimpProfiles = async () => {
  const cypressProfiles = (await mailchimp.lists.getSegmentMembersList(
    mailchimpAudienceId,
    '874073',
  )) as { members: ListMember[] };

  cypressProfiles.members.forEach(async (profile: ListMember) => {
    deleteMailchimpProfile(profile.email_address);
  });

  return 'ok';
};
