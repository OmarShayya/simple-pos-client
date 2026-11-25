import { AxiosError } from "axios";

/** The raw message of an error (server `message`, else the JS error message). */
const rawMessage = (error: unknown): string => {
  if (error instanceof AxiosError) return (error.response?.data as { message?: string } | undefined)?.message || error.message || "Something went wrong.";
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
};

/**
 * A plain-language message for any API error (toasts, ErrorState). Server validation messages
 * ("Please enter a valid phone number") pass through; network failures and raw 5xx errors are
 * replaced with something a cashier can act on.
 */
export const friendlyError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return error.code === "ECONNABORTED"
        ? "The server took too long to answer. Please try again."
        : "Can't reach the server. Check the internet connection and try again.";
    }
    const status = error.response.status;
    const message = (error.response.data as { message?: string } | undefined)?.message;
    // Server crashes say nothing useful to a cashier ("Internal error", stack names…)
    if (status >= 500) return "Something went wrong on the server. Please try again in a moment.";
    if (status === 403 && !message) return "You don't have permission to do this.";
    if (status === 404 && !message) return "This item no longer exists. Refresh and try again.";
    return message || rawMessage(error);
  }
  if (error instanceof Error && /network error/i.test(error.message)) {
    return "Can't reach the server. Check the internet connection and try again.";
  }
  return rawMessage(error);
};
