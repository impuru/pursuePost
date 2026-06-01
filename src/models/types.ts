export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export type BodyType =
  | 'none'
  | 'json'
  | 'raw'
  | 'form-data'
  | 'x-www-form-urlencoded';

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
  oauth2Token?: string;
}

export interface RequestTab {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  bodyJson: string;
  bodyRaw: string;
  bodyFormData: KeyValuePair[];
  bodyUrlEncoded: KeyValuePair[];
  auth: AuthConfig;
  isDirty: boolean;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  error?: string;
}

export interface HistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  timestamp: number;
  status?: number;
  request: Partial<RequestTab>;
}

export interface CollectionItem {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  request: Partial<RequestTab>;
}

export interface Collection {
  id: string;
  name: string;
  items: CollectionItem[];
}

export interface WebviewMessage {
  type: string;
  payload?: unknown;
}
