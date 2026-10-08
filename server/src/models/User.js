import mongoose from "mongoose";

export const ROLES = Object.freeze(["student", "teacher", "admin"]);
export const USERNAME_RE = /^[a-z0-9_.]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const FULL_NAME_MAX = 100;

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: FULL_NAME_MAX },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: USERNAME_MIN,
      maxlength: USERNAME_MAX,
      match: USERNAME_RE,
    },
    // bcrypt xeshi. Standart so'rovlarda qaytarilmaydi (select: false) va JSON ga hech qachon chiqmaydi.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "student", index: true },
    // Faqat o'quvchilar uchun: biriktirilgan o'qituvchi.
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        ret.teacherId = ret.teacherId ? String(ret.teacherId) : null;
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
