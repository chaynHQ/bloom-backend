/**
 * Simplybook REST Admin API client (https://user-api-v2.simplybook.me/admin).
 *
 * Auth model: login + password via POST /auth, returning a token used in `X-Token` headers.
 * When 2FA is enabled on the Simplybook account, /auth responds with `require2fa: true` and
 * we follow up with POST /auth/2fa carrying a TOTP code generated from SIMPLYBOOK_TOTP_SECRET.
 *
 * Future migration: Simplybook also exposes a "public" JSON-RPC API at https://user-api.simplybook.me
 * (Company Public Service API) that authenticates via an API key + secret key signature pattern
 * (`md5(bookingId + bookingHash + secretKey)`). It is not affected by admin 2FA and is the
 * recommended path for server-to-server integrations. Migrating the three methods used here
 * (getBookingId, cancelBooking, getBookingDetails → public `getBooking`, `cancelBooking`) would
 * let us drop the 2FA flow, the token mutex, and the SIMPLYBOOK_TOTP_SECRET env var.
 */
import axios from 'axios';
import { authenticator } from 'otplib';
import { Logger } from 'src/logger/logger';
import {
  simplybookCompanyName,
  simplybookCredentials,
  simplybookTotpSecret,
} from 'src/utils/constants';

type BookingResponse = {
  client: {
    name: string;
    email: string;
  };
  code: string;
};

export type SimplybookBookingDetails = {
  id: number;
  code: string;
  start_datetime: string;
  end_datetime: string;
  service: { name: string };
  provider: { name: string; email: string };
  client: { email: string };
  additional_fields: Array<{ id: number; field_name: string; value: string | null }>;
};

const SIMPLYBOOK_API_BASE_URL = 'https://user-api-v2.simplybook.me/admin';
const logger = new Logger('SimplybookAPI');

// Simplybook tokens last 1 hour — cache for 55 minutes to avoid re-authenticating on every call
const TOKEN_TTL_MS = 55 * 60 * 1000;
let cachedToken: { token: string; expiresAt: number } | null = null;
// Concurrent callers share a single in-flight auth so we don't fire /auth + 2FA
// multiple times in parallel — avoids redundant API calls, duplicate TOTP code
// submissions, and any rate-limiting on the auth endpoints.
let inFlightAuth: Promise<string> | null = null;

const performAuth = async (): Promise<string> => {
  const response = await axios.post(
    `${SIMPLYBOOK_API_BASE_URL}/auth`,
    JSON.parse(simplybookCredentials),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  let token: string;

  if (!response.data.require2fa) {
    token = response.data.token;
  } else {
    const normalisedSecret = simplybookTotpSecret.toUpperCase().replace(/\s/g, '');
    // If fewer than 3 seconds remain in the current 30s window, wait for the next one
    // to avoid sending a code that expires before Simplybook receives the request
    const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    if (secondsRemaining <= 3) {
      await new Promise((resolve) => setTimeout(resolve, (secondsRemaining + 1) * 1000));
    }
    const code = authenticator.generate(normalisedSecret);
    const credentials = JSON.parse(simplybookCredentials);
    const twoFaResponse = await axios.post(
      `${SIMPLYBOOK_API_BASE_URL}/auth/2fa`,
      {
        company: credentials.company,
        session_id: response.data.auth_session_id,
        type: 'ga',
        code,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );
    token = twoFaResponse.data.token;
  }

  cachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
};

const getAuthToken: () => Promise<string> = async () => {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (inFlightAuth) {
    return inFlightAuth;
  }

  inFlightAuth = performAuth().catch((error) => {
    handleError('Failed to authenticate against Simplybook API.', error);
    // handleError always throws; satisfies the type checker.
    throw error;
  });

  try {
    return await inFlightAuth;
  } finally {
    inFlightAuth = null;
  }
};

export const getBookingId: (bookingCode: string) => Promise<number> = async (
  bookingCode: string,
) => {
  const token = await getAuthToken();

  try {
    const bookingsResponse = await axios.get(
      `${SIMPLYBOOK_API_BASE_URL}/bookings?filter[search]=${bookingCode}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Login': simplybookCompanyName,
          'X-Token': `${token}`,
        },
      },
    );

    if (!bookingsResponse || !bookingsResponse.data.data || !bookingsResponse.data.data[0]?.id) {
      throw new Error('No data returned from Simplybook API for booking lookup');
    }

    return bookingsResponse.data.data[0].id;
  } catch (error) {
    handleError(
      `Failed to retrieve booking information for code ${bookingCode} from Simplybook.`,
      error,
    );
  }
};

export const cancelBooking: (id: number) => Promise<BookingResponse[]> = async (id: number) => {
  const token = await getAuthToken();

  try {
    const bookingsResponse = await axios.delete(`${SIMPLYBOOK_API_BASE_URL}/bookings/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Login': simplybookCompanyName,
        'X-Token': `${token}`,
      },
    });
    if (!bookingsResponse || !bookingsResponse.data) {
      throw new Error('No data returned from Simplybook API for cancel booking');
    }
    return bookingsResponse.data;
  } catch (error) {
    handleError(`Failed to cancel booking ${id} from Simplybook.`, error);
  }
};

export const getBookingDetails: (id: number) => Promise<SimplybookBookingDetails> = async (
  id: number,
) => {
  const token = await getAuthToken();

  try {
    const response = await axios.get(`${SIMPLYBOOK_API_BASE_URL}/bookings/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Login': simplybookCompanyName,
        'X-Token': `${token}`,
      },
    });

    if (!response?.data) {
      throw new Error('No data returned from Simplybook API for booking details');
    }

    return response.data;
  } catch (error) {
    handleError(`Failed to retrieve booking details for id ${id} from Simplybook.`, error);
  }
};

const handleError = (message: string, error) => {
  if (error?.response?.status === 401) {
    cachedToken = null;
  }
  const errorDetail = error?.message || error?.code || 'unknown error';
  const status = error?.response?.status;
  // Don't log error.response.data — booking responses contain client emails and other PII.
  // The caller's message already includes the bookingId/bookingCode to identify the record.
  logger.error(`${message}: ${errorDetail}${status ? ` (status ${status})` : ''}`);
  throw new Error(`${message}: ${errorDetail}`);
};
