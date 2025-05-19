import { Logger } from '@nestjs/common';
import axios from 'axios';
import { format } from 'date-fns';

import { simplybookCompanyName, simplybookCredentials } from 'src/utils/constants';

type BookingResponse = {
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

const SIMPLYBOOK_API_BASE_URL = 'https://user-api-v2.simplybook.me/admin';
const LOGGER = new Logger('SimplybookAPI');

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

const queryBookingsForDate: (date: Date) => Promise<BookingResponse[]> = async (date: Date) => {
  const token = await getAuthToken();

  const simplybookFilterDateString = format(date, 'yyyy-MM-dd');

  try {
    const bookingsResponse = await axios.get(
      `${SIMPLYBOOK_API_BASE_URL}/bookings?filter[date]=${simplybookFilterDateString}&filter[status]=confirmed`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Login': simplybookCompanyName,
          'X-Token': `${token}`,
        },
      },
    );
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
    const bookings: BookingResponse[] = await queryBookingsForDate(date);

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

export const cancelBooking: (id: string) => Promise<BookingResponse[]> = async (id: string) => {
  const token = await getAuthToken();

  try {
    const bookingsResponse = await axios.delete(`${SIMPLYBOOK_API_BASE_URL}/bookings/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Login': simplybookCompanyName,
        'X-Token': `${token}`,
      },
    });
    return bookingsResponse.data.data;
  } catch (error) {
    handleError(`Failed to cancel booking ${id} from Simplybook.`, error);
  }
};

// Not currently used but might be used in future implementations so am keeping
export const deleteClient: (clientId: string) => Promise<string> = async (clientId) => {
  const token = await getAuthToken();

  try {
    const bookingsResponse = await axios.get(`${SIMPLYBOOK_API_BASE_URL}/client/${clientId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Login': simplybookCompanyName,
        'X-Token': `${token}`,
      },
    });
    return bookingsResponse.data.data;
  } catch (error) {
    handleError(`Failed to delete client ${clientId} from Simplybook.`, error);
  }
};

export const updateSimplybookClient = async (clientId: string, clientData: { email?: string }) => {
  const token = await getAuthToken();
  try {
    const bookingsResponse = await axios.patch(`${SIMPLYBOOK_API_BASE_URL}/client/${clientId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Login': simplybookCompanyName,
        'X-Token': `${token}`,
      },
      body: clientData,
    });
    LOGGER.log({ event: 'UPDATE_SIMPLYBOOK_CLIENT', fields: [Object.keys(clientData)] });
    return bookingsResponse.data.data;
  } catch (error) {
    LOGGER.error({
      error: 'SIMPLYBOOK_CLIENT_UPDATE_ERROR',
      status: error.status,
      errorMessage: error.message,
    });
    handleError(`Failed to edit client ${clientId} from Simplybook.`, error);
  }
};

const handleError = (error, message: string) => {
  LOGGER.error(message, error);
  throw new Error(`${message}: ${error})`);
};
