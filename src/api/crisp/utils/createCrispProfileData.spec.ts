import { createCrispProfileData } from './createCrispProfileData';

const userDto = {
  email: 'user@email.com',
  name: 'name',
  firebaseUid: 'iiiiod',
  contactPermission: false,
  id: 'string',
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
};
const partnerAccess = {
  featureLiveChat: true,
  featureTherapy: false,
  therapySessionsRedeemed: 5,
  therapySessionsRemaining: 5,
  id: 'string',
  activatedAt: new Date(),
  accessCode: '123456',
  active: true,
  partner: { name: 'partner' },
};

describe('createCrispProfileData', () => {
  describe('createCrispProfileData should return correctly ', () => {
    it('when supplied with user with no partneraccess , it should return correctly', () => {
      expect(createCrispProfileData(userDto, [], [])).toEqual({
        feature_live_chat: false,
        feature_therapy: false,
        partners: '',
        therapy_sessions_redeemed: 0,
        therapy_sessions_remaining: 0,
      });
    });
    it('when supplied with user with two partneraccess , it should return correctly', () => {
      expect(createCrispProfileData(userDto, [partnerAccess, partnerAccess], [])).toEqual({
        feature_live_chat: true,
        feature_therapy: false,
        therapy_sessions_redeemed: 10,
        therapy_sessions_remaining: 10,
        partners: 'partner; partner',
      });
    });
  });
});
