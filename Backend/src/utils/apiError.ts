export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details: Record<string, string> | undefined;

  constructor(statusCode: number, message: string, details?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
