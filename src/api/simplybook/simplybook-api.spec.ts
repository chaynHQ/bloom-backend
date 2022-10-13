import axios from 'axios';
import { getBookingsForDate } from './simplybook-api';

// Mock out all top level functions, such as get, put, delete and post:
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const simplyBookAuthResponse = {
  data: {
    token: 'simplybooktoken',
  },
};
const mockBookingArray = [
  {
    client: {
      email: 'ellie@chayn.co',
    },
    status: 'confirmed',
    code: 'bookingCodeA',
    start_datetime: '2022-10-09 00:30:00',
    end_datetime: '2022-10-09 01:00:00',
  },
];
describe('simplybook-api tests', () => {
  beforeEach(() => {
    mockedAxios.post.mockImplementationOnce(() => Promise.resolve(simplyBookAuthResponse));
    mockedAxios.get.mockImplementationOnce(() =>
      Promise.resolve({ data: { data: mockBookingArray } }),
    );
  });
  it('should get bookings for date', async () => {
    const bookings = await getBookingsForDate(new Date(2022, 9, 10));
    expect(bookings).toEqual([
      {
        bookingCode: 'bookingCodeA',
        clientEmail: 'ellie@chayn.co',
        date: new Date(2022, 9, 10),
      },
    ]);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
});
