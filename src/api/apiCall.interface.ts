export interface ApiCallRequestOptions {
  url: string;
  data?: unknown;
  type: 'post' | 'get' | 'put' | 'delete' | 'patch';
  headers?: {
    Authorization?: string;
    'X-Crisp-Tier'?: string;
    'Content-Type'?: string;
  };
}
