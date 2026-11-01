# ASTRO APP

من صنع **ABU 3RB** (ابو عرب) و**ABU SHADAD** (ابو شداد).

> English: [README.md](README.md) · الرخصة: MIT ([LICENSE](LICENSE)) · البرنامج مستقل وغير تابع لـ Cronus أو CollectiveMinds.

برنامج سطح مكتب لإدارة جهاز Cronus Zen ومحرر لسكربتات GPC.
مبني بـ **Rust** (Tauri 2) مع مكتبة **hidapi** المكتوبة بـ C للاتصال عبر USB، وواجهة داكنة (أسود ورصاصي).

## التشغيل
```
src-tauri\target\release\astro-app.exe
```
أو ابنِه من جديد:
```
cd src-tauri
cargo build --release
```
يحتاج Rust (MSVC) و WebView2 (موجود افتراضياً في Windows 11).

## الأقسام

### BOOT
| الزر | الوظيفة |
|---|---|
| **CONNECT** | يتصل بالقطعة (منفذ PROG)، ويقرأ الفيرموير والسيريال والـ 8 سلوتات |
| **REFRESH** | يعيد قراءة السلوتات |
| **RESTART** | فورمات: يمسح كل السلوتات الثمانية (بعد التأكيد) |

كل سلوت يعرض: الاسم، والنوع (Script / Game Pack / Marketplace)، والحجم، والصيغة، وCRC32، وهل هو مفعّل.
فوق السلوتات: عدد السكربتات الموجودة من 8، والمساحة المستخدمة من 256KB.
على اليمين: مكتبة سكربتاتك المحفوظة. دبل كليك على أي سكربت يفتحه في الـ Compiler.

### COMPILER
محرر GPC فيه ترقيم أسطر وتلوين للكود وتبويبات متعددة.
- **File**: New، Open، Save، Save As، Export as GPC، Close Tab (مع اختصارات Ctrl+N / O / S / Shift+S / W)
- **Tools** (`ui/js/gpc-tools.js`): كل أداة تفتح النتيجة في تبويب جديد ولا تعدّل الأصل.
  - **Encoder…** (من q77): أرقام → HEX (الموجبة فقط)، وتمويه أسماء المتغيرات بأسماء عشوائية `abushadad__xxxxxxxx`، ووضع السطر الواحد مع الترويسة.
  - **Decoder…** (من q77): HEX → أرقام عادية، وترتيب الكود وإعادة المسافات والأسطر.
  - **Strings → data() (Cipher)…** (من gpc_cipher.py): ينقل كل `const string` إلى قسم `data()` واحد ويستبدل كل اسم بدالة `get_str_N(i)` ترجع موقعه.
  - التحسينات على الأدوات الأصلية: لا تلمس النصوص بين علامات التنصيص ولا التعليقات، وتلتقط كل الأسماء في `int a, b, c;`، وتنبّه عن الحروف غير اللاتينية (مثل العربي) بدل حذفها بصمت، وعن وجود `data()` سابق.
  - إضافة أداة جديدة: `window.astro.registerTool({ label, run })`

السكربتات تُحفظ افتراضياً في `Documents\ASTRO APP\Scripts`.

### MAKE YOUR GPC
معالج من 6 خطوات يبني سكربت GPC كامل بدون كتابة كود (الكود في `ui/js/myg/`، والتصميم في `docs/MAKE_YOUR_GPC_DESIGN.md`):

| الخطوة | المحتوى |
|---|---|
| 1 START | اسم السكربت + شعار: Logo Studio (صورة، نص، رسم بالبكسل، 9 خوارزميات dithering، استيراد packed، تصدير بأربع صيغ) أو الاسم نفسه كشعار |
| 2 MENU | 7 أشكال قوائم + محاكي حيّ يشغّل كود GPC المولَّد نفسه (`gpc-vm.js`) |
| 3 MODS | 36 مود في 6 أقسام (Aim Assist، Anti Recoil، Shooting، Movement، Controller، Utility)، مع تعديل الاسم والقيم وأزرار CUSTOM |
| 4 CONTROLS | 1 إلى 3 بروفايلات، حتى 8 Quick toggles، وجدول لكل الأزرار مع كشف التعارض |
| 5 SCREEN | حركة الإقلاع، الشاشة الرئيسية، شاشة التوقف، ألوان LED |
| 6 BUILD | مراجعة وفحوصات، ثم حفظ في المكتبة أو فتح في COMPILER أو وضعه على سلوت في BOOT (والفلاش بعد ضغط START والتأكيد) |

