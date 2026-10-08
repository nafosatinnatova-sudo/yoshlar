// Pure helpers for the admin "user" form: client-side validation (mirrors server/src/routes/admin.js
// rule-for-rule, with the exact same Uzbek messages), request-body builders and server-error mapping.
import { sanitizeText } from '@shared/planner';
import { ApiError } from '@/api/client';
import { ROLES, type AdminUser, type CreateUserBody, type Role, type UpdateUserBody } from '@/api/types';
import { getErrorMessage } from '@/utils/errors';

export const USER_LIMITS = Object.freeze({
  fullNameMax: 100,
  usernameMin: 3,
  usernameMax: 30,
  passwordMin: 6,
  passwordMax: 128,
});

/** Same pattern as the User model (applied to the lower-cased, trimmed value). */
export const USERNAME_RE = /^[a-z0-9_.]+$/;

/** Messages identical to server/src/messages.js so client and server errors read the same. */
export const USER_MESSAGES = Object.freeze({
  fullNameRequired: 'Ism-familiyani kiriting.',
  fullNameTooLong: `Ism-familiya ${USER_LIMITS.fullNameMax} belgidan oshmasligi kerak.`,
  usernameRequired: 'Foydalanuvchi nomini kiriting.',
  usernameInvalid:
    "Foydalanuvchi nomi 3–30 belgidan iborat bo'lishi va faqat kichik lotin harflari, raqamlar, nuqta (.) hamda pastki chiziqdan (_) tashkil topishi kerak.",
  usernameTaken: 'Bu foydalanuvchi nomi band.',
  passwordRequired: 'Parolni kiriting.',
  passwordTooShort: `Parol kamida ${USER_LIMITS.passwordMin} belgidan iborat bo'lishi kerak.`,
  passwordTooLong: `Parol ${USER_LIMITS.passwordMax} belgidan oshmasligi kerak.`,
  roleInvalid: "Rol noto'g'ri tanlangan (student, teacher yoki admin).",
  teacherNotFound: "Tanlangan o'qituvchi topilmadi.",
  cannotChangeOwnRole: "O'z rolingizni o'zgartira olmaysiz.",
});

/** Form fields in visual (and focus) order. */
export const USER_FIELDS = ['fullName', 'username', 'password', 'role', 'teacherId'] as const;
export type UserField = (typeof USER_FIELDS)[number];

export interface UserFormValues {
  fullName: string;
  username: string;
  /** Create: required. Edit: '' keeps the current password. */
  password: string;
  role: Role;
  /** '' = not assigned. Only meaningful when role === 'student'. */
  teacherId: string;
}

export type UserFormErrors = Partial<Record<UserField, string>>;

export type UserFormMode = 'create' | 'edit';

