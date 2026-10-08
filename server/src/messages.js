// Serverning foydalanuvchiga ko'rinadigan barcha xabarlari (o'zbek tilida, lotin yozuvi).
// Reja validatsiyasi xabarlari shared/planner.js dagi MESSAGES dan olinadi.

export const MSG = Object.freeze({
  // Autentifikatsiya / ruxsat
  authRequired: "Avval tizimga kiring.",
  sessionExpired: "Sessiya muddati tugagan. Qaytadan kiring.",
  forbidden: "Bu amalni bajarish uchun ruxsatingiz yo'q.",
  invalidCredentials: "Login yoki parol noto'g'ri.",
  usernameRequired: "Foydalanuvchi nomini kiriting.",
  passwordRequired: "Parolni kiriting.",
  tooManyLogins: "Juda ko'p muvaffaqiyatsiz urinish. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring.",

  // Topilmadi / umumiy
  planNotFound: "Reja topilmadi.",
  userNotFound: "Foydalanuvchi topilmadi.",
  topicNotFound: "Mavzu topilmadi.",
  notFoundGeneric: "Ma'lumot topilmadi.",
  routeNotFound: "So'ralgan manzil topilmadi.",
  badJson: "So'rov formati noto'g'ri.",
  payloadTooLarge: "So'rov hajmi juda katta.",
  serverError: "Serverda xatolik yuz berdi. Keyinroq urinib ko'ring.",
  validationFailed: "Kiritilgan ma'lumotlarda xatolik bor.",
  invalidValue: "Qiymat noto'g'ri.",

  // Rejalar
  completedMustBeBoolean: "completed qiymati true yoki false bo'lishi kerak.",
  completedTopicIdsInvalid:
    "completedTopicIds faqat shu rejadagi mavzu identifikatorlaridan (t1–t6) iborat massiv bo'lishi kerak.",
  planDeleted: "Reja o'chirildi.",

  // Foydalanuvchilar (admin)
  usernameTaken: "Bu foydalanuvchi nomi band.",
  userDeleted: "Foydalanuvchi o'chirildi.",
  cannotDeleteSelf: "O'zingizni o'chira olmaysiz.",
  cannotChangeOwnRole: "O'z rolingizni o'zgartira olmaysiz.",
  fullNameRequired: "Ism-familiyani kiriting.",
  fullNameTooLong: "Ism-familiya 100 belgidan oshmasligi kerak.",
  usernameInvalid:
    "Foydalanuvchi nomi 3–30 belgidan iborat bo'lishi va faqat kichik lotin harflari, raqamlar, nuqta (.) hamda pastki chiziqdan (_) tashkil topishi kerak.",
  passwordTooShort: "Parol kamida 6 belgidan iborat bo'lishi kerak.",
  passwordTooLong: "Parol 128 belgidan oshmasligi kerak.",
  roleInvalid: "Rol noto'g'ri tanlangan (student, teacher yoki admin).",
  teacherNotFound: "Tanlangan o'qituvchi topilmadi.",
  teacherSelf: "Foydalanuvchini o'ziga o'qituvchi qilib biriktirib bo'lmaydi.",
  nothingToUpdate: "O'zgartirish uchun ma'lumot yuborilmadi.",
});
