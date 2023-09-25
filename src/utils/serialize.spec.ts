import { mockSimplybookBodyBase } from 'test/utils/mockData';
import { formatTherapySessionObject } from './serialize';

describe('Serialize', () => {
  describe('formatTherapySessionObject', () => {
    it('should format object correctly when valid object is supplied', () => {
      const randomString = formatTherapySessionObject(mockSimplybookBodyBase, 'partnerAccessId');
      expect(randomString).toEqual({
        action: 'UPDATED_BOOKING',
        bookingCode: 'abc',
        cancelledAt: null,
        clientEmail: 'testuser@test.com',
        clientTimezone: 'Europe/London',
        completedAt: null,
        endDateTime: new Date('2022-09-12T08:30:00+0000'),
        partnerAccessId: 'partnerAccessId',
        rescheduledFrom: null,
        serviceName: 'bloom therapy',
        serviceProviderEmail: 'therapist@test.com',
        serviceProviderName: 'therapist@test.com',
        startDateTime: new Date('2022-09-12T07:30:00+0000'),
        userId: mockSimplybookBodyBase.client_id,
      });
    });
  });
});
