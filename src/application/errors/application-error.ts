export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
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
