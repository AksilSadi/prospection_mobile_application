import type { GraphQLResponse } from '@/types/api';
import { ApiException } from '@/types/api';
import { API_URL } from '@/constants/env';
import {
  ErrorType,
  GraphQLClientError,
  errorHandler,
  isGraphQLClientError,
  getErrorMessage,
  logError,
} from './errors';

export { ErrorType, GraphQLClientError, isGraphQLClientError, getErrorMessage, logError };

const GRAPHQL_ENDPOINT = API_URL ? `${API_URL}/graphql` : '';

export const config = {
  endpoint: GRAPHQL_ENDPOINT,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
} as const;

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: GraphQLClientError) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class GraphQLClient {
  private endpoint: string;
  private defaultHeaders: Record<string, string>;
  private retryOptions: RetryOptions;

  constructor(
    endpoint: string = config.endpoint,
    headers: Record<string, string> = {},
    retryOptions: RetryOptions = {}
  ) {
    this.endpoint = endpoint;
    this.defaultHeaders = { ...config.defaultHeaders, ...headers };
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  }

  async request<TData = any, TVariables = Record<string, any>>(
    query: string,
    variables?: TVariables,
    headers?: Record<string, string>
  ): Promise<TData> {
    if (!this.endpoint) {
      throw new GraphQLClientError(
        'API URL manquante. Verifiez EXPO_PUBLIC_API_URL.',
        ErrorType.SERVER
      );
    }

    const requestHeaders = { ...this.defaultHeaders, ...headers };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw errorHandler.handleHttpError(response.status, response.statusText);
      }

      const result: GraphQLResponse<TData> = await response.json();

      if (result.errors && result.errors.length > 0) {
        throw errorHandler.handleGraphQLErrors(result.errors);
      }

      if (!result.data) {
        throw new GraphQLClientError('Aucune donnee retournee par le serveur', ErrorType.SERVER);
      }

      return result.data;
    } catch (error) {
      if (error instanceof GraphQLClientError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw errorHandler.handleNetworkError(error);
      }

      throw errorHandler.process(error);
    }
  }

  async requestWithRetry<TData = any, TVariables = Record<string, any>>(
    query: string,
    variables?: TVariables,
    headers?: Record<string, string>,
    customRetryOptions?: RetryOptions
  ): Promise<TData> {
    const retryOptions = { ...this.retryOptions, ...customRetryOptions };
    const maxRetries = retryOptions.maxRetries || 3;
    let lastError: GraphQLClientError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request<TData, TVariables>(query, variables, headers);
      } catch (error) {
        if (error instanceof GraphQLClientError && error.isRetryable()) {
          lastError = error;

          if (attempt < maxRetries) {
            const delayMs = (retryOptions.retryDelay || 1000) * Math.pow(2, attempt);

            if (retryOptions.onRetry) {
              retryOptions.onRetry(attempt + 1, error);
            }

            await delay(delayMs);
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError || new GraphQLClientError('Echec apres plusieurs tentatives', ErrorType.UNKNOWN);
  }

  setHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  setAuthToken(token: string): void {
    this.setHeaders({ Authorization: `Bearer ${token}` });
  }

  clearAuthToken(): void {
    const { Authorization, ...headers } = this.defaultHeaders;
    this.defaultHeaders = headers;
  }
}

export const graphqlClient = new GraphQLClient();

export async function gql<TData = any, TVariables = Record<string, any>>(
  query: string,
  variables?: TVariables
): Promise<TData> {
  return graphqlClient.request<TData, TVariables>(query, variables);
}

export function isGraphQLError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.message.includes('GraphQL') || error instanceof GraphQLClientError)
  );
}

export function handleApiError(error: unknown): ApiException {
  if (error instanceof GraphQLClientError) {
    return new ApiException(
      error.getUserMessage(),
      error.statusCode,
      error.graphQLErrors?.map(e => ({
        message: e.message,
        statusCode: error.statusCode,
      }))
    );
  }

  if (error instanceof Error) {
    return new ApiException(error.message);
  }

  return new ApiException('Erreur API inconnue');
}
