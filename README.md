# Lazer Chizma — Vue 3 + Tailwind + Pinia + Supabase

Lazer bilan kesish/gravировка qilish uchun mm-aniqlikdagi chizmachilik ilovasi.

## Texnologiyalar

- Vue 3 (Composition API) + Vite
- Vue Router — sahifalar orasida yurish (Kirish / Loyihalar / Muharrir)
- Pinia — holatni boshqarish (auth, loyihalar ro'yxati, chizma holati)
- Tailwind CSS — interfeys
- Supabase — autentifikatsiya (email + parol, email tasdiqlash bilan) va loyihalarni bulutda saqlash

## O'rnatish

1. Kerakli paketlarni o'rnating:

   ```
   npm install
   ```

2. Supabase loyihasi yarating: https://supabase.com/dashboard
   - Loyiha ichida **SQL Editor**'ni oching va `supabase-schema.sql` faylidagi
     kodni ishga tushiring (jadval va xavfsizlik siyosatlarini yaratadi).
   - **Settings → API** bo'limidan Project URL va anon key'ni oling.

3. `.env.example` faylidan nusxa oling va o'z ma'lumotlaringizni kiriting:

   ```
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG....
   VITE_SUPABASE_REDIRECT_URL=https://lazer-vue.vercel.app
   ```

4. Supabase loyihangizda **Authentication → Providers → Email**'da
   **"Confirm email"** yoqilganiga ishonch hosil qiling — shunda foydalanuvchi
   ro'yxatdan o'tgach, tizimga kirishdan oldin emailini tasdiqlashi shart bo'ladi.

   **Authentication → URL Configuration**'da:
   - Site URL: saytingiz manzili (masalan `https://lazer-vue.vercel.app`)
   - Redirect URLs ro'yxatiga saytingiz manzilini qo'shing (parolni tiklash
     havolasi shu manzilga qaytaradi).

5. Ishga tushiring:
   ```
   npm run dev
   ```

## Ishlatish

- **Ro'yxatdan o'tish**: email va parol kiriting. Tasdiqlash havolasi
  emailingizga yuboriladi — havolani bosmaguningizcha tizimga kira olmaysiz.
- **Kirish**: email va parol bilan kiring. Parolni unutgan bo'lsangiz
  "Parolni unutdingizmi?" havolasi orqali tiklashingiz mumkin.
- **Loyihalar**: yangi chizma yarating yoki oldingisini oching.
- **Muharrir**:
  - Chap panel: chizish asboblari (chiziq, to'rtburchak, aylana, ko'p burchak),
    o'chirish, nusxalash, barchasini ko'rsatish.
  - Yuqori panel: ortga/oldinga qaytarish (Undo/Redo), qatlam tanlash
    (Kesish/Gravировка/Belgilash), setka, ilashish qadami, o'lchamlar va
    masofa chiziqlarini yoqish/o'chirish, SVG/DXF eksport.
  - O'ng panel: tanlangan shaklning aniq mm o'lchamlarini tahrirlash,
    barcha shakllar ro'yxati.
  - **Shakllarni ko'chirish/o'zgartirish**: "Belgilash" asbobida shaklni
    bosib torting — u boshqa shakllarga yaqinlashganda ilashadi va orasidagi
    masofa mm da ko'rsatiladi. Burchaklardagi doira nuqtalarni tortib
    o'lchamini o'zgartirishingiz mumkin.
  - **Klaviatura**: `Ctrl+Z` / `Ctrl+Shift+Z` — undo/redo, `Ctrl+D` — nusxalash,
    `Ctrl+C`/`Ctrl+V` — copy/paste, strelka tugmalari — siljitish (Shift bilan
    kattaroq qadam), `Delete` — o'chirish.
  - **Saqlash** tugmasi loyihani Supabase'ga yozadi.

## Eksport formatlari

- **SVG** — haqiqiy mm o'lchamda (`viewBox` va `width/height` mm da),
  har bir shakl o'z qatlam rangida chiziladi.
- **DXF** (R12, ASCII) — LINE/CIRCLE/LWPOLYLINE obyektlari, CUT/ENGRAVE/MARK
  qatlamlari va ranglar bilan. Ko'pchilik lazer dasturlari (LightBurn va h.k.)
  bevosita ochadi.

## Loyihani joylashtirish (deploy)

```
npm run build
```

`dist/` papkasini istalgan statik hosting'ga (Vercel, Netlify, Cloudflare Pages)
joylashtiring va muhit o'zgaruvchilarini (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) hosting sozlamalarida kiriting.
