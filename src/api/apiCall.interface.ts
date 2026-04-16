export interface ApiCallRequestOptions {
  url: string;
  data?: unknown;
  type: 'post' | 'get' | 'put' | 'delete' | 'patch';
  headers?: {
    Authorization?: string;
    'Content-Type'?: string;
  };
}
