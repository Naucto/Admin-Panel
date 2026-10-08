/** A refused or failed request, with the server's own message when it gave one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }

  static async from(response: Response): Promise<ApiError> {
    let message = `${response.status} ${response.statusText}`.trim();
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join('. ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // The body was not JSON: the status line is all there is to say.
    }
    return new ApiError(response.status, message);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return 'The Naucto API cannot be reached.';
  }
  return error instanceof Error ? error.message : String(error);
}
