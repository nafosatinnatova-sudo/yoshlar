// Typed fetch wrapper + one function per REST endpoint (docs/CONTRACT.md §4).
//
// - Base URL: import.meta.env.VITE_API_URL (empty → same origin, Vite proxies /api in dev).
// - JSON in / JSON out, Bearer token from localStorage ("ssp_token").
// - Every failure is thrown as ApiError with an Uzbek, human-readable `message`.
// - 401 on an authenticated request → token is cleared and a window "auth:logout" event is
//   dispatched (AuthContext listens, resets the session and redirects to /login).
import { tokenStorage } from '@/utils/storage';
import type {
  AdminStatistics,
  ApiErrorBody,
  CreatePlanBody,
  CreateUserBody,
  HealthResponse,
  LoginResponse,
  MeResponse,
  MessageResponse,
  PlanInputBody,
  PlanResponse,
  PlansListResponse,
  PreviewResponse,
  Role,
  TeacherStudentPlansResponse,
  TeacherStudentsResponse,
  UpdateUserBody,
  UserResponse,
  UsersListResponse,
} from './types';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const NETWORK_ERROR_MESSAGE = "Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring.";
export const TIMEOUT_ERROR_MESSAGE = "Server javob bermadi. Birozdan so'ng qayta urinib ko'ring.";
export const INVALID_RESPONSE_MESSAGE = "Serverdan noto'g'ri javob keldi. Keyinroq urinib ko'ring.";
export const SESSION_EXPIRED_MESSAGE = 'Sessiya muddati tugagan. Qaytadan kiring.';

/** Window event fired when an authenticated request gets 401. detail: AuthLogoutDetail */
export const AUTH_LOGOUT_EVENT = 'auth:logout';

export interface AuthLogoutDetail {
  /** Server message (e.g. "Sessiya muddati tugagan. Qaytadan kiring."). */
  message: string;
}

/** Fallback messages when the server did not send one. */
const STATUS_MESSAGES: Record<number, string> = {
  400: "So'rov formati noto'g'ri.",
  401: 'Avval tizimga kiring.',
  403: "Bu amalni bajarish uchun ruxsatingiz yo'q.",
  404: "So'ralgan ma'lumot topilmadi.",
  409: "Bu ma'lumot allaqachon mavjud.",
  413: "Yuborilgan ma'lumot hajmi juda katta.",
  429: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.",
  500: "Serverda xatolik yuz berdi. Keyinroq urinib ko'ring.",
};

/** Default request timeout. Generous because free hosting tiers can cold-start slowly. */
const DEFAULT_TIMEOUT_MS = 60_000;

/* ------------------------------------------------------------------ */
/* ApiError                                                            */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  /** HTTP status; 0 = network failure / timeout (no response). */
  readonly status: number;
  /** Field → message map (400 validation errors). */
  readonly errors?: Record<string, string>;
  /** Per-topic messages (index 0..5) for plan validation errors. */
  readonly topicErrors?: (string | null)[];

  constructor(
    message: string,
    status: number,
    details: { errors?: Record<string, string>; topicErrors?: (string | null)[] } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details.errors) this.errors = details.errors;
    if (details.topicErrors) this.topicErrors = details.topicErrors;
  }

  /** True when the server could not be reached (status 0). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** True for errors caused by an AbortSignal (component unmounted, request superseded…). */
export function isAbortError(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    (value as { name?: unknown }).name === 'AbortError'
  );
}

/* ------------------------------------------------------------------ */
/* Core request                                                        */
/* ------------------------------------------------------------------ */

function resolveBaseUrl(): string {
  let base = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  // Tolerate VITE_API_URL values that already end with /api.
  if (/\/api$/i.test(base)) base = base.slice(0, -4);
  return base;
}

/** Resolved API origin ('' = same origin). */
export const API_BASE_URL = resolveBaseUrl();

/** Options accepted by every endpoint function. */
export interface RequestOptions {
  /** Abort the request (e.g. on component unmount). Aborts reject with a DOMException named "AbortError". */
  signal?: AbortSignal;
  /** Override the default 60 s timeout (0 disables it). */
  timeoutMs?: number;
}

export interface ApiRequestInit extends RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Serialised as JSON. */
  body?: unknown;
  /** Appended as a query string (undefined/null/'' values are skipped). */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Attach the Bearer token (default true). */
  auth?: boolean;
}

