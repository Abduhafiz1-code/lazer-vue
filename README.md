# Lazer Chizma — Vue 3 + Tailwind + Pinia + Supabase

Lazer bilan kesish/gravировка qilish uchun mm-aniqlikdagi chizmachilik ilovasi.

## Texnologiyalar

- Vue 3 (Composition API) + Vite
- Vue Router — sahifalar orasida yurish (Kirish / Loyihalar / Muharrir)
- Pinia — holatni boshqarish (auth, loyihalar ro'yxati, chizma holati)
- Tailwind CSS — interfeys
- Supabase — autentifikatsiya (magic link) va loyihalarni bulutda saqlash

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
   "Confirm email" / magic link yoqilganiga ishonch hosil qiling
   (standart holatda yoqilgan bo'ladi).

5. Ishga tushiring:
   ```
   npm run dev
   ```

## Ishlatish

- **Kirish**: email kiriting, sizga kirish havolasi (magic link) yuboriladi.
- **Loyihalar**: yangi chizma yarating yoki oldingisini oching.
- **Muharrir**:
  - Chap panel: chizish asboblari (chiziq, to'rtburchak, aylana, ko'p burchak),
    o'chirish, barchasini ko'rsatish.
  - Yuqori panel: qatlam tanlash (Kesish/Gravировка/Belgilash), setka,
    ilashish qadami, o'lchamlarni ko'rsatish/yashirish, SVG/DXF eksport.
  - O'ng panel: tanlangan shaklning aniq mm o'lchamlarini tahrirlash,
    barcha shakllar ro'yxati.
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
