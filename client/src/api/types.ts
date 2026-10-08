// Request / response types for the REST API (docs/CONTRACT.md §3–§4).
// Plan day/topic/progress shapes are re-used from the shared algorithm module so the
// frontend and backend can never drift apart.
import type { PlanDay, PlanTopic, Progress } from '@shared/planner';

export type { PlanDay, PlanTopic, Progress };

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export type Role = 'student' | 'teacher' | 'admin';

export const ROLES: readonly Role[] = ['student', 'teacher', 'admin'] as const;

/** Public user object (never contains the password hash). */
export interface PublicUser {
  id: string;
  fullName: string;
  username: string;
  role: Role;
  /** Assigned teacher id (students only), otherwise null. */
  teacherId: string | null;
  /** ISO date-time string. */
  createdAt: string;
}

/** User row returned by GET /api/admin/users (students also carry their teacher's name). */
export interface AdminUser extends PublicUser {
  teacherName?: string | null;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface LoginBody {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface MeResponse {
  user: PublicUser;
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

/** Full study plan (GET /api/plans/:id, POST /api/plans, PATCH topic). */
export interface Plan {
  id: string;
  userId: string;
  title: string;
  subject: string;
  daysCount: number;
  dailyMinutes: number;
  /** "YYYY-MM-DD" */
  startDate: string;
  /** "YYYY-MM-DD" (startDate + daysCount − 1) */
  endDate: string;
  /** Always 6. */
  totalTopics: number;
  days: PlanDay[];
  /** Computed server-side with computeProgress(days). */
  progress: Progress;
  /** ISO date-time string. */
  createdAt: string;
  /** ISO date-time string. */
  updatedAt: string;
}

/** Plan without `days` (list endpoints). */
export type PlanSummary = Omit<Plan, 'days'>;

/**
 * Body for POST /api/plans/preview. Numbers may be sent as numbers or numeric strings —
 * the server re-validates everything with validatePlanInput.
 */
export interface PlanInputBody {
  title: string;
  subject: string;
  daysCount: number | string;
  dailyMinutes: number | string;
  /** "YYYY-MM-DD" */
  startDate: string;
  /** Exactly 6 topic titles. */
  topics: string[];
}

/** Body for POST /api/plans. */
export interface CreatePlanBody extends PlanInputBody {
  /** Subset of "t1".."t6" that should be saved as completed (completedAt = now). */
  completedTopicIds?: string[];
}

/** Computed (not yet saved) plan returned by POST /api/plans/preview. */
export interface PlanPreview {
  title: string;
  subject: string;
  daysCount: number;
  dailyMinutes: number;
  startDate: string;
  endDate: string;
  totalTopics: number;
  days: PlanDay[];
  progress: Progress;
}

export interface PreviewResponse {
  preview: PlanPreview;
}

export interface PlanResponse {
  plan: Plan;
}

export interface PlansListResponse {
  plans: PlanSummary[];
}

export interface SetTopicCompletedBody {
  completed: boolean;
}

/* ------------------------------------------------------------------ */
/* Teacher                                                             */
/* ------------------------------------------------------------------ */

/** Row of GET /api/teacher/students. */
export interface TeacherStudent {
  id: string;
  fullName: string;
  username: string;
  plansCount: number;
  totalTopics: number;
  completedTopics: number;
  /** Aggregated percent over all plans: percentOf(sum completed, sum total). */
  progress: number;
  /** ISO date-time of the latest topic completion, or null. */
  lastActivityAt: string | null;
}

export interface TeacherStudentsResponse {
  students: TeacherStudent[];
}

/** Completions per day (from completedAt), oldest → newest. */
export interface ActivityPoint {
  /** "YYYY-MM-DD" */
  date: string;
  completed: number;
}

export interface TeacherStudentSummary {
  plansCount: number;
  totalTopics: number;
  completedTopics: number;
  /** Aggregated percent (0–100). */
  progress: number;
}

/** GET /api/teacher/students/:id/plans */
export interface TeacherStudentPlansResponse {
  student: PublicUser;
  /** Full plans (with days + progress). */
  plans: Plan[];
  /** Last 14 days including today, oldest → newest. */
  activity: ActivityPoint[];
  summary: TeacherStudentSummary;
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/** GET /api/admin/statistics */
export interface AdminStatistics {
  users: { total: number; students: number; teachers: number; admins: number };
  plans: { total: number; /** percent == 100 */ completed: number; inProgress: number };
  topics: { total: number; completed: number };
  /** Mean of plan percents, rounded (0 if no plans). */
  averageProgress: number;
  /** percentOf(topics.completed, topics.total). */
  overallProgress: number;
  /** Last 14 days, oldest → newest. */
  recentActivity: ActivityPoint[];
}

export interface UsersListResponse {
  users: AdminUser[];
}

export interface UserResponse {
  user: AdminUser;
}

/** POST /api/admin/users */
export interface CreateUserBody {
  fullName: string;
  username: string;
  /** Minimum 6 characters. */
  password: string;
  role: Role;
  /** Students only; must reference a teacher. */
  teacherId?: string | null;
}

/** PATCH /api/admin/users/:id — send only the fields that change. */
export interface UpdateUserBody {
  fullName?: string;
  role?: Role;
  /** null → unassign teacher. */
  teacherId?: string | null;
  /** New password (min 6). Omit to keep the current one. */
  password?: string;
}

/* ------------------------------------------------------------------ */
/* Generic                                                             */
/* ------------------------------------------------------------------ */

export interface MessageResponse {
  message: string;
}

export interface HealthResponse {
  status: 'ok';
}

/** Error body returned by the API for every non-2xx response. */
export interface ApiErrorBody {
  message: string;
  /** Field → message (validation errors, 400). */
  errors?: Record<string, string>;
  /** Per-topic messages (index 0..5), null where the topic is valid. */
  topicErrors?: (string | null)[];
}
