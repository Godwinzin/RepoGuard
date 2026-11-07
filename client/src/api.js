export class ApiError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.status = status; // for our code to decide things. Users see only `message`.
    this.code = code; // machine-readable reason, such as "reauthorize_required"
  }
}

function friendlyMessage(status, serverMessage) {
  if (status === 0) {
    return "We can't reach the server. Check your connection and try again.";
  }
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 404) {
    return serverMessage && serverMessage !== "Not found"
      ? serverMessage
      : "We couldn't find what you were looking for.";
  }
  if (status === 429) {
    return (
      serverMessage || "Too many requests. Please wait a moment and try again."
    );
  }
  if (status === 502 || status === 503 || status === 504) {
    return "A service we rely on isn't responding right now. Please try again in a moment.";
  }
  if (status >= 500)
    return "Something went wrong on our side. Please try again.";

  return serverMessage || "That didn't work. Please try again.";
}

export async function api(path, { method = "GET", body } = {}) {
  let res;

  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, friendlyMessage(0)); // the request never reached a server
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // some responses have no body
  }

  if (!res.ok) {
    if (res.status === 401)
      window.dispatchEvent(new Event("repoguard:unauthorized"));

    // A server-provided "message" is written for people, so it wins over our generic wording
    throw new ApiError(
      res.status,
      data?.message ?? friendlyMessage(res.status, data?.error),
      data?.error ?? null,
    );
  }

  return data;
}
