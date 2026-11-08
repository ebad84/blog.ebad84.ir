# ebad84 / log (static)

بلاگ استاتیک خام: فقط HTML و CSS و JS. بک‌اند نداره، API گیت‌هاب نداره، و هر چیزی که نشون می‌ده رو از همین سایت می‌خونه (از آدرسی که بازش کردی).

## اجرا

بدون ساختن چیزی؛ پوشه رو هر جا که فایل استاتیک سرو می‌کنه بذار (nginx، GitHub Pages، Cloudflare Pages، ...). برای تست محلی:

    python -m http.server 8000     # بعد: http://localhost:8000

(با دابل‌کلیک روی فایل کار نمی‌کنه چون مرورگر `fetch` رو روی `file://` بلاک می‌کنه.)

## آدرس‌ها

    /                  لیست پست‌ها
    /#my-post          پست  → posts/my-post.md  (یا posts/my-post/index.md)
    /#tag/esp32        لیست فیلتر‌شده با تگ
    /editor.html       صفحه‌ی نوشتن

آدرس پست‌ها با `#` هست تا روی هر هاستی بدون تنظیم سرور کار کنه.

## اضافه کردن پست

1. توی `/editor.html` بنویس، بعد **Download .md** یا **Copy** بزن.
2. فایل رو بذار توی `posts/` با همون اسمی که صفحه نشون می‌ده (`posts/my-post.md`).
3. اسمش رو به لیست `posts/posts.json` اضافه کن:

        ["hello-world.md", "my-post.md", "esp32-i2s/index.md"]

   لیست لازمه چون سایت استاتیک نمی‌تونه محتوای پوشه رو لیست کنه. اگه فایل رو داخل لیست نذاری، لینک مستقیمش (`/#my-post`) باز هم کار می‌کنه، فقط توی صفحه‌ی اصلی نمی‌آد.

پستی که فایل یا عکس داره: `posts/my-post/index.md` بساز و فایل‌ها رو کنارش بذار (`posts/my-post/files/x.zip`)، بعد توی متن با آدرس نسبی لینک کن: `[دانلود](files/x.zip)` یا `![](img/a.png)`. توی لیست می‌نویسی `"my-post/index.md"`.

## فرانت‌متر (بالای هر `.md`)

    ---
    title: عنوان پست
    date: 2026-11-08        # برای مرتب‌سازی
    tags: [esp32, audio]
    dir: auto               # auto | rtl | ltr
    draft: true             # از لیست مخفی می‌شه
    description: توضیح کوتاه
    ---

`dir: auto` یعنی هر پاراگراف و تیتر و لیست جهت خودش رو از زبان متنش می‌گیره. کد همیشه چپ‌به‌راست می‌مونه. صفحه‌ی نوشتن همه‌ی این‌ها رو خودش می‌سازه.

## تنظیمات

اسم سایت و فوتر: `config.js`. تم: `style.css` (متغیرهای بالای فایل).

## فایل‌ها

    index.html  app.js      صفحه‌ی بلاگ و روتر
    editor.html editor.js   صفحه‌ی نوشتن
    render.js               تبدیل md به HTML (مشترک)
    ui.js                   تم دارک/لایت و دکمه‌ی Copy
    style.css  config.js  posts/  vendor/  fonts/

`vendor/` شامل marked و DOMPurify و `fonts/` شامل JetBrains Mono و Vazirmatn هست؛ هیچ چیزی از اینترنت لود نمی‌شه.
