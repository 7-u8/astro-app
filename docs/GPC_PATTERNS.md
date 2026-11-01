# GPC — القواعد والأنماط المستخرجة من 40 سكربت (Downloads\GPCS)

مرجع لبناء أداة **Make Your GPC**. كل نقطة هنا مأخوذة من سكربتات حقيقية تُكمبايل.

## 1. ترتيب الملف وقواعد اللغة
```
// ترويسة: اسم + تعليمات الاستخدام
define ... ;  enum { ... }             // ثوابت
const string / const uint8 / const int16 / const image / const ps5adt
data( ... );                           // قسم بيانات واحد، يُقرأ بـ duint8(i)/dint8(i)
int ... ;                              // كل المتغيرات عامة (global)، يُسمح بقيمة أولية: int x = 5;
function ...                           // دوال
init { }                               // مرة واحدة عند تحميل السلوت
main { }                               // كل إطار (~10ms، يتغير بـ vm_tctrl)
combo ... { wait(ms); }                // الوحيد اللي فيه wait()
```
- المترجم الحالي يتسامح: دوال ومتغيرات بعد `main`، واستدعاء دالة قبل تعريفها (SYNEX)، وفواصل منقوطة ناقصة (SlaughterHouse). **الأداة تولّد الترتيب القياسي أعلاه دائماً.**
- لا متغيرات محلية → السكربتات تعيد استخدام متغيرات مؤقتة عامة (`i`, `_ret`, `tmp`).
- لا ternary → دالة `iif(cond, a, b)`.
- `switch(x) { case A { ...; break; } default { } }` (أقواس بدل النقطتين).
- الأنواع: `int8 int16 int32 uint8 uint16`، مصفوفات 1D و `[][]`.
- `inv(x)` = سالب x. الأرقام بالـ HEX شائعة (للتمويه).
- النصوص: `const string S[] = {"A","B",""};` العنصر = **عنوان** في الذاكرة. `""` أو `-1` في النهاية للعدّ. الطول بحلقة `duint8(addr)` أو `sizeof(S)`.
- أدوات مساعدة شائعة: `get_rtime()` للمؤقتات، `get_ptime(btn)` مدة الضغط، `get_brtime(btn)` منذ آخر إفلات (للضغطة المزدوجة)، `block(btn, ms)`، `block_all_inputs()`، `swap()`, `TRACE_1..6` للتصحيح، `get_slot()` رقم السلوت، `get_info(ZENLINK_STATUS)`.
- `get_ival` = الخام من اليد، `get_val` = بعد التعديل. القوائم تقرأ `get_ival`/`event_press`.
- كشف الجهاز: `get_console()` / `get_controller()` = `PIO_PS4 / PIO_PS5 / PIO_XB1 / PIO_XB360` → عرض أسماء أزرار PS أو XB، وتبديل TOUCH/VIEW.

## 2. الشاشة OLED (128×64)
- `cls_oled(c)`، `print(x,y,font,color,S[i])`، `rect_oled(x,y,w,h,fill,color)`، `line_oled(x1,y1,x2,y2,w,color)`، `pixel_oled`، `image_oled(x,y,color,invert,img[0])` مع `const image img = {w,h,bytes...}`.
- الأرقام: `putc_oled(pos, '0'+d)` لكل خانة ثم `puts_oled(x,y,font,len,color)`.
- الخطوط: `OLED_FONT_SMALL/MEDIUM/LARGE` مع `_WIDTH/_HEIGHT`. التوسيط: `(OLED_WIDTH/2) - (chars*width/2)`.
- رموز خاصة في الخط: 127 ✕، 128 ○، 130 △، 131 ↑، 132 ↓، 133 ←، 134 →.
- ثيم مقلوب: `cls_oled(OLED_WHITE)` ونص `OLED_BLACK`. شريط عنوان = `rect_oled` معبأ ونص أسود.
- **الرسم فقط عند التغيير** (علم dirty: `construct` / `DisplayMenu` / `Display[Update]`).
- لا يدعم العربي: الحروف ASCII فقط.

## 3. فتح القائمة والتنقل (العرف السائد)
| الفعل | الزر |
|---|---|
| فتح/إغلاق | **ضغط ADS (L2/LT) + OPTIONS/MENU**، ومنع OPTIONS من الوصول للعبة |
| بين الأقسام | UP / DOWN |
| بين المودات | LEFT / RIGHT (مع التفاف) |
| تشغيل/تبديل النوع | UP / DOWN داخل المود |
| دخول التعديل | CROSS/A (فقط إذا المود له قيم) |
| تعديل القيمة | (ضغط ADS أو CROSS) + LEFT/RIGHT ±1، UP/DOWN ±10، تكرار بعد 250–500ms |
| رجوع / حفظ وخروج | CIRCLE/B |
| تبديل البروفايل | TRIANGLE/Y |
| Kill switch / Drive mode | L2+SHARE، أو ADS + ضغطتين يمين |
- أثناء القائمة: `block_all_inputs()` أو تصفير أزرار القائمة، و`vm_tctrl(0)`.
- المستويات: Home/Dashboard → Main (أقسام) → Mod → Edit.

