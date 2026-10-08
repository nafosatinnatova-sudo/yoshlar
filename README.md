# Smart Study Planner — Aqlli o'quv rejalashtirish tizimi

**Bilet 002 — Imtihonga tayyorgarlik rejalashtirgichi**

Imtihonga tayyorgarlik mavzularini kunlarga teng taqsimlaydigan, ajratilgan vaqtni
boshqaradigan va o'quvchi faoliyatini o'qituvchiga kuzatish imkonini beradigan xizmat.

- **Mijoz:** imtihonga tayyorlanayotgan o'quvchi va uning o'qituvchisi.
- **Daromad g'oyasi:** o'qituvchi uchun bir nechta o'quvchi rejasini kuzatish obunasi.

---

## Tez boshlash — demo (hech narsa o'rnatmasdan)

[`demo/index.html`](demo/index.html) faylini brauzerda oching. Bu bitta fayldan iborat,
internetsiz ishlaydigan to'liq ishlaydigan prototip: reja yaratish, teng taqsimlash,
checkbox bilan belgilash, foiz hisobi, saqlash va o'qituvchi kabineti.

Sahifaning o'zida avtomatik tekshiruv bo'limi bor:

- **Hakamlar uchun majburiy testlar** (12 ta test)

U sahifa ochilishi bilan ishga tushadi va natijani ko'rsatadi.

---

## Loyiha tuzilmasi

```
shared/planner.js   Taqsimlash, validatsiya va foiz algoritmi (yagona manba)
demo/index.html     Bitta faylli demo (statik, bazasiz)
server/             Node.js + Express + MongoDB (Mongoose) REST API
client/             React + TypeScript + Tailwind CSS + Recharts
docs/               Texnik topshiriq va ishlab chiqish shartnomasi
```

Algoritm **faqat bitta joyda** yozilgan — `shared/planner.js`. Frontend ham,
backend ham aynan shu modulni import qiladi, shuning uchun bajarilish foizi
ikkala tomonda bir xil hisoblanadi.

---

## Taqsimlash algoritmi

```
N = mavzular soni (6)
D = kunlar soni
T = kunlik ajratilgan vaqt (daqiqa)

base      = floor(N / D)
remainder = N % D
```

Har bir kunga `base` ta mavzu beriladi, birinchi `remainder` ta kunga bittadan
qo'shimcha mavzu qo'shiladi. Kun ichidagi vaqt mavzular orasida teng bo'linadi;
ortib qolgan daqiqalar birinchi mavzularga bittadan qo'shiladi.

| Kiritiladi | Natija |
|---|---|
| 6 mavzu, 3 kun, 60 daqiqa | `2 + 2 + 2` mavzu, har biri 30 daqiqa |
| 6 mavzu, 2 kun, 60 daqiqa | `3 + 3` mavzu, har biri 20 daqiqa |
| 6 mavzu, 4 kun, 60 daqiqa | `2 + 2 + 1 + 1` mavzu |
| 6 mavzu, 8 kun, 60 daqiqa | 6 kun mavzu + 2 kun «Takrorlash / dam olish» |
| 6 mavzu, 3 kun, 61 daqiqa | `31 + 30` daqiqa har kunda |

Bajarilish foizi: `Progress = (bajarilgan mavzular / jami mavzular) × 100`.
Takrorlash kunlari foizga ta'sir qilmaydi.

---

## Validatsiya

| Holat | Xabar |
|---|---|
| Kunlar soni 0 yoki manfiy | «Kunlar soni kamida 1 bo'lishi kerak.» |
| Kunlik vaqt 0 yoki manfiy | «Kunlik vaqtni to'g'ri kiriting.» |
| Mavzu bo'sh qoldirilgan | «Barcha 6 ta mavzuni kiriting.» |
| Harf yoki kasr son kiritilgan | «... butun son bo'lishi kerak ...» |
| Kunlik vaqt mavzular sonidan kam | «Vaqt yetarli emas ... vaqtni oshiring.» |