function buildUrl(path: string, query?: ApiRequestInit['query']): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  let url = `${API_BASE_URL}${normalized}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `${url.includes('?') ? '&' : '?'}${qs}`;
  }
  return url;
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, msg] of Object.entries(value)) {
    if (typeof msg === 'string' && msg) out[key] = msg;
  }
  return Object.keys(out).length ? out : undefined;
}

function toTopicErrors(value: unknown): (string | null)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => (typeof item === 'string' && item ? item : null));
}

function dispatchLogout(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AuthLogoutDetail>(AUTH_LOGOUT_EVENT, { detail: { message } }));
}

/**
 * Low-level request. Resolves with the parsed JSON body (typed as T) or throws ApiError.
 * Prefer the typed endpoint functions below.
 */
export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = init;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? tokenStorage.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  // Combine the caller's signal with our timeout.
  const controller = new AbortController();
  let timedOut = false;
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : undefined;
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }

  let response: Response;
  let text: string;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    text = await response.text();
  } catch (err) {
    if (timedOut) throw new ApiError(TIMEOUT_ERROR_MESSAGE, 0);
    if (signal?.aborted) {
      throw isAbortError(err) ? err : new DOMException('Aborted', 'AbortError');
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  const data = parseJson(text);

  if (response.ok) {
    if (response.status === 204 || text === '') return {} as T;
    if (data === undefined) throw new ApiError(INVALID_RESPONSE_MESSAGE, response.status);
    return data as T;
  }

  const errorBody: Partial<ApiErrorBody> | undefined = isRecord(data) ? (data as Partial<ApiErrorBody>) : undefined;
  let message = typeof errorBody?.message === 'string' && errorBody.message.trim() ? errorBody.message : '';
  if (!message) {
    // A non-JSON 5xx comes from a proxy/gateway (backend down, cold start…), not from our API.
    if (!errorBody && response.status >= 500) message = NETWORK_ERROR_MESSAGE;
    else message = STATUS_MESSAGES[response.status] ?? STATUS_MESSAGES[response.status >= 500 ? 500 : 400];
  }

  if (response.status === 401 && token) {
    // Session is no longer valid — forget it everywhere.
    tokenStorage.clear();
    dispatchLogout(message || SESSION_EXPIRED_MESSAGE);
  }

  throw new ApiError(message, response.status, {
    errors: toStringRecord(errorBody?.errors),
    topicErrors: toTopicErrors(errorBody?.topicErrors),
  });
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

const seg = (value: string) => encodeURIComponent(value);

/** GET /api/health → { status: "ok" } */
export function getHealth(options?: RequestOptions): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/health', { ...options, auth: false });
}

/** POST /api/auth/login → { token, user }. 400 field errors, 401 wrong credentials, 429 rate limit. */
export function login(username: string, password: string, options?: RequestOptions): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    ...options,
    method: 'POST',
    body: { username: username.trim(), password },
    auth: false,
  });
}

/** GET /api/auth/me → { user } */
export function getMe(options?: RequestOptions): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/auth/me', options);
}

/** POST /api/plans/preview (student) → { preview }. 400 → ApiError with errors/topicErrors. */
export function previewPlan(body: PlanInputBody, options?: RequestOptions): Promise<PreviewResponse> {
  return apiRequest<PreviewResponse>('/api/plans/preview', { ...options, method: 'POST', body });
}

/** POST /api/plans (student) → 201 { plan }. Server recomputes days; completedTopicIds saved as completed. */
export function createPlan(body: CreatePlanBody, options?: RequestOptions): Promise<PlanResponse> {
  return apiRequest<PlanResponse>('/api/plans', { ...options, method: 'POST', body });
}

/** GET /api/plans (student) → { plans } own plans, newest first. */
export function listPlans(options?: RequestOptions): Promise<PlansListResponse> {
  return apiRequest<PlansListResponse>('/api/plans', options);
}

/** GET /api/plans/:id (owner / owner's teacher / admin) → { plan }. 403/404 possible. */
export function getPlan(id: string, options?: RequestOptions): Promise<PlanResponse> {
  return apiRequest<PlanResponse>(`/api/plans/${seg(id)}`, options);
}

/** PATCH /api/plans/:id/topics/:topicId (owner) → { plan } with fresh progress. */
export function setTopicCompleted(
  planId: string,
  topicId: string,
  completed: boolean,
  options?: RequestOptions,
): Promise<PlanResponse> {
  return apiRequest<PlanResponse>(`/api/plans/${seg(planId)}/topics/${seg(topicId)}`, {
    ...options,
    method: 'PATCH',
    body: { completed },
  });
}

/** DELETE /api/plans/:id (owner) → { message: "Reja o'chirildi." } */
export function deletePlan(id: string, options?: RequestOptions): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/api/plans/${seg(id)}`, { ...options, method: 'DELETE' });
}

/** GET /api/teacher/students (teacher) → { students } assigned to me. */
export function getTeacherStudents(options?: RequestOptions): Promise<TeacherStudentsResponse> {
  return apiRequest<TeacherStudentsResponse>('/api/teacher/students', options);
}

/** GET /api/teacher/students/:id/plans (teacher) → { student, plans, activity, summary }. */
export function getTeacherStudentPlans(
  studentId: string,
  options?: RequestOptions,
): Promise<TeacherStudentPlansResponse> {
  return apiRequest<TeacherStudentPlansResponse>(`/api/teacher/students/${seg(studentId)}/plans`, options);
}

/** GET /api/admin/statistics (admin). */
export function getAdminStatistics(options?: RequestOptions): Promise<AdminStatistics> {
  return apiRequest<AdminStatistics>('/api/admin/statistics', options);
}

/** GET /api/admin/users[?role=] (admin) → { users } (students include teacherName). */
export function listUsers(role?: Role, options?: RequestOptions): Promise<UsersListResponse> {
  return apiRequest<UsersListResponse>('/api/admin/users', { ...options, query: { role } });
}

/** POST /api/admin/users (admin) → 201 { user }. 400 field errors, 409 duplicate username. */
export function createUser(body: CreateUserBody, options?: RequestOptions): Promise<UserResponse> {
  return apiRequest<UserResponse>('/api/admin/users', { ...options, method: 'POST', body });
}

/** PATCH /api/admin/users/:id (admin) → { user }. */
export function updateUser(id: string, body: UpdateUserBody, options?: RequestOptions): Promise<UserResponse> {
  return apiRequest<UserResponse>(`/api/admin/users/${seg(id)}`, { ...options, method: 'PATCH', body });
}

/** DELETE /api/admin/users/:id (admin) → { message: "Foydalanuvchi o'chirildi." } */
export function deleteUser(id: string, options?: RequestOptions): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/api/admin/users/${seg(id)}`, { ...options, method: 'DELETE' });
}

/** Namespaced access to every endpoint: `api.getPlan(id)`. */
export const api = {
  getHealth,
  login,
  getMe,
  previewPlan,
  createPlan,
  listPlans,
  getPlan,
  setTopicCompleted,
  deletePlan,
  getTeacherStudents,
  getTeacherStudentPlans,
  getAdminStatistics,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} as const;
