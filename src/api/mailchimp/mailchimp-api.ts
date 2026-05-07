import mailchimp from '@mailchimp/mailchimp_marketing';
import { createHash } from 'crypto';
import { mailchimpApiKey, mailchimpAudienceId, mailchimpServerPrefix } from 'src/utils/constants';
import { isCypressTestEmail } from 'src/utils/utils';
import { Logger } from '../../logger/logger';
import {
  ListMember,
  ListMemberPartial,
  MAILCHIMP_CUSTOM_EVENTS,
  MAILCHIMP_MERGE_FIELD_TYPES,
  UpdateListMemberRequest,
} from './mailchimp-api.interfaces';

const logger = new Logger('MailchimpAPI');

mailchimp.setConfig({
  apiKey: mailchimpApiKey,
  server: mailchimpServerPrefix,
});

export function getEmailMD5Hash(email: string) {
  return createHash('md5').update(email.toLowerCase().trim()).digest('hex');
}

// Mailchimp SDK errors carry the API's structured response on `error.response.body`
// (or `error.response.text`). The top-level `error.message` is just the HTTP status
// phrase ("Bad Request"), so without this we lose the actual reason from the API.
function formatMailchimpError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown error';
  const err = error as {
    status?: number;
    message?: string;
    response?: { body?: unknown; text?: string };
  };
  const status = err.status ?? '?';
  const body = err.response?.body;
  let detail: string;
  if (body && typeof body === 'object') {
    const b = body as {
      title?: string;
      detail?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };
    const fieldErrors = b.errors?.length
      ? ` errors=${JSON.stringify(b.errors)}`
      : '';
    detail = `${b.title ?? ''}: ${b.detail ?? ''}${fieldErrors}`.trim();
  } else if (typeof err.response?.text === 'string') {
    detail = err.response.text;
  } else {
    detail = err.message ?? 'unknown error';
  }
  return `status=${status} ${detail}`;
}

export const createMailchimpProfile = async (
  profileData: Partial<UpdateListMemberRequest>,
): Promise<ListMember> => {
  if (isCypressTestEmail(profileData.email_address)) {
    logger.log('Skipping Mailchimp profile creation for Cypress test email');
    return null;
  }

  try {
    return await mailchimp.lists.addListMember(mailchimpAudienceId, profileData);
  } catch (error) {
    throw new Error(
      `Create mailchimp profile API call failed: ${formatMailchimpError(error)}`,
      { cause: error },
    );
  }
};

export const batchCreateMailchimpProfiles = async (
  userProfiles: Partial<UpdateListMemberRequest>[],
) => {
  try {
    // Filter out Cypress test emails
    const filteredProfiles = userProfiles.filter(
      (profile) => !isCypressTestEmail(profile.email_address),
    );

    if (filteredProfiles.length === 0) {
      logger.log('No profiles to create after filtering out Cypress test emails');
      return;
    }

    const operations = [];

    filteredProfiles.forEach((userProfile, index) => {
      operations.push({
        method: 'POST',
        path: `/lists/${mailchimpAudienceId}/members`,
        operation_id: String(index),
        body: JSON.stringify(userProfile),
      });
    });

    const batchRequest = await mailchimp.batches.start({
      operations: operations,
    });
    logger.log(
      `Mailchimp batch create started - batchId: ${batchRequest.id}, operations: ${operations.length}`,
    );

    setTimeout(() => {
      mailchimp.batches
        .status(batchRequest.id)
        .then((batchResponse) => {
          logger.log(
            `Mailchimp batch create completed - batchId: ${batchRequest.id}, status: ${batchResponse.status}, total: ${batchResponse.total_operations}, errored: ${batchResponse.errored_operations}`,
          );
        })
        .catch((err) => {
          logger.warn(`Mailchimp batch create status check failed - batchId: ${batchRequest.id}: ${err?.message || 'unknown error'}`);
        });
    }, 120000);
  } catch (error) {
    throw new Error(
      `Batch create mailchimp profiles API call failed: ${error?.message || 'unknown error'}`,
      { cause: error },
    );
  }
};