Xatolik mavjud bo'lsa, reja yaratilmaydi. Validatsiya frontendda ham,
backendda ham bir xil kod bilan mustaqil bajariladi.

---

## To'liq ilovani lokalda ishga tushirish

Talablar: Node.js 20+, MongoDB (lokal yoki Atlas).

```bash
# Backend
cd server
npm install
cp .env.example .env     # MONGODB_URI va JWT_SECRET ni to'ldiring
npm run dev              # http://localhost:5000

# Frontend (boshqa terminalda)
cd client
npm install
npm run dev              # http://localhost:5173
```

MongoDB o'rnatilmagan bo'lsa, xotiradagi baza bilan ishga tushiring:

```bash
cd server
npm run dev:memory
```

### Namunaviy hisoblar

| Rol | Login | Parol |
|---|---|---|
| Administrator | `admin` | `admin123` |
| O'qituvchi | `teacher` | `teacher123` |
| O'quvchi | `student` | `student123` |
| O'quvchi | `student2` | `student123` |

---

## Testlar

```bash
cd server && npm test     # algoritm + API testlari
cd client && npm test     # interfeys testlari
```

Majburiy 12 ta test holati `server/tests/planner.test.js` faylida
«Test 1 … Test 12» nomlari bilan alohida yozilgan.

---

## Muhit o'zgaruvchilari

`server/.env` (namuna uchun `server/.env.example` ga qarang):

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart-study-planner
JWT_SECRET=uzun_tasodifiy_satr
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
SEED_DEMO=true
```

Maxfiy kalitlar `.gitignore` orqali repozitoriyadan chiqarib tashlangan.

---

## Deploy (Render)

Ildizdagi `package.json` butun monorepo'ni bitta Node xizmati sifatida yig'adi:

| Skript | Vazifasi |
|---|---|
| `npm run build` | `server` bog'liqliklari (dev'siz) + `client` bog'liqliklari va `client/dist` |
| `npm start` | `server/src/index.js` — API va qurilgan frontend bitta portda |
| `npm run install:all` | lokal ishlash uchun ikkala papka bog'liqliklari (dev bilan) |

`render.yaml` Blueprint ikkita xizmatni tavsiflaydi:

1. **smart-study-planner-demo** — statik demo sahifa, baza talab qilmaydi.
2. **smart-study-planner** — to'liq ilova (Express API + React frontend bitta
   xizmatda). Build: `npm run build`, start: `npm start`, health check:
   `/api/health`.

Render panelida faqat bitta maxfiy qiymat kiritiladi — `MONGODB_URI`
(MongoDB Atlas ulanish satri). `JWT_SECRET` avtomatik generatsiya qilinadi,
`NODE_VERSION=22` va `NODE_ENV=production` Blueprint'da belgilangan.

> Xizmat Render panelida qo'lda yaratilgan bo'lsa, standart `yarn` / `yarn start`
> buyruqlari yetarli emas: **Build Command** ni `npm run build`, **Start Command**
> ni `npm start` qilib o'zgartiring (yoki Blueprint sifatida qayta ulang).

Frontend `VITE_API_URL` bo'sh bo'lganda so'rovlarni o'z manzilidan (`/api/...`)
yuboradi, shuning uchun bitta xizmat uchun qo'shimcha sozlash kerak emas.

---

## Xavfsizlik

- Parollar `bcrypt` bilan heshlanadi, bazada ochiq matnda saqlanmaydi.
- API endpointlari JWT va rollar bo'yicha tekshiriladi: o'quvchi boshqa
  o'quvchining rejasini ko'ra olmaydi, o'qituvchi faqat o'ziga biriktirilgan
  o'quvchilarni ko'radi va ularni o'zgartira olmaydi.
- Kiritilgan matnlar sanitizatsiyadan o'tkaziladi, NoSQL injection bloklanadi.
- `helmet`, CORS cheklovi va login uchun urinishlar soni chegarasi yoqilgan.
