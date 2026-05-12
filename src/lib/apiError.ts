export class ApiError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string>;
  public readonly code?: string;

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string>,
    code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }

  static unauthorized(message = 'Please sign in to continue.') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'This action requires admin access.') {
    return new ApiError(403, message);
  }
  static notFound(message = "We couldn't find what you were looking for.") {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static badRequest(message: string, errors?: Record<string, string>) {
    return new ApiError(400, message, errors);
  }
}
