import { AxiosResponse } from 'axios';
import apiCall from 'src/api/apiCalls';
import { crispWebsiteId } from 'src/utils/constants';
import { updateServiceUserProfilesPartnerAccess } from 'src/utils/serviceUserProfiles';
import { mockPartnerAccessEntity, mockPartnerEntity, mockUserEntity } from 'test/utils/mockData';
import { CrispProfileBaseResponse } from './crisp-api.interfaces';

jest.mock('src/api/apiCalls');

describe('CrispApi', () => {
  describe('updateServiceUserProfilesPartnerAccess', () => {
    it('should updateCrispProfile', async () => {
      const mockedApiCall = apiCall as jest.MockedFunction<typeof apiCall>;
      mockedApiCall
        .mockImplementationOnce(
          async () =>
            ({
              data: { error: false, reason: 'resolved', data: {} },
            }) as AxiosResponse<CrispProfileBaseResponse>,
        )
        .mockImplementationOnce(
          async () =>
            ({
              data: { error: false, reason: 'resolved', data: {} },
            }) as AxiosResponse<CrispProfileBaseResponse>,
        )
        .mockImplementationOnce(
          async () =>
            ({
              data: { error: false, reason: 'resolved', data: { segments: ['public'] } },
            }) as AxiosResponse<CrispProfileBaseResponse>,
        );

      // Clear the mock so the next test starts with fresh data

      await updateServiceUserProfilesPartnerAccess(mockUserEntity.email, [
        { ...mockPartnerAccessEntity, partner: mockPartnerEntity },
      ]);
      const baseUrl = `https://api.crisp.chat/v1/website/${crispWebsiteId}`;
      expect(apiCall).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          // updating people data
          url: `${baseUrl}/people/data/${mockUserEntity.email}`,
          type: 'patch',
        }),
      );
      expect(apiCall).toHaveBeenCalledTimes(1);
      mockedApiCall.mockClear();
    });
  });
});
