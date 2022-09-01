import { Logger } from '@nestjs/common';
import axios from 'axios';

import { simplybookCompanyName, simplybookCredentials } from 'src/utils/constants';

type BookingReponse = {
  client: {
    name: string;
    email: string;
  };
  code: string;
};

export type BookingInfo = {
  clientEmail: string;
  bookingCode: string;
  date: Date;
};

const DATE_FORMAT_LENGTH = 'YYYY-mm-dd'.length;
const SIMPLYBOOK_API_BASE_URL = 'https://user-api-v2.simplybook.me/admin';
const LOGGER = new Logger('SimplybookAPI');

const getAuthToken: () => Promise<string> = async () => {
  try {
    const response = await axios({
      method: 'post',
      url: `${SIMPLYBOOK_API_BASE_URL}/auth`,
      data: JSON.parse(simplybookCredentials),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data.token;
  } catch (error) {
    handleError('Failed to authenticate against Simplybook API.', error);
  }
};

const queryBookingsForDate: (date: Date) => Promise<BookingReponse[]> = async (date: Date) => {
  const token = await getAuthToken();

  const simplybookFilterDateString = date.toISOString().substring(0, DATE_FORMAT_LENGTH);

  try {
    const bookingsResponse = await axios({
      method: 'get',
      url: `${SIMPLYBOOK_API_BASE_URL}/bookings?filter[date]=${simplybookFilterDateString}&filter[status]=confirmed`,
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Login': simplybookCompanyName,
        'X-Token': `${token}`,
      },
    });

    return bookingsResponse.data.data;
  } catch (error) {
    handleError(
      `Failed to retrieve client booking information for ${date} from Simplybook.`,
      error,
    );
  }
};

export const getBookingsForDate: (date: Date) => Promise<BookingInfo[]> = async (date: Date) => {
  try {
    const bookings: BookingReponse[] = await queryBookingsForDate(date);

    return bookings.map((booking) => ({
      clientEmail: booking.client.email,
      bookingCode: booking.code,
      date: date,
    }));
  } catch (error) {
    handleError(
      `Failed to retrieve client booking information for ${date} from Simplybook.`,
      error,
    );
  }
};

const handleError = (error: any, message: string) => {
  LOGGER.error(message, error);
  throw new Error(`${message}: ${error})`);
};
