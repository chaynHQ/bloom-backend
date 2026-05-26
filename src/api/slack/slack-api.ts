import { Injectable } from '@nestjs/common';
import { Logger } from 'src/logger/logger';
import { AxiosResponse } from 'axios';
import {
  isProduction,
  slackBloomUsersWebhookUrl,
  slackDeletedUsersWebhookUrl,
  slackReportingBotToken,
  slackReportingChannelId,
  slackWebhookUrl,
} from 'src/utils/constants';
import apiCall from '../apiCalls';

const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

/** Response shape from Slack's `chat.postMessage`. `ts` is the message
 *  timestamp — pass it back as `thread_ts` to attach replies to the parent. */
export interface SlackPostMessageResponse {
  ts: string;
  channel: string;
}

@Injectable()
export class SlackMessageClient {
  private readonly logger = new Logger('SlackClient');

  public async sendMessageToTherapySlackChannel(text: string): Promise<AxiosResponse | string> {
    if (!isProduction) return; // only send messages in production environment

    try {
      const response = await apiCall({
        url: slackWebhookUrl,
        type: 'post',
        data: {
          text: text,
        },
      });
      this.logger.log('Message sent to slack Therapy Channel');
      return response;
    } catch (err) {
      this.logger.error(`Unable to sendMessageToTherapySlackChannel: ${err?.message || 'unknown error'}`);
      return err;
    }
  }

  public async sendMessageToBloomUserChannel(text: string): Promise<AxiosResponse | string> {
    if (!isProduction) return; // only send messages in production environment

    try {
      const response = await apiCall({
        url: slackBloomUsersWebhookUrl,
        type: 'post',
        data: {
          text: text,
        },
      });
      this.logger.log('Message sent to slack Bloom User Channel');
      return response;
    } catch (err) {
      this.logger.error(`Unable to sendMessageToBloomUserSlackChannel: ${err?.message || 'unknown error'}`);
      return err;
    }
  }

  public async sendMessageToDeletedUsersSlackChannel(
    text: string,
  ): Promise<AxiosResponse | string> {
    if (!isProduction) return; // only send messages in production environment

    try {
      const response = await apiCall({
        url: slackDeletedUsersWebhookUrl,
        type: 'post',
        data: {
          text: text,
        },
      });
      this.logger.log('Message sent to slack Deleted Users Channel');
      return response;
    } catch (err) {
      this.logger.error(`Unable to sendMessageToDeletedUsersSlackChannel: ${err?.message || 'unknown error'}`);
      return err;
    }
  }

  /**
   * Post a message to the reporting channel via `chat.postMessage` (bot
   * token, not webhook) so the returned `ts` can be used to attach thread
   * replies. The reporting flow needs threading because quarterly/yearly
   * digests exceed Slack's 50-blocks-per-message ceiling; webhooks cannot
   * thread, so this path is bot-token-only.
   *
   * Unlike the other Slack helpers above (which gate on `isProduction` to
   * avoid messaging real channels from dev/staging), reporting is explicitly
   * operational — staging runs need to land in the channel so scheduled-run
   * tests are end-to-end visible. Missing token/channel throws so the caller
   * can mark the run failed instead of silently dropping the message.
   */
  public async postReportingMessage(
    blocks: unknown[],
    opts: { fallbackText?: string; threadTs?: string } = {},
  ): Promise<SlackPostMessageResponse> {
    if (!slackReportingBotToken || !slackReportingChannelId) {
      throw new Error(
        'Reporting Slack config missing — SLACK_REPORTING_BOT_TOKEN and SLACK_REPORTING_CHANNEL_ID are required',
      );
    }

    const payload: Record<string, unknown> = {
      channel: slackReportingChannelId,
      text: opts.fallbackText ?? 'Bloom reporting digest',
      blocks,
    };
    if (opts.threadTs) payload.thread_ts = opts.threadTs;

    const response = await apiCall({
      url: SLACK_POST_MESSAGE_URL,
      type: 'post',
      headers: {
        Authorization: `Bearer ${slackReportingBotToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      data: payload,
    });

    // Slack returns 200 OK even when the call fails — the failure is in the
    // JSON body. Surface that as a thrown error so the caller can mark the
    // run failed; "200 with ok=false" silently dropping reports would defeat
    // the point of removing the webhook fallback.
    const body = response.data as { ok: boolean; ts?: string; channel?: string; error?: string };
    if (!body?.ok || !body.ts) {
      throw new Error(`Slack chat.postMessage failed: ${body?.error || 'unknown error'}`);
    }

    this.logger.log(
      opts.threadTs
        ? `Reporting thread reply posted (parent ts=${opts.threadTs})`
        : `Reporting parent message posted (ts=${body.ts})`,
    );
    return { ts: body.ts, channel: body.channel ?? slackReportingChannelId };
  }
}
