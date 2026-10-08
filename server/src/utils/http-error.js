// HTTP xatolarini bir xil shaklda ({ message, errors?, topicErrors? }) qaytarish uchun.

import { MSG } from "../messages.js";

export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {{ errors?: Record<string, string>, topicErrors?: (string | null)[] }} [details]
   */
  constructor(status, message, details = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = details.errors;
    this.topicErrors = details.topicErrors;
  }

  toJSON() {
    /** @type {{ message: string, errors?: Record<string, string>, topicErrors?: (string | null)[] }} */
    const body = { message: this.message };
    if (this.errors && Object.keys(this.errors).length > 0) body.errors = this.errors;
    if (this.topicErrors) body.topicErrors = this.topicErrors;
    return body;
  }
}

/**
 * 400 validatsiya xatosi: `message` — maydonlar ro'yxatidagi birinchi xato.
 * @param {Record<string, string>} errors
 * @param {string[]} [priority] xabar tanlash tartibi (maydon nomlari)
 * @param {(string | null)[]} [topicErrors]
 */
export function validationError(errors, priority = [], topicErrors) {
  const order = [...priority, ...Object.keys(errors)];
  const firstKey = order.find((key) => errors[key]);
  const message = firstKey ? errors[firstKey] : MSG.validationFailed;
  return new HttpError(400, message, { errors, topicErrors });
}
