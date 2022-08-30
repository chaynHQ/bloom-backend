import axios from 'axios';

import { simplybookCompanyName, simplybookCredentials } from 'src/utils/constants';

type Booking = {
  client: {
    name: string;
    email: string;
  };
  code: string;
};

type SimplybookBookingInfo = {
  clientEmail: string;
  bookingCode: string;
  date: Date;
};

const DATE_FORMAT_LENGTH = 'YYYY-mm-dd'.length;
const SIMPLYBOOK_API_URL = 'https://user-api-v2.simplybook.me/admin/auth';

const getAuthToken: () => Promise<string> = async () => {
  const response = await axios({
    method: 'post',
    url: SIMPLYBOOK_API_URL,
    data: JSON.parse(simplybookCredentials),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data.token;
};

const getBookingsForDate: (date: Date) => Promise<Booking[]> = async (date: Date) => {
  const token = await getAuthToken();

  const simplybookFilterDateString = date.toISOString().substring(0, DATE_FORMAT_LENGTH);

  const bookingsResponse = await axios({
    method: 'get',
    url: `https://user-api-v2.simplybook.me/admin/bookings?filter[date]=${simplybookFilterDateString}&filter[status]=confirmed`,
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Login': simplybookCompanyName,
      'X-Token': `${token}`,
    },
  });

  return bookingsResponse.data.data;
};

export const getTherapyBookingInfoForDate: (date: Date) => Promise<SimplybookBookingInfo[]> =
  async (date: Date) => {
    const bookings: Booking[] = await getBookingsForDate(date);

    return bookings.map((booking) => ({
      clientEmail: booking.client.email,
      bookingCode: booking.code,
      date: date,
    }));
  };
