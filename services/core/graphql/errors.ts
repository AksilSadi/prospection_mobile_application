export enum ErrorType {
  NETWORK = "NETWORK_ERROR",
  GRAPHQL = "GRAPHQL_ERROR",
  VALIDATION = "VALIDATION_ERROR",
  AUTHENTICATION = "AUTHENTICATION_ERROR",
  AUTHORIZATION = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND_ERROR",
  SERVER = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN_ERROR",
}

export class GraphQLClientError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode?: number,
    public originalError?: unknown,
    public graphQLErrors?: any[],
  ) {
    super(message);
    this.name = "GraphQLClientError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLClientError);
    }
  }

  getUserMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return "Vous etes hors ligne. Reactivez le Wi-Fi ou les donnees mobiles.";
      case ErrorType.AUTHENTICATION:
        return "Authentification requise. Veuillez vous reconnecter.";
      case ErrorType.AUTHORIZATION:
        return "Vous n'avez pas les permissions necessaires pour cette action.";
      case ErrorType.NOT_FOUND:
        return "Ressource non trouvee.";
      case ErrorType.VALIDATION:
        return "Donnees invalides. Verifiez vos entrees.";
      case ErrorType.GRAPHQL:
        return this.message || "Une erreur GraphQL est survenue.";
      case ErrorType.SERVER:
        return "Erreur serveur. Veuillez reessayer plus tard.";
      default:
        return "Une erreur inattendue est survenue.";
    }
  }

  isRetryable(): boolean {
    return [ErrorType.NETWORK, ErrorType.SERVER].includes(this.type);
  }
}

export class ErrorHandler {
  handleHttpError(status: number, statusText: string): GraphQLClientError {
    let errorType: ErrorType;
    let message: string;

    switch (Math.floor(status / 100)) {
      case 4:
        if (status === 401) {
          errorType = ErrorType.AUTHENTICATION;
          message = "Non authentifie";
        } else if (status === 403) {
          errorType = ErrorType.AUTHORIZATION;
          message = "Acces refuse";
        } else if (status === 404) {
          errorType = ErrorType.NOT_FOUND;
          message = "Ressource non trouvee";
        } else if (status === 400 || status === 422) {
          errorType = ErrorType.VALIDATION;
          message = "Donnees invalides";
        } else {
          errorType = ErrorType.UNKNOWN;
          message = "Erreur client";
        }
        break;
      case 5:
        errorType = ErrorType.SERVER;
        message = "Erreur serveur";
        break;
      default:
        errorType = ErrorType.UNKNOWN;
        message = "Erreur HTTP";
    }

    return new GraphQLClientError(
      `${message}: ${status} ${statusText}`,
      errorType,
      status,
    );
  }

  handleGraphQLErrors(errors: any[]): GraphQLClientError {
    const firstError = errors[0];
    const message = firstError.message || "Erreur GraphQL";
    let errorType = ErrorType.GRAPHQL;

    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("not authenticated") ||
      lowerMessage.includes("non authentifie") ||
      lowerMessage.includes("token invalide") ||
      lowerMessage.includes("token expir") ||
      lowerMessage.includes("token expi") ||
      lowerMessage.includes("authentification")
    ) {
      errorType = ErrorType.AUTHENTICATION;
    } else if (
      lowerMessage.includes("forbidden") ||
      lowerMessage.includes("not authorized") ||
      lowerMessage.includes("acces refuse") ||
      lowerMessage.includes("accès refuse")
    ) {
      errorType = ErrorType.AUTHORIZATION;
    } else if (
      lowerMessage.includes("not found") ||
      lowerMessage.includes("introuvable")
    ) {
      errorType = ErrorType.NOT_FOUND;
    } else if (
      lowerMessage.includes("validation") ||
      lowerMessage.includes("donnees invalides") ||
      lowerMessage.includes("données invalides")
    ) {
      errorType = ErrorType.VALIDATION;
    }

    return new GraphQLClientError(
      message,
      errorType,
      undefined,
      undefined,
      errors,
    );
  }

  handleNetworkError(error: unknown): GraphQLClientError {
    const message = error instanceof Error ? error.message : "Erreur reseau";

    return new GraphQLClientError(
      `Erreur de connexion: ${message}`,
      ErrorType.NETWORK,
      undefined,
      error,
    );
  }

  handleUnknownError(error: unknown): GraphQLClientError {
    if (error instanceof GraphQLClientError) {
      return error;
    }

    const message = error instanceof Error ? error.message : "Erreur inconnue";

    return new GraphQLClientError(message, ErrorType.UNKNOWN, undefined, error);
  }

  process(error: unknown): GraphQLClientError {
    if (error instanceof GraphQLClientError) {
      return error;
    }

    return this.handleUnknownError(error);
  }
}

export const errorHandler = new ErrorHandler();

export function isGraphQLClientError(
  error: unknown,
): error is GraphQLClientError {
  return error instanceof GraphQLClientError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof GraphQLClientError) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue";
}

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private formatMessage(level: string, namespace: string, args: any[]) {
    const timestamp = new Date().toISOString().slice(11, 23);
    return [`[${timestamp}] ${namespace} ${level}:`, ...args];
  }

  error(namespace: string, ...args: any[]) {
    if (this.level >= LogLevel.ERROR) {
      console.error(...this.formatMessage("ERROR", namespace, args));
    }
  }

  warn(namespace: string, ...args: any[]) {
    if (this.level >= LogLevel.WARN) {
      console.warn(...this.formatMessage("WARN", namespace, args));
    }
  }

  info(namespace: string, ...args: any[]) {
    if (this.level >= LogLevel.INFO) {
      console.info(...this.formatMessage("INFO", namespace, args));
    }
  }

  debug(namespace: string, ...args: any[]) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(...this.formatMessage("DEBUG", namespace, args));
    }
  }
}

export const logger = new Logger();

export function logError(error: unknown, context?: string): void {
  const namespace = context || "GraphQL Client";

  if (error instanceof GraphQLClientError) {
    logger.error(namespace, `${error.type}:`, {
      message: error.message,
      userMessage: error.getUserMessage(),
      statusCode: error.statusCode,
      isRetryable: error.isRetryable(),
      graphQLErrors: error.graphQLErrors,
      originalError: error.originalError,
    });
  } else {
    logger.error(namespace, "Error:", error);
  }
}
