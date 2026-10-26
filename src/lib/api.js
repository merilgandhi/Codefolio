export class ApiError extends Error {
  constructor(message, status = 0, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function api(path, { body, signal, method, timeoutMs = 10000 } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      credentials: 'same-origin',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers:
        body === undefined
          ? {}
          : { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('Could not reach CodeFolio. Check your connection and try again.');
  }
  if (response.status === 204) return null;
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      'The server returned an unexpected response. Please try again.',
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(
      result.error?.message || 'Something went wrong. Please try again.',
      response.status,
      result.error?.fields,
    );
  return result;
}
