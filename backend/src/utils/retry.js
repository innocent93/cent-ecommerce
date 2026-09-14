// Small retry-with-backoff helper — used by email/SMS sending so a
// transient SMTP/provider hiccup doesn't permanently lose a notification.
// This is deliberately NOT a job queue (no Redis/BullMQ): it retries within
// the same fire-and-forget call, a few seconds apart, which is enough for
// "the SMTP server had a blip" without adding new infrastructure. See
// ENGINEERING_REPORT.md's "Background jobs" section for when to graduate to
// a real queue instead of this.
export const retryWithBackoff = async (fn, { attempts = 3, baseDelayMs = 1000 } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        const delay = baseDelayMs * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

export default retryWithBackoff;
