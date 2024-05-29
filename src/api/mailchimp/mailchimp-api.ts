import { mailchimp } from '@mailchimp/mailchimp_marketing';
import { createHash } from 'crypto';
import { mailchimpApiKey, mailchimpAudienceId, mailchimpServerPrefix } from 'src/utils/constants';
import {
  ListMember,
  ListMemberPartial,
  MAILCHIMP_MERGE_FIELD,
  UpdateListMemberRequest,
} from './mailchimp-api.interfaces';

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
  try {
    return await mailchimp.lists.addListMember(mailchimpAudienceId, profileData);
  } catch (error) {
    throw new Error(`Create mailchimp profile API call failed: ${error}`);
  }
}

// Note getMailchimpProfile is not currently used
export const getMailchimpProfile = async (email: string): Promise<ListMember> => {
  try {
    return await mailchimp.lists.getListMember(mailchimpAudienceId, getEmailMD5Hash(email));
  } catch (error) {
    throw new Error(`Get mailchimp profile API call failed: ${error}`);
  }
};

export const updateMailchimpProfile = async (
  newProfileData: ListMemberPartial,
  email: string,
): Promise<ListMember> => {
  try {
    return await mailchimp.lists.updateListMember(mailchimpAudienceId, getEmailMD5Hash(email), {
      newProfileData,
    });
  } catch (error) {
    throw new Error(`Update mailchimp profile API call failed: ${error}`);
  }
};

export const createMailchimpMergeField = async (
  name: string,
  type: MAILCHIMP_MERGE_FIELD,
): Promise<ListMember> => {
  try {
    return await mailchimp.lists.addListMergeField(mailchimpAudienceId, {
      name,
      type,
      required: false,
    });
  } catch (error) {
    throw new Error(`Create mailchimp merge field API call failed: ${error}`);
  }
};

export const deleteMailchimpProfile = async (email: string) => {
  try {
    return await mailchimp.lists.deleteListMember(mailchimpAudienceId, getEmailMD5Hash(email));
  } catch (error) {
    throw new Error(`Delete mailchimp profile API call failed: ${error}`);
  }
};

export const deleteCypressMailchimpProfiles = async () => {
  try {
    const cypressProfiles = (await mailchimp.lists.getSegmentMembersList(
      mailchimpAudienceId,
      '874073',
    )) as { members: ListMember[] };

    cypressProfiles.members.forEach(async (profile: ListMember) => {
      deleteMailchimpProfile(profile.email_address);
    });
  } catch (error) {
    throw new Error(`Delete cypress mailchimp profiles API call failed: ${error}`);
  }
};
