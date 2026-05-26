import { Injectable } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import { Logger } from 'src/logger/logger';
import { ga4ServiceAccountKeyJson } from 'src/utils/constants';

// Read-only scope is enough — we only query the Data API, never modify GA4 config.
const GA4_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class Ga4AuthService {
  private readonly logger = new Logger('Ga4Auth');
  private cached: CachedToken | null = null;
  private authClient: GoogleAuth | null = null;

  async getAccessToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now() + 60_000) {
      return this.cached.token;
    }

    const client = this.getAuthClient();
    const tokenResp = (await client.getAccessToken()) as
      | string
      | null
      | undefined
      | { token?: string };
    const token = typeof tokenResp === 'string' ? tokenResp : (tokenResp?.token ?? undefined);
    if (!token) {
      throw new Error('Ga4Auth: GoogleAuth returned empty access token');
    }

    this.cached = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
    return token;
  }

  private getAuthClient(): GoogleAuth {
    if (this.authClient) return this.authClient;

    if (!ga4ServiceAccountKeyJson) {
      throw new Error('Ga4Auth: GA4_SERVICE_ACCOUNT_KEY_JSON is not set');
    }

    const credentials = this.parseCredentials(ga4ServiceAccountKeyJson);
    this.authClient = new GoogleAuth({ credentials, scopes: GA4_SCOPES });
    this.logger.log(`Ga4Auth initialised for service account ${credentials.client_email}`);
    return this.authClient;
  }

  private parseCredentials(raw: string): { client_email: string; private_key: string } {
    const candidate = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    try {
      return JSON.parse(candidate);
    } catch (err) {
      throw new Error(
        `Ga4Auth: GA4_SERVICE_ACCOUNT_KEY_JSON is not valid JSON (${err?.message || 'unknown'})`,
        { cause: err },
      );
    }
  }
}
