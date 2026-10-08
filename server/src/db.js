// MongoDB ulanishi (Mongoose).
// NoSQL-injection himoyasi: strictQuery (sxemada yo'q maydonlar bo'yicha filtrlash e'tiborsiz qoldiriladi)
// va sanitizeFilter (filtrdagi `{ $ne: ... }` kabi operator obyektlari `$eq` ga o'raladi).
// Kodimizda ataylab operator ishlatilganda mongoose.trusted() bilan belgilanadi.

import mongoose from "mongoose";

mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true);

/**
 * @param {string} uri
 * @param {import("mongoose").ConnectOptions} [options]
 */
export async function connectDB(uri, options = {}) {
  if (!uri) throw new Error("MONGODB_URI o'rnatilmagan.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, ...options });
  // Indekslar (masalan, username unique) tayyor bo'lishini kutamiz.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export { mongoose };
