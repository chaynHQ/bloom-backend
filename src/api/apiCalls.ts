import axios, { AxiosResponse } from 'axios';
import { ApiCallRequestOptions } from './apiCall.interface';

const apiCall = async ({
  type,
  headers,
  data,
  url,
}: ApiCallRequestOptions): Promise<AxiosResponse> => {
  return await axios({
    method: type,
    url,
    data,
    headers,
  });
};

export default apiCall;
