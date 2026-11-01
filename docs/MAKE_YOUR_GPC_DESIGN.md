# Make Your GPC — التصميم

قسم ثالث في البرنامج بجانب BOOT | COMPILER: معالج يبني سكربت GPC كامل بدون كتابة كود.
كل الكود المولَّد من قوالبنا نحن (لا ننسخ كود السكربتات المسرّبة)، ويُفحص بـ libgpc قبل التصدير.

## خطوات المعالج
| # | الخطوة | المحتوى |
|---|---|---|
| 1 | START | اسم السكربت + هل تريد شعار؟ نعم = Logo Studio، لا = الاسم يصير الشعار |
| 2 | MENU | اختيار شكل القائمة (معاينة OLED حيّة تتنقل فيها بالكيبورد) + زر فتح القائمة |
| 3 | MODS | كتالوج المودات بالأقسام، لكل مود أنواعه وقيمه (min / max / default / step) |
| 4 | CONTROLS | التخطيط، البروفايلات، Quick toggles، Kill switch |
| 5 | SCREEN | شاشة الإقلاع، الشاشة الرئيسية، شاشة التوقف (مدة ونوع)، LED، الاهتزاز |
| 6 | BUILD | توليد GPC ← فحص بـ libgpc ← فتح في COMPILER أو سحبه على سلوت |

## أشكال القوائم (كلها على نفس المحرك، يختلف الرسم فقط)
1. **Classic Toggle**: شريط عنوان، اسم المود في الوسط، ON/OFF كبير. يمين/يسار بين المودات (نمط SYNEX / PandaAim).
2. **Category Tree**: Main (أقسام) ← Mod ← Edit، مع سطر البروفايل (نمط SlaughterHouse / French Connection).
3. **Inverted List**: خلفية بيضاء وقائمة من 3 مربعات والمحدد معكوس (نمط ASTRO RANK).
4. **Node Panel**: عمود مختصرات على اليسار ولوحة تفاصيل على اليمين (نمط Ibn Homs Node).
5. **Value Bar Pro**: شاشة تعديل فيها الحد الأدنى والأعلى وشريط تعبئة (نمط SYNEX edit / Peacekeeper).
6. **Carousel** (تصميمنا): المود الحالي كبير في الوسط، والسابق واللاحق صغيران على الجانبين.
7. **Tabs** (تصميمنا): تبويبات أقسام في الأعلى، ومحتوى القسم تحتها.

المحرك: enum + مصفوفة `Settings[]` + جدول عناصر، والحفظ بمحرك البتات (SaveSPVAR/ReadSPVAR) يُولَّد آلياً من مدى كل قيمة، فيبقى ترتيب الحفظ والتحميل متطابقاً دائماً.

## كتالوج المودات (مستخرج من 40 سكربت)
**1. Anti Recoil**
- Basic AR (V, H)
- Progressive AR (Start, Mid, End, Time)
- Rumble AR (يقوّي التعويض حسب اهتزاز اليد)
- Weapon AR: تعرّف تلقائي على السلاح من بصمة الزناد التكيّفي في PS5 (`adt_cmp`) + جدول أسلحة، أو اختيار يدوي حسب الفئة
- تعديل AR أثناء اللعب (ADS + الأسهم)

**2. Aim Assist** (يُسمح باثنين فقط من الأنواع الرئيسية، و HIP AA خيار ثالث مستقل)
- Polar AA (Speed, Size)
- Advance AA (Taylor V5 Shapes: Speed, Size, Shape)
- Taylor AA (Speed, Size)
- DoGz AA (Speed, Size, Release)
- HIP AA (Speed, Size)
- إضافات: Boost on Fire، Sticky / Tracker، Headshot Assist، Steady Aim

**3. Controller**
- Custom Buttons (20 تخطيطاً + ربط مخصص بالضغط على الزر)
- Hair Trigger
- Deadzone (L, R)
- Flipped (تبديل L و R)
- Stick Layout
- Inverted Y
- Block Rumble
- VM Speed
- تحويل PS ↔ XB (TOUCH ↔ VIEW)
- معايرة انحراف العصا

**4. Shooting**: Rapid Fire، Burst Fire، Akimbo، Quick Scope، Hold Breath، Strafe Shot، Jump Shot، Drop Shot، Crouch Shot

**5. Movement**: Slide Cancel (MW / BO7)، Bunny Hop، Auto Sprint، YY Spam، Fast Melee، Insta Drop

**6. Utility**: Auto Ping، Kill Switch / Drive Mode، Quick Toggles، Profiles (1–3)، LED Theme، Rumble Feedback، قفل PIN (اختياري)

## Logo Studio (إعادة بناء لمزايا Swizzy Message Screen Studio)
مستودع Swizzy بدون رخصة، لذلك نعيد كتابة المزايا بأنفسنا بـ JavaScript ولا ننسخ كوده:
- تحميل صورة (PNG / JPG / GIF بإطاراتها / BMP / WEBP)
- ملاءمة أو حجم ثابت، 9 مواضع، هوامش، قلب، تدوير
- Threshold، سطوع HSL، 9 خوارزميات Dithering، عكس، دمج أبيض أو أسود
- محرر بكسل 128×64: قلم وممحاة بحجم وشكل، Clear، Invert، إزاحة، Undo/Redo
- أداة نص (خط، حجم، Bold/Italic، موضع)
- استيراد بيانات packed
- تصدير `const image` + `image_oled` (الافتراضي والأسرع)، أو 16/8 بت مع دالة رسم، أو أسطر `pixel_oled`
- معاينة على شكل الجهاز

## مراحل التنفيذ (كلها منفّذة)
1. هيكل الصفحة + المعالج + حالة المشروع + معاينة OLED
2. Logo Studio
3. أشكال القوائم ومولّدها
4. كتالوج المودات ومولّد الكود والحفظ
5. فحص آلي يكومبايل كل التركيبات + تجربة على القطعة
