import axios from 'axios';
import { Logger } from 'src/logger/logger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authenticator } = require('otplib');

import { simplybookCompanyName, simplybookCredentials, simplybookTotpSecret } from 'src/utils/constants';

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

const getAuthToken: () => Promise<string> = async () => {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
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
      const code = authenticator.generate(normalisedSecret).toString();
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
  } catch (error) {
    handleError('Failed to authenticate against Simplybook API.', error);
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
  const responseData = error?.response?.data;
  logger.error(`${message}: ${errorDetail}`);
  if (responseData) logger.error(`Simplybook response body: ${JSON.stringify(responseData)}`);
  throw new Error(`${message}: ${errorDetail}`);
};
