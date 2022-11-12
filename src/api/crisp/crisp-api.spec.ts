import { AxiosResponse } from 'axios';
import apiCall from 'src/api/apiCalls';
import { crispWebsiteId } from 'src/utils/constants';
import { mockPartnerAccessEntity, mockPartnerEntity, mockUserEntity } from 'test/utils/mockData';
import { updateCrispProfileAccesses } from './crisp-api';
import { CrispProfileResponse, CrispResponse } from './crisp-api.interfaces';

jest.mock('src/api/apiCalls');

describe('CrispApi', () => {
  describe('updateCrispProfileAccesses', () => {
    it('should updateCrispProfile', async () => {
      const mockedApiCall = apiCall as jest.MockedFunction<typeof apiCall>;
      mockedApiCall
        .mockImplementationOnce(
          async () =>
            ({
              data: { error: false, reason: 'resolved', data: {} },
            } as AxiosResponse<CrispResponse>),
        )
        .mockImplementationOnce(
          async () =>
            ({
              data: { error: false, reason: 'resolved', data: {} },
            } as AxiosResponse<CrispResponse>),
        )
        .mockImplementationOnce(
          async () =>
            ({
              data: { error: false, reason: 'resolved', data: { segments: ['public'] } },
            } as AxiosResponse<CrispProfileResponse>),
        );

      // Clear the mock so the next test starts with fresh data

      await updateCrispProfileAccesses(
        mockUserEntity,
        [{ ...mockPartnerAccessEntity, partner: mockPartnerEntity }],
        [],
      );
      const baseUrl = `https://api.crisp.chat/v1/website/${crispWebsiteId}`;
      // request to get profile data
      expect(apiCall).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          url: `${baseUrl}/people/data/${mockUserEntity.email}`,
          type: 'get',
        }),
      );

      expect(apiCall).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          // updating people data
          url: `${baseUrl}/people/data/${mockUserEntity.email}`,
          type: 'patch',
        }),
      );
      expect(apiCall).toHaveBeenNthCalledWith(
        3,
        // request to get
        expect.objectContaining({
          // request to update profile
          url: `${baseUrl}/people/profile/${mockUserEntity.email}`,
          type: 'get',
        }),
      );
      expect(apiCall).toHaveBeenNthCalledWith(
        4,
        // request to get
        expect.objectContaining({
          // request to update profile
          url: `${baseUrl}/people/profile/${mockUserEntity.email}`,
          type: 'patch',
          data: expect.objectContaining({
            segments: ['bumble', 'public'],
          }),
        }),
      );
      mockedApiCall.mockClear();
    });
  });
});