## 4. ثلاث معماريات للقوائم
1. **if لكل عنصر** (APHRODITE, SYNEX): `menu_index` + if لكل مود. سهلة، تتضخم بسرعة.
2. **جداول + عدّاد** (SlaughterHouse, Venom, TD21): `ModsNToggles[][] = {idx, minT, maxT, valStart, valEnd, editable, scope}` و `ValRangeMinMax[][] = {idx, min, max, step1, step10, scope}`، ودوال عامة `ToggleSwitch()`/`EditableValues()` تُستدعى بالترتيب وتعدّ `ModIdx++`. **ترتيب الاستدعاء لازم يطابق صفوف الجدول.**
3. **enum + مصفوفة Settings[]** (Peacekeeper): كل إعداد = فهرس enum، `MenuItems[][] = {canEdit, editStart, relation, depth, min, max}`، `SubMenuItems[][] = {setting, min, max}`، ودالة واحدة `ValidateRange(v, change, min, max, cycle, update)`. **الأنسب للتوليد الآلي.**

## 5. الحفظ في ذاكرة الجهاز (SPVAR)
- `SPVAR_1..SPVAR_64` لكل سلوت، كل واحد 32 بت. `get_pvar(slot, min, max, default)` يرجع default إذا القيمة خارج المدى. `set_pvar(slot, value)`.
- ثلاث طرق:
  - **مباشر**: قيمة لكل SPVAR (Saw, JOCHI).
  - **حزم يدوي**: قيمتان في واحد (`pack_signed` 8+8 بت)، أو أعلام في بتات (`pack_unsigned`, `get_15var`).
  - **محرك البتات** (SlaughterHouse, Peacekeeper, TOXIC, ASTRO RANK): `ResetSPVAR` ثم `SaveSPVAR(v,min,max)` / `ReadSPVAR(min,max,def)`. كل قيمة تأخذ عدد البتات اللي يحتاجه مداها بالضبط، متتالية عبر الخانات. أول بت = "يوجد حفظ"، وإلا تُستخدم الافتراضيات.
- **ترتيب Save لازم يطابق ترتيب Load حرفياً**، وتغيير المدى أو الترتيب يكسر الحفظ القديم.
- متى نحفظ: عند الخروج من القائمة أو تبديل البروفايل، **وليس كل إطار** (يستهلك الفلاش). `safe_set_pvar` يكتب فقط عند التغيير. بعده شاشة "SAVED" لثانية إلى ثانيتين.
- البروفايلات: مصفوفات `[3]` بفهرس `ProfileIdx`، أو قاعدة SPVAR مختلفة لكل بروفايل.
- أخطاء رصدتها: SYNEX فيه تداخل في خانات SPVAR بين البروفايلات وخانة القفل. APHRODITE يعرض "SAVING DATA" ولا يحفظ شيئاً.

## 6. شاشة التوقف (ضد احتراق OLED)
- مؤقت على الشاشة الرئيسية: `t += get_rtime(); if (t >= 10000..12000) { cls_oled(0); saver = 0; }`. أي رسم جديد يصفّر المؤقت.
- نسخة متحركة (SlaughterHouse): حروف عشوائية متساقطة + اسم يتحرك لمدة 15 ثانية ثم سواد.
- شاشة إقلاع داخل combo مع wait، تنتهي بـ `cls_oled(0)` (ASTRO RANK).
- النوافذ المؤقتة (Quick toggle، SAVED) تُمسح بـ combo بعد 1.5–2 ثانية.
- مثال سيئ: APHRODITE يرسم شعاراً ثابتاً ولا يمسحه أبداً.

## 7. تقديم المودات
- كل مود: تشغيل/إيقاف، أو أنواع بأسماء (`{"Off","Legacy","Rumble"}`)، وقيم لها min/max/step.
- Quick toggles خارج القائمة (اضغط زراً + اضغط زراً آخر) مع نافذة OLED مؤقتة واهتزاز.
- التغذية الراجعة: OLED + لون LED (لكل بروفايل، أحمر = مطفأ) + اهتزاز (تشغيل = طويل، إيقاف = مزدوج).
- شاشة التعديل: اسم القيمة، الحد الأدنى يساراً، الأعلى يميناً، القيمة في الوسط، وشريط ممتلئ بالنسبة. وإذا المود بدون قيم: "No Edit Variables".
- منطق ذكي: منع مودين متعارضين معاً، والسماح بالتعديل فقط إذا المود مفعّل.
- أزرار متغيرة (`Fire, Ads, Jump...`) من جدول Layouts (حوالي 20 تخطيط معروف) + تخطيط العصي + ربط مخصص بالضغط على الزر.

## 8. سلوك وقت التشغيل
- `main` يطبّق التخطيط كل إطار، ثم المودات مشروطة بـ ADS/FIRE، ويُعاد ضبط الحالة عند الإفلات.
- التوقيت عبر combos أو مؤقتات `get_rtime()`، وليس wait في main.
- لا يوجد float → جداول sin/cos (int8، 360 قيمة)، وتحجيم ×327/328 للعصي (مدى 32767).
- معايرة انحراف العصا أول 100 إطار، وإزالة ضجيج العصا.
- `vm_tctrl(0)` في القائمة، و`-2..-9` للمودات (اختيار المستخدم).

## 9. التشفير والحماية الموجودة
تغيير الأسماء إلى `A12345` / `PREFIX_0123` / نص عشوائي، وأرقام HEX، والكود في سطر واحد، ونصوص داخل `data()`، وحشو (كود Python داخل تعليق في K1)، وقفل برمز (SYNEX: علم في SPVAR_47).

## 10. ملاحظة على ASTRO APP
ملفات السكربتات ليست UTF-8 (Windows-1252 / 1256 ورسومات ASCII). `file_read_text` يستخدم `from_utf8_lossy`، فالحفظ مرة ثانية **يتلف** هذه الحروف. لازم نكشف الترميز ونحفظ به.
