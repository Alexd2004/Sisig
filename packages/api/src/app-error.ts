/**
 * Application-level error type with user-safe messages
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}