export const batchUpdateMailchimpProfiles = async (
  userProfiles: Partial<UpdateListMemberRequest>[],
) => {
  try {
    // Filter out Cypress test emails
    const filteredProfiles = userProfiles.filter(
      (profile) => !isCypressTestEmail(profile.email_address),
    );

    if (filteredProfiles.length === 0) {
      logger.log('No profiles to update after filtering out Cypress test emails');
      return;
    }

    const operations = [];

    filteredProfiles.forEach((userProfile, index) => {
      operations.push({
        method: 'PATCH',
        path: `/lists/${mailchimpAudienceId}/members/${getEmailMD5Hash(userProfile.email_address)}`,
        operation_id: String(index),
        body: JSON.stringify(userProfile),
      });
    });

    const batchRequest = await mailchimp.batches.start({
      operations: operations,
    });
    logger.log(
      `Mailchimp batch update started - batchId: ${batchRequest.id}, operations: ${operations.length}`,
    );

    setTimeout(() => {
      mailchimp.batches
        .status(batchRequest.id)
        .then((batchResponse) => {
          logger.log(
            `Mailchimp batch update completed - batchId: ${batchRequest.id}, status: ${batchResponse.status}, total: ${batchResponse.total_operations}, errored: ${batchResponse.errored_operations}`,
          );
        })
        .catch((err) => {
          logger.warn(`Mailchimp batch update status check failed - batchId: ${batchRequest.id}: ${err?.message || 'unknown error'}`);
        });
    }, 120000);
  } catch (error) {
    throw new Error(`Batch update mailchimp profiles API call failed: ${error?.message || 'unknown error'}`, {
      cause: error,
    });
  }
};

export const updateMailchimpProfile = async (
  newProfileData: ListMemberPartial,
  email: string,
): Promise<ListMember> => {
  if (isCypressTestEmail(email)) {
    logger.log('Skipping Mailchimp profile update for Cypress test email');
    return null;
  }

  try {
    return await mailchimp.lists.updateListMember(
      mailchimpAudienceId,
      getEmailMD5Hash(email),
      newProfileData,
    );
  } catch (error) {
    if (error.status === 404 || error.message?.includes('not found')) {
      // Profile doesn't exist, create it using existing function
      const createData = {
        email_address: email,
        status: newProfileData.status || 'subscribed',
        ...newProfileData,
      };
      return await createMailchimpProfile(createData);
    }
    throw new Error(
      `Update mailchimp profile API call failed: ${formatMailchimpError(error)}`,
      { cause: error },
    );
  }
};

export const createMailchimpMergeField = async (
  name: string,
  tag: string,
  type: MAILCHIMP_MERGE_FIELD_TYPES,
): Promise<ListMember> => {
  try {
    return await mailchimp.lists.addListMergeField(mailchimpAudienceId, {
      name,
      tag,
      type,
      required: false,
    });
  } catch (error) {
    throw new Error(
      `Create mailchimp merge field API call failed: ${error?.message || 'unknown error'}`,
      { cause: error },
    );
  }
};

export const deleteMailchimpProfile = async (email: string) => {
  try {
    return await mailchimp.lists.deleteListMemberPermanent(
      mailchimpAudienceId,
      getEmailMD5Hash(email),
    );
  } catch (error) {
    logger.warn(`Delete mailchimp profile API call failed: ${error?.message || 'unknown error'}`);
  }
};

export const deleteCypressMailchimpProfiles = async () => {
  let cypressProfiles: { members: ListMember[] };

  try {
    cypressProfiles = (await mailchimp.lists.getSegmentMembersList(mailchimpAudienceId, '5046292', {
      include_cleaned: true,
      include_unsubscribed: true,
      count: 200,
    })) as {
      members: ListMember[];
    };
  } catch (error) {
    throw new Error(
      `Delete cypress mailchimp profiles API call failed to get users: ${error?.message || 'unknown error'}`,
      { cause: error },
    );
  }

  logger.log(`Deleting ${cypressProfiles.members.length} mailchimp profiles`);

  for (const profile of cypressProfiles.members) {
    try {
      await deleteMailchimpProfile(profile.email_address);
    } catch (error) {
      throw new Error(
        `Delete cypress mailchimp profiles API call failed: ${error?.message || 'unknown error'}`,
        { cause: error },
      );
    }
  }
};

export const sendMailchimpUserEvent = async (email: string, event: MAILCHIMP_CUSTOM_EVENTS) => {
  try {
    await mailchimp.lists.createListMemberEvent(mailchimpAudienceId, getEmailMD5Hash(email), {
      name: event,
    });
  } catch (error) {
    throw new Error(`Send mailchimp user event failed: ${error?.message || 'unknown error'}`, {
      cause: error,
    });
  }
};
