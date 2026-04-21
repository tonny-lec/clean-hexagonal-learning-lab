export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = new.target.name;

    if (options?.cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        value: options.cause,
        enumerable: false,
        configurable: true,
      });
    }
  }
}

export class InvalidRequestApplicationError extends ApplicationError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'InvalidRequest', 400, options);
  }
}

export class NotFoundApplicationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'NotFound', 404);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'ExternalServiceError', 502, options);
  }
}

export class InvalidHttpRequestError extends ApplicationError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'InvalidHttpRequest', 400, options);
  }
}

export class AuthenticationRequiredApplicationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'AuthenticationRequired', 401);
  }
}

export class AuthorizationApplicationError extends ApplicationError {
  constructor(message: string) {
    super(message, 'Forbidden', 403);
  }
}
