# Texnik topshiriq (asl matn)

## Qisqa talablar

1. Loyihaning asosiy maqsadi
O'quvchiga imtihon mavzularini kunlarga teng taqsimlash va vaqtni to'g'ri boshqarishga yordam beradigan, o'qituvchi esa buni kuzata oladigan dastur yoki interfeys prototipini ishlab chiqish.

2. Dasturda bo'lishi shart bo'lgan funksiyalar (Talablar)
* Ma'lumotlarni kiritish paneli (Input): Foydalanuvchi kunlar sonini, kunlik ajratiladigan vaqtni (daqiqada) va 6 ta mavzu nomini kirita olishi kerak.
* Xatoliklarni tekshirish: Agar kunlar soni `0` deb kiritilsa, tizim buni rad etishi (xatolik ko'rsatishi) shart.
* Taqsimlash algoritmi: Kiritilgan mavzularni kunlarga imkon qadar teng taqsimlashi kerak.
* Natijani ko'rsatish (Dashboard): Har bir kun uchun ajratilgan mavzular ro'yxati va o'sha kunlik umumiy vaqt ekranda aniq ko'rinishi kerak.
* Bajarilish nazorati: Mavzularni "bajarildi" deb belgilash (checkbox yoki tugma) imkoniyati bo'lishi, umumiy bajarilish foizi hisoblanishi va rejani saqlash (Save) funksiyasi ishlashi kerak.

3. Tekshirish uchun test holati
* Kiritiladi: 6 ta mavzu, 3 kun va kuniga 60 daqiqa.
* Kutilayotgan natija: Har kunga 2 tadan mavzu taqsimlanishi kerak.
* Foiz hisobi: Agar kiritilgan 6 ta mavzudan 3 tasi "bajarildi" deb belgilansa, ekranda natija 50 foiz bo'lib ko'rinishi shart.

## TEXNIK TOPSHIRIQ (TZ)

Loyiha: Smart Study Planner — Aqlli o'quv rejalashtirish tizimi
Loyiha turi: Full Stack Web Application
Foydalanuvchilar: O'quvchi, O'qituvchi, Administrator
Asosiy maqsad: Imtihonga tayyorgarlik mavzularini kunlarga teng taqsimlash, ajratilgan vaqtni boshqarish, o'quvchi faoliyatini kuzatish va natijalarni saqlash.

### 1. Texnologik talablar
| Qism | Texnologiya |
|---|---|
| Frontend | React.js + TypeScript |
| Dizayn | Tailwind CSS |
| Backend | Node.js + Express.js |
| Ma'lumotlar bazasi | MongoDB Atlas + Mongoose |
| Autentifikatsiya | JWT + bcrypt |
| Grafiklar | Recharts |
| API | REST API |
| Hosting | Render yoki boshqa Node.js hosting |
| Versiya nazorati | Git + GitHub |

Barcha interfeyslar o'zbek tilida (lotin yozuvida) bo'lishi, kompyuter, planshet va telefonda to'g'ri ishlashi kerak.

### 2. Foydalanuvchi rollari
- O'quvchi (Student): Mavzularni kiritadi, reja yaratadi, kunlik vazifalarni ko'radi, bajarilganini belgilaydi, saqlangan rejalarini boshqaradi va statistikasini kuzatadi.
- O'qituvchi (Teacher): O'ziga biriktirilgan o'quvchilarning rejalari, bajarilgan mavzulari, umumiy foizi va kundalik faolligini ko'radi.
- Administrator (Admin): O'quvchi va o'qituvchi hisoblarini yaratadi, rollarni boshqaradi va tizimdagi umumiy statistikani nazorat qiladi.

### 3. Asosiy funksional talablar
#### 3.1. Reja yaratish sahifasi
| Maydon | Talab |
|---|---|
| Reja nomi | Majburiy matn |
| Imtihon yoki fan nomi | Majburiy matn |
| Kunlar soni | 1 yoki undan katta butun son |
| Kunlik vaqt | 1 yoki undan katta butun daqiqa |
| Mavzular | Aynan 6 ta, barchasi to'ldirilgan |
| Boshlanish sanasi | Sana tanlash |
| Reja yaratish | Algoritmni ishga tushirish |

Validatsiya:
- Kunlar soni 0 yoki manfiy bo'lsa: "Kunlar soni kamida 1 bo'lishi kerak."
- Kunlik vaqt 0 yoki manfiy bo'lsa: "Kunlik vaqtni to'g'ri kiriting."
- Mavzu bo'sh qoldirilsa: "Barcha 6 ta mavzuni kiriting."
- Harflar yoki kasr son kiritilgan sonli maydonlarda xatolik ko'rsatiladi.
- Xatolik mavjud bo'lsa, reja yaratishga ruxsat berilmaydi.

#### 3.2. Mavzularni taqsimlash algoritmi
Tizim 6 ta mavzuni berilgan kunlarga imkon qadar teng taqsimlashi shart.
```
N = 6 (mavzular soni)
D = kunlar soni
T = kunlik ajratilgan vaqt
base = floor(N / D)
remainder = N % D
Har bir kunga base ta mavzu beriladi.
Birinchi remainder ta kunga bittadan qo'shimcha mavzu beriladi.
```
Vaqt taqsimoti: Har bir kundagi mavzular o'sha kun uchun ajratilgan vaqtni teng bo'lib oladi. Butun daqiqalar talab qilinadi: ortib qolgan daqiqalar birinchi mavzularga bittadan qo'shiladi.
Masalan, 3 kun va 60 daqiqa: 1-kun Mavzu 1, Mavzu 2 (30 + 30); 2-kun Mavzu 3, Mavzu 4 (30 + 30); 3-kun Mavzu 5, Mavzu 6 (30 + 30).
Qo'shimcha qoidalar:
- Agar 6 ta mavzu 4 kunga taqsimlansa: 2, 2, 1, 1.
- Agar 6 ta mavzu 2 kunga taqsimlansa: 3, 3.
- Agar kunlar soni 6 tadan katta bo'lsa, ortiqcha kunlar "Takrorlash / dam olish" deb ko'rsatiladi, bajarilish foiziga ta'sir qilmaydi.
- Agar kunlik vaqt mavzular sonidan kam bo'lsa, tizim kamida 1 daqiqadan ajratish imkonsizligini bildiradi va foydalanuvchidan vaqtni oshirishni so'raydi.
- Algoritm hech bir mavzuni yo'qotmasligi yoki takroran taqsimlamasligi kerak.

### 4. Dashboard — boshqaruv paneli
- Reja nomi va imtihon fani.
- Boshlanish va tugash sanasi.
- Har bir kunning mavzulari va daqiqalari.
- Mavzuni "Bajarildi" deb belgilovchi checkbox.
- Jami mavzular va bajarilgan mavzular.
- Bajarilish foizi (progress bar).
- Rejani saqlash va keyin davom ettirish imkoniyati.

Namuna: "Smart Study Planner — Demo: 3 kunlik imtihon rejasi". Kartalar: Jami 6 mavzu / Bajarildi 0 mavzu / Natija 0% bajarilgan. Har kun kartasi: "1-kun, 60 daqiqa", "[ ] Mavzu 1 — 30 daq.", "[ ] Mavzu 2 — 30 daq." va hokazo. "Checkboxlarni bosib foiz hisobini tekshiring." va "Tiklash" tugmasi.

### 5. Bajarilish nazorati
- Checkbox bosilganda mavzuning holati pending dan completed ga o'zgaradi.
- Qayta bosilganda mavzu bajarilmagan holatga qaytadi.
- Har bir mavzu uchun bajarilgan vaqt (completedAt) qayd etiladi.
- O'zgartirilgan holat backend orqali saqlanadi.
- Sahifa yangilanganda ham bajarilish holati o'zgarmasligi kerak.
- O'qituvchi o'quvchi natijalarini faqat ko'rish huquqiga ega bo'ladi.
Foiz: Progress = Bajarilgan mavzular / Jami mavzular × 100. 6 tadan 3 tasi → 50%.

### 6. Ma'lumotlar bazasi tuzilmasi
Users: `{ fullName, username, passwordHash, role, teacherId }`.
StudyPlans: `{ userId, title, subject, daysCount, dailyMinutes, startDate, totalTopics, days: [ { dayNumber, date, topics: [ { topicId, title, minutes, completed, completedAt } ] } ], createdAt }`.

### 7. Backend REST API
| Metod | Endpoint | Vazifasi |
|---|---|---|
| POST | /api/auth/login | Tizimga kirish |
| GET | /api/auth/me | Joriy foydalanuvchi |
| POST | /api/plans/preview | Taqsimotni hisoblash |
| POST | /api/plans | Rejani saqlash |
| GET | /api/plans | O'z rejalarini olish |
| GET | /api/plans/:id | Reja tafsilotlari |
| PATCH | /api/plans/:id/topics/:topicId | Mavzuning holatini yangilash |
| DELETE | /api/plans/:id | Rejani o'chirish |
| GET | /api/teacher/students | Biriktirilgan o'quvchilar |
| GET | /api/teacher/students/:id/plans | O'quvchi rejalari |
| GET | /api/admin/statistics | Umumiy statistika |

Backend barcha kiritilgan qiymatlarni mustaqil validatsiya qilishi shart. API vakolatlarni ham tekshiradi: o'quvchi boshqa o'quvchining rejalarini o'qiy yoki o'zgartira olmaydi, o'qituvchi esa faqat o'ziga biriktirilgan o'quvchilarni ko'radi.

### 8. Dizayn va foydalanuvchi interfeysi
Asosiy sahifalar: Login; Student Dashboard; Yangi reja yaratish; Reja tafsilotlari; Mening rejalarim; Teacher Dashboard; Admin Panel.
Qo'shimcha: Light va Dark Mode; progress bar va foiz; telefonlarda qulay responsive dizayn; saqlash jarayonida loading indikatori; muvaffaqiyatli saqlanganda bildirishnoma; internet yoki server xatosida tushunarli xabar; formadagi xatolar tegishli maydonning tagida.

### 9. Hakamlar uchun majburiy testlar
| # | Kiritiladigan qiymat | Kutiladigan natija |
|---|---|---|
| 1 | 6 mavzu, 3 kun, 60 daqiqa | 2+2+2 mavzu |
| 2 | 6 mavzu, 2 kun, 60 daqiqa | 3+3 mavzu |
| 3 | 6 mavzu, 4 kun, 60 daqiqa | 2+2+1+1 mavzu |
| 4 | 6 mavzu, 0 kun | Xatolik ko'rsatadi |
| 5 | 6 mavzu, 3 kun, 0 daqiqa | Xatolik ko'rsatadi |
| 6 | 6 mavzudan 3 tasi bajarildi | 50% |
| 7 | 6 mavzudan 6 tasi bajarildi | 100% |
| 8 | 6 mavzudan 0 tasi bajarildi | 0% |
| 9 | Rejani saqlash va qayta ochish | Ma'lumotlar saqlanadi |
| 10 | 6 mavzu, 8 kun | 6 kun mavzu, 2 kun takrorlash |
| 11 | 6 mavzu, 3 kun, 61 daqiqa | Kuniga 31+30 daqiqa |
| 12 | 6 mavzu, 3 kun, 1 daqiqa | Vaqt yetarli emas xatoligi |

### 10. Xavfsizlik va sifat talablari
- Parollar bazada oddiy matn ko'rinishida saqlanmasligi kerak.
- API endpointlariga kirish JWT va rollar bo'yicha tekshirilishi kerak.
- Foydalanuvchi kiritgan matnlar sanitizatsiya va validatsiyadan o'tkaziladi.
- MongoDB uchun indekslar va bog'lanishlar to'g'ri belgilanadi.
- Frontend va backend muhit o'zgaruvchilari .env orqali boshqariladi.
- Maxfiy API kalitlari GitHub repositoriyasiga joylanmaydi.
- Bajarilish foizi frontend va backendda bir xil hisoblanishi kerak.
- Asosiy algoritm uchun avtomatik testlar yoziladi.

### 11. Yakuniy topshiriladigan natijalar
Ishlaydigan frontend va backend; MongoDB Atlas integratsiyasi; uch rol uchun login; teng taqsimlash algoritmi; real vaqtga yaqin yangilanadigan statistika; saqlash, qayta ochish va o'chirish; GitHub repositoriyasi va README.md; deploy qilingan HTTPS sayt; hakamlar uchun namunaviy hisoblar; 12 ta majburiy testdan o'tish.

### 12. Qabul qilish ssenariysi
1. O'quvchi tizimga kiradi va 6 ta mavzu kiritadi.
2. Kunlar sonini 3, kunlik vaqtni 60 daqiqa qilib belgilaydi.
3. "Reja yaratish" tugmasini bosadi.
4. Tizim har bir kunga 2 tadan mavzu va 60 daqiqalik jadval tuzadi.
5. O'quvchi istalgan 3 ta mavzuni "Bajarildi" deb belgilaydi.
6. Dashboardda 50% natija chiqadi.
7. Reja saqlanadi va sahifa yangilanganda ma'lumotlar saqlanib qoladi.
8. O'qituvchi o'z kabinetidan shu o'quvchining 50% natijasini ko'ra oladi.

Muhim: 6 ta mavzu, teng taqsimlash, 0 kun xatoligi, bajarilish foizi va Save funksiyasi — eng ustuvor talablar.