الإعدادات تُحفظ في ذاكرة القطعة (SPVAR) عند إغلاق القائمة، مضغوطة بالبتات ومعها توقيع يتحقق منها.

الفحوصات (Node، تكومبايل بنفس libgpc حق البرنامج):
```
node tools/test-mods.mjs
node tools/test-controls-screen.mjs
node tools/test-menu-styles.mjs "<مجلد ASTRO APP>" "<مجلد للمخرجات>"
node tools/test-logo-export.mjs "<مجلد ASTRO APP>"
node tools/gpc-check.mjs file.gpc
```

## حدود البرنامج (مقصودة)
- **المترجم غير مرفق في المستودع** (برنامج طرف ثالث). إذا وُضعت ملفاته الثلاثة (`libgpc.js` و`libgpc.wasm` و`libgpc_bg.js`) في `ui/js/` يستخدمها البرنامج. وإذا غابت يفتح البرنامج ويعمل المحرر والقوائم والمودات والمعاينة وBEST VALUES والاتصال بالقطعة، أما الترجمة والفلاش من الكود فتعرض رسالة أن المترجم غير مثبّت.
- البروتوكول المستخدم هنا هو تنفيذنا الخاص للأوامر غير المشفّرة فقط:

| الأمر | الوظيفة |
|---|---|
| `0xAB` + `00` | إيقاف بث البيانات الحي قبل كل عملية |
| `0xF0` | إصدار الفيرموير |
| `0xF1` | الرقم التسلسلي |
| `0xFB` | جدول السلوتات (8 × 508 بايت) |
| `0xE2` | مسح كل السلوتات |
| `0x20` | فحص الحالة (انتظار انتهاء المسح) |

الحزمة 64 بايت: `CMD | LEN (u16 LE، تنازلي) | SEQ | حتى 60 بايت بيانات`.

تخطيط سجل السلوت (508 بايت):

| الموقع | الحقل |
|---|---|
| 0 | content_id (u32) |
| 4 | flags: enabled, remap, rumble, interpreter, gamepack, script, marketplace |
| 5 / 6 / 7 | gamepack_type / pvar_count / slot_number |
| 8 | maps (44 بايت) |
| 52 | الاسم (64 بايت، ينتهي بصفر) |
| 116 | bytecode_size (u32) |
| 120 | bytecode_crc32 (u32) |
| 124 | 64 × pvar (index u16 + value i32) |

## الملفات
```
src-tauri/src/zen.rs      البروتوكول + الاختبارات (cargo test)
src-tauri/src/hid.rs      أوامر Tauri: connect / read slots / format / presence
src-tauri/src/storage.rs  مكتبة السكربتات ونوافذ الفتح والحفظ
ui/index.html, css/       الواجهة
ui/js/app.js              منطق BOOT و COMPILER
ui/js/editor.js           محرر الكود
ui/js/gpc-lang.js         كلمات GPC للتلوين
```

## ملاحظات من الجهاز الحقيقي (فيرموير 2.3.2)
- القطعة تظهر في Windows باسم **Cronus Bridge** (`2008:0010`)، والواجهة `usage page = FFAB`.
- **ردود الجهاز ترقّم الحزم من 0** (الطلبات من 1)، لذلك التجميع يعتمد على `LEN` وليس `SEQ`.
- الرقم التسلسلي يُرسل بصيغة UTF-16LE.
- بت `remap` موجود حتى في السلوتات الفارغة (flags = `0x0b`)، فالسلوت الفارغ = حجم 0 بدون اسم.

## الاختبار
- `cargo test`: 6 اختبارات (تقطيع الحزم مطابق للتسجيل الرسمي، الاتصال، قراءة السلوتات، سجلات حقيقية من الجهاز، الفورمات، الفيرموير).
- `cargo run --example zen_probe`: قراءة فقط من الجهاز الحقيقي (فيرموير + سيريال + السلوتات). لا يمسح ولا يكتب.
- `cargo run --example zen_frames`: يعرض رؤوس الحزم الخام لرد جدول السلوتات.
- `cargo run --example hid_list`: يعرض كل أجهزة HID المتصلة.

تم التحقق على جهاز حقيقي: القراءة صحيحة. **الفورمات (RESTART) لم يُجرَّب على الجهاز الحقيقي.**

## الحقوق والتواصل

صنع البرنامج **ABU 3RB** (ابو عرب) و**ABU SHADAD** (ابو شداد). الرخصة MIT (انظر [LICENSE](LICENSE)).

- TikTok: [_TMO](https://www.tiktok.com/@_tmo)
- Instagram: [7.U8](https://www.instagram.com/7.u8/)
- Discord: `7_UG`
