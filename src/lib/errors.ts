/**
 * What this file does:
 * Defines the typed application errors that route handlers convert into HTTP responses.
 * What calls it:
 * Service-layer functions such as src/services/authService.ts and src/services/knowledgeEntryService.ts.
 * What it calls:
 * This file is intentionally leaf-level and does not depend on other application modules.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Throwing plain strings or generic Errors everywhere, which makes it much harder to map failures to correct HTTP status codes.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTHENTICATION_REQUIRED");
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ValidationBoundaryError extends AppError {
  constructor(message = "The request payload is invalid") {
    super(message, 400, "INVALID_REQUEST");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "The requested operation conflicts with current state") {
    super(message, 409, "CONFLICT");
  }
}
