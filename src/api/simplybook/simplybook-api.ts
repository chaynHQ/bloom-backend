import axios from 'axios';
import { Logger } from 'src/logger/logger';

import { simplybookCompanyName, simplybookCredentials } from 'src/utils/constants';

type BookingResponse = {
  client: {
    name: string;
    email: string;
  };
  code: string;
};

const SIMPLYBOOK_API_BASE_URL = 'https://user-api-v2.simplybook.me/admin';
const logger = new Logger('SimplybookAPI');

const getAuthToken: () => Promise<string> = async () => {
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
    return response.data.token;
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

const handleError = (message: string, error) => {
  const errorDetail = error?.message || error?.code || 'unknown error';
  logger.error(`${message}: ${errorDetail}`);
  throw new Error(`${message}: ${errorDetail}`);
};
