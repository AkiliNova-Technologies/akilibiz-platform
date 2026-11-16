import { NextResponse } from "next/server";

export const API_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "BUSINESS_ACCESS_REVOKED",
  "VALIDATION_FAILED",
  "CONFLICT",
  "SYNC_UNAVAILABLE",
  "REQUEST_PENDING",
  "STALE_DATA",
  "SERVICE_UNAVAILABLE",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" } as const;

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: message, code, ...details },
    { status, headers: PRIVATE_NO_STORE },
  );
}

export function apiSuccess<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: PRIVATE_NO_STORE,
  });
}
