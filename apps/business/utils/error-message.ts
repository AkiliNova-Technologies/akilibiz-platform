/**
 * Converts values thrown across Tauri and JavaScript boundaries to a safe,
 * user-facing message without assuming an error payload shape.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string" && message) {
      return message;
    }
  }

  if (error && typeof error === "object" && "error" in error) {
    const { error: nestedError } = error as { error: unknown };
    if (typeof nestedError === "string" && nestedError) {
      return nestedError;
    }
  }

  return fallback;
}
