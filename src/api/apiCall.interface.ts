export interface ApiCallRequestOptions {
  url: string;
  data?: unknown;
  type: 'post' | 'get' | 'put' | 'delete';
  headers?: {
    Authorization?: string;
    'X-Crisp-Tier'?: string;
    'Content-Type'?: string;
  };
}
