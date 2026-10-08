import mongoose from "mongoose";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} butun son bo'lishi kerak.",
};

const topicSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },
    title: { type: String, required: true },
    minutes: { type: Number, required: true, min: 1, validate: integerValidator },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true, min: 1 },
    date: { type: String, match: DATE_RE },
    type: { type: String, enum: ["study", "review"], required: true },
    totalMinutes: { type: Number, required: true, min: 1 },
    topics: { type: [topicSchema], default: [] },
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    daysCount: { type: Number, required: true, min: 1, validate: integerValidator },
    dailyMinutes: { type: Number, required: true, min: 1, validate: integerValidator },
    // Sanalar vaqt zonasi siljishining oldini olish uchun "YYYY-MM-DD" satr sifatida saqlanadi.
    startDate: { type: String, required: true, match: DATE_RE },
    endDate: { type: String, required: true, match: DATE_RE },
    totalTopics: { type: Number, required: true, default: 6 },
    days: { type: [daySchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = String(ret._id);
        ret.userId = String(ret.userId);
        delete ret._id;
        return ret;
      },
    },
  }
);

// O'quvchining rejalari yangisidan eskisiga tez olinishi uchun.
studyPlanSchema.index({ userId: 1, createdAt: -1 });

export const StudyPlan = mongoose.models.StudyPlan || mongoose.model("StudyPlan", studyPlanSchema);
