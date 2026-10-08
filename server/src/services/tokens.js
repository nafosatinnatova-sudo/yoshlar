import jwt from "jsonwebtoken";
import { config } from "../config.js";

const ALGORITHM = "HS256";

/**
 * JWT: payload { sub: userId, role }, HS256, muddati JWT_EXPIRES_IN.
 * @param {{ _id: unknown, role: string }} user
 */
export function signToken(user) {
  return jwt.sign({ role: user.role }, /** @type {string} */ (config.jwtSecret), {
    algorithm: ALGORITHM,
    subject: String(user._id),
    expiresIn: /** @type {any} */ (config.jwtExpiresIn),
  });
}

/**
 * Tokenni tekshiradi; noto'g'ri yoki muddati o'tgan bo'lsa jsonwebtoken xatosini tashlaydi.
 * @param {string} token
 * @returns {import("jsonwebtoken").JwtPayload}
 */
export function verifyToken(token) {
  const payload = jwt.verify(token, /** @type {string} */ (config.jwtSecret), { algorithms: [ALGORITHM] });
  if (typeof payload === "string") throw new jwt.JsonWebTokenError("invalid payload");
  return payload;
}
