import { mockPartnerAccessEntity, mockSimplybookBodyBase } from 'test/utils/mockData';
import { serializeZapierSimplyBookDtoToTherapySessionEntity } from './serialize';

describe('Serialize', () => {
  describe('serializeZapierSimplyBookDtoToTherapySessionEntity', () => {
    it('should format object correctly when valid object is supplied', () => {
      const randomString = serializeZapierSimplyBookDtoToTherapySessionEntity(
        mockSimplybookBodyBase,
        mockPartnerAccessEntity,
      );
      expect(randomString).toEqual({
        action: 'UPDATED_BOOKING',
        bookingCode: 'abc',
        cancelledAt: null,
        clientEmail: 'testuser@test.com',
        clientTimezone: 'Europe/London',
        completedAt: null,
        endDateTime: new Date('2022-09-12T08:30:00+0000'),
        partnerAccessId: 'pa1',
        rescheduledFrom: null,
        serviceName: 'bloom therapy',
        serviceProviderEmail: 'therapist@test.com',
        serviceProviderName: 'Therapist name',
        startDateTime: new Date('2022-09-12T07:30:00+0000'),
        userId: null,
      });
    });
  });
});
