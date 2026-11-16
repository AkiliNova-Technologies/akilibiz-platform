import { NextResponse } from "next/server";

export const API_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
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


/** Backward-compatible adapter for older APIs that return { error: string }.
 * Preserve original messages and extra fields while adding a stable code.
 * Endpoint-specific domain errors should use apiError directly.
 */
export function apiLegacyJson(body:unknown,status=200){
  if(status>=400 && body!==null && typeof body==="object" &&
    !Array.isArray(body) && typeof (body as {error?:unknown}).error==="string"){
    const original=body as Record<string,unknown> & {error:string};
    const code:ApiErrorCode=status===401?"UNAUTHORIZED":
      status===403?"FORBIDDEN":
      status===400||status===413||status===422?"VALIDATION_FAILED":
      status===404?"NOT_FOUND":
      status===409?"CONFLICT":
      status===423?"REQUEST_PENDING":
      status===502?"SYNC_UNAVAILABLE":
      "SERVICE_UNAVAILABLE";
    const details:Record<string,unknown>={...original};
    delete details.error;
    delete details.code;
    return apiError(code,original.error,status,details);
  }
  return apiSuccess(body,status);
}
