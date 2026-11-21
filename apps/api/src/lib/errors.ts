import type { z } from "zod";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "bad_request", message, details);
export const unauthorized = (message = "Sign in to continue") =>
  new ApiError(401, "unauthorized", message);
export const forbidden = (message = "You do not have access to this resource") =>
  new ApiError(403, "forbidden", message);
export const notFound = (message = "Not found") => new ApiError(404, "not_found", message);
export const conflict = (message: string) => new ApiError(409, "conflict", message);
export const tooMany = (message = "Too many requests. Try again shortly.") =>
  new ApiError(429, "rate_limited", message);
export const serverError = (message = "Something went wrong on our side") =>
  new ApiError(500, "server_error", message);

export function parseWith<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".");
    throw badRequest(
      first ? `${path ? `${path}: ` : ""}${first.message}` : "Invalid request",
      result.error.flatten(),
    );
  }
  return result.data;
}
