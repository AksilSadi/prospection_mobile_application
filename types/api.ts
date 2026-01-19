export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
  }>;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

export class ApiException extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errors?: ApiError[]
  ) {
    super(message);
    this.name = 'ApiException';
  }
}