export interface ValidateUserFormOptions {
  mode: UserFormMode;
  /** Ids of the teachers that can be selected. */
  teacherIds: ReadonlySet<string>;
  /** Edit mode: the user being edited (role changes are compared against it). */
  original?: Pick<AdminUser, 'role'> | null;
  /** Editing your own account (role must not change). */
  isSelf?: boolean;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** The server trims + lower-cases usernames; do the same so "Ali" is accepted as "ali". */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Initial form values for creating (optionally with a preselected role) or editing a user. */
export function initialUserFormValues(
  user: AdminUser | null,
  options: { defaultRole?: Role; teacherIds?: ReadonlySet<string> } = {},
): UserFormValues {
  if (!user) {
    return { fullName: '', username: '', password: '', role: options.defaultRole ?? 'student', teacherId: '' };
  }
  // A teacher id that is no longer selectable is treated as "not assigned".
  const teacherId = user.role === 'student' && user.teacherId && (!options.teacherIds || options.teacherIds.has(user.teacherId))
    ? user.teacherId
    : '';
  return { fullName: user.fullName, username: user.username, password: '', role: user.role, teacherId };
}

function validatePassword(password: string): string | undefined {
  if (password.trim() === '') return USER_MESSAGES.passwordRequired;
  if (password.length < USER_LIMITS.passwordMin) return USER_MESSAGES.passwordTooShort;
  if (password.length > USER_LIMITS.passwordMax) return USER_MESSAGES.passwordTooLong;
  return undefined;
}

/** Validates the form exactly like the API does. Returns only the fields that have errors. */
export function validateUserForm(values: UserFormValues, options: ValidateUserFormOptions): UserFormErrors {
  const { mode, teacherIds, original, isSelf = false } = options;
  const errors: UserFormErrors = {};

  const fullName = sanitizeText(values.fullName);
  if (!fullName) errors.fullName = USER_MESSAGES.fullNameRequired;
  else if (fullName.length > USER_LIMITS.fullNameMax) errors.fullName = USER_MESSAGES.fullNameTooLong;

  if (mode === 'create') {
    const username = normalizeUsername(values.username);
    if (!username) errors.username = USER_MESSAGES.usernameRequired;
    else if (
      username.length < USER_LIMITS.usernameMin ||
      username.length > USER_LIMITS.usernameMax ||
      !USERNAME_RE.test(username)
    ) {
      errors.username = USER_MESSAGES.usernameInvalid;
    }
  }

  // Password: required when creating; optional when editing ('' = keep the current one).
  if (mode === 'create' || values.password !== '') {
    const passwordError = validatePassword(values.password);
    if (passwordError) errors.password = passwordError;
  }

  if (!isRole(values.role)) errors.role = USER_MESSAGES.roleInvalid;
  else if (mode === 'edit' && isSelf && original && values.role !== original.role) {
    errors.role = USER_MESSAGES.cannotChangeOwnRole;
  }

  if (values.role === 'student' && values.teacherId !== '' && !teacherIds.has(values.teacherId)) {
    errors.teacherId = USER_MESSAGES.teacherNotFound;
  }

  return errors;
}

/** First field with an error, in form order (to move focus there). */
export function firstErrorField(errors: UserFormErrors): UserField | null {
  return USER_FIELDS.find((field) => Boolean(errors[field])) ?? null;
}

/** POST /api/admin/users body. teacherId is sent only for students (null = not assigned). */
export function buildCreateBody(values: UserFormValues): CreateUserBody {
  return {
    fullName: sanitizeText(values.fullName),
    username: normalizeUsername(values.username),
    password: values.password,
    role: values.role,
    teacherId: values.role === 'student' ? values.teacherId || null : null,
  };
}

/**
 * PATCH /api/admin/users/:id body containing ONLY the fields that changed
 * (an empty object means "nothing to save").
 */
export function buildUpdateBody(
  values: UserFormValues,
  original: Pick<AdminUser, 'fullName' | 'role' | 'teacherId'>,
  options: { isSelf?: boolean } = {},
): UpdateUserBody {
  const body: UpdateUserBody = {};

  const fullName = sanitizeText(values.fullName);
  if (fullName !== original.fullName) body.fullName = fullName;

  const roleChanged = values.role !== original.role && !options.isSelf;
  if (roleChanged) body.role = values.role;
  const nextRole = roleChanged ? values.role : original.role;

  // For non-students the server always clears teacherId itself.
  if (nextRole === 'student') {
    const nextTeacherId = values.teacherId || null;
    const previousTeacherId = original.role === 'student' ? original.teacherId : null;
    if (roleChanged || nextTeacherId !== previousTeacherId) body.teacherId = nextTeacherId;
  }

  if (values.password !== '') body.password = values.password;
  return body;
}

export interface MappedServerError {
  /** Errors to show under the matching fields. */
  fieldErrors: UserFormErrors;
  /** Form-level message (shown in an Alert) when the error is not tied to a field. */
  formError: string | null;
}

/**
 * Maps a failed create/update request to field errors:
 * 400 → `errors` per field, 409 → under "Login" ("Bu foydalanuvchi nomi band."), anything else → form-level message.
 */
export function mapUserServerError(error: unknown): MappedServerError {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return {
        fieldErrors: { username: error.errors?.username || error.message || USER_MESSAGES.usernameTaken },
        formError: null,
      };
    }
    if (error.status === 400 && error.errors) {
      const fieldErrors: UserFormErrors = {};
      for (const field of USER_FIELDS) {
        const message = error.errors[field];
        if (message) fieldErrors[field] = message;
      }
      if (Object.keys(fieldErrors).length > 0) return { fieldErrors, formError: null };
    }
  }
  return { fieldErrors: {}, formError: getErrorMessage(error) };
}
