const COURSE_IDS = Object.freeze(["html", "css", "javascript", "git", "linux", "web-security"]);
const PASS_PERCENTAGE = 80;

const assessments = {
  html: {
    title: "سنجش مهارت HTML",
    questions: [
      { id:"html-1", prompt:"کدام عنصر برای محتوای اصلی و یکتای صفحه مناسب‌تر است؟", options:["<div>","<main>","<span>","<footer>"], answer:1, explanation:"عنصر main محتوای غالب صفحه را مشخص می‌کند و به پیمایش دسترس‌پذیر کمک می‌کند." },
      { id:"html-2", prompt:"ویژگی alt در تصویر چه کاربرد اصلی دارد؟", options:["تعیین اندازه تصویر","افزودن توضیح جایگزین متنی","بارگذاری تنبل تصویر","تغییر فرمت فایل"], answer:1, explanation:"متن جایگزین، مفهوم تصویر را برای فناوری‌های کمکی و در شرایط بارگذاری‌نشدن تصویر منتقل می‌کند." },
      { id:"html-3", prompt:"برای اتصال label به input از چه ویژگی‌ای استفاده می‌شود؟", options:["name و class","for و id","src و href","role و title"], answer:1, explanation:"مقدار for در label باید با id ورودی متناظر یکسان باشد." },
      { id:"html-4", prompt:"کدام ساختار برای جدول داده‌ای دسترس‌پذیر مناسب‌تر است؟", options:["استفاده از th برای سرستون‌ها","ساخت جدول با br","قرار دادن همه داده‌ها در یک td","حذف caption و سرستون‌ها"], answer:0, explanation:"سلول‌های th رابطه سرستون و داده را روشن می‌کنند؛ caption نیز می‌تواند موضوع جدول را توضیح دهد." },
      { id:"html-5", prompt:"برای تعیین زبان اصلی یک سند فارسی کدام ویژگی مناسب است؟", options:["dir=\"rtl\" به‌تنهایی","lang=\"fa\" روی html","charset=\"fa\"","class=\"persian\""], answer:1, explanation:"lang زبان محتوا را مشخص می‌کند؛ dir جهت نوشتار را کنترل می‌کند و این دو مکمل یکدیگرند." }
    ],
    project: {
      title:"پروژه پایانی: وب‌سایت معرفی یک خدمت",
      brief:"یک وب‌سایت چندبخشی و معنایی برای معرفی یک خدمت یا پروژه طراحی کن. تمرکز این پروژه بر ساختار HTML، فرم قابل‌استفاده و دسترس‌پذیری است؛ ظاهر نهایی در مرحله CSS تکمیل می‌شود.",
      deliverables:["صفحه دارای doctype، زبان فارسی و جهت RTL","ساختار header، nav، main، section و footer با ترتیب منطقی","عنوان‌های سلسله‌مراتبی و پیوندهای توصیفی","فرم تماس با label متصل و اعتبارسنجی بومی","تصاویر دارای متن جایگزین متناسب و جدول داده با سرستون در صورت نیاز"],
      rubric:["معنایی‌بودن ساختار و ترتیب محتوا","دسترس‌پذیری فرم، پیوندها و تصاویر","اعتبار ساختار و نبود عناصر نامعتبر","وضوح محتوا و قابلیت استفاده"]
    }
  },
  css: {
    title:"سنجش مهارت CSS",
    questions:[
      {id:"css-1",prompt:"چرا معمولاً box-sizing: border-box انتخاب مناسبی است؟",options:["حذف padding","محاسبه width شامل padding و border","غیرفعال‌کردن margin","اجبار به اندازه ثابت"],answer:1,explanation:"در border-box، عرض اعلام‌شده اندازه نهایی جعبه را شامل padding و border در نظر می‌گیرد."},
      {id:"css-2",prompt:"برای چیدمان دوبعدی ردیف و ستون کدام ابزار مناسب‌تر است؟",options:["float","CSS Grid","text-align","position:fixed"],answer:1,explanation:"Grid برای تعریف هم‌زمان ردیف‌ها و ستون‌ها طراحی شده است."},
      {id:"css-3",prompt:"کدام واحد برای اندازه‌گیری نسبی به اندازه فونت ریشه مناسب است؟",options:["px","rem","vh","deg"],answer:1,explanation:"rem بر اساس font-size عنصر ریشه محاسبه می‌شود."},
      {id:"css-4",prompt:"کدام انتخابگر وضعیت تمرکز صفحه‌کلید را بهتر نمایش می‌دهد؟",options:[":hover",":focus-visible",":visited","::first-line"],answer:1,explanation:"focus-visible برای نمایش نشانگر تمرکز در تعاملاتی مانند پیمایش صفحه‌کلید مناسب است."},
      {id:"css-5",prompt:"برای احترام به ترجیح کاهش حرکت کاربر چه باید کرد؟",options:["حذف همه رنگ‌ها","استفاده از prefers-reduced-motion","اجبار به انیمیشن کوتاه","افزایش سرعت transition"],answer:1,explanation:"این media feature امکان کاهش یا حذف حرکت‌های غیرضروری را مطابق ترجیح کاربر فراهم می‌کند."}
    ],
    project:{title:"پروژه پایانی: رابط واکنش‌گرای داشبورد",brief:"یک داشبورد برای نمایش چند شاخص، فهرست فعالیت‌ها و نوار ابزار بساز. رابط باید در موبایل و دسکتاپ خوانا باشد و بدون ماوس نیز قابل استفاده بماند.",deliverables:["چیدمان اصلی با Grid یا Flexbox","استفاده از متغیرهای CSS برای رنگ و فاصله","حداقل دو breakpoint هدفمند","حالت focus-visible واضح و کنتراست مناسب","پشتیبانی از prefers-reduced-motion و جلوگیری از overflow افقی"],rubric:["انسجام بصری و سلسله‌مراتب","واکنش‌گرایی در عرض‌های مختلف","دسترس‌پذیری و تعامل صفحه‌کلید","سادگی و نگهداشت‌پذیری CSS"]}
  },
  javascript:{
    title:"سنجش مهارت JavaScript",
    questions:[
      {id:"js-1",prompt:"برای مقداری که دوباره انتساب داده نمی‌شود کدام تعریف مناسب‌تر است؟",options:["var","let","const","static"],answer:2,explanation:"const از انتساب دوباره جلوگیری می‌کند؛ البته به معنی immutable شدن عمیق اشیا نیست."},
      {id:"js-2",prompt:"کدام متد آرایه، آرایه جدیدی از تبدیل هر عضو تولید می‌کند؟",options:["filter","map","find","some"],answer:1,explanation:"map تابع تبدیل را روی هر عضو اجرا می‌کند و آرایه‌ای تازه می‌سازد."},
      {id:"js-3",prompt:"برای قرار دادن متن غیرقابل‌اعتماد در یک عنصر DOM کدام روش امن‌تر است؟",options:["innerHTML","document.write","textContent","eval"],answer:2,explanation:"textContent متن را به‌عنوان متن قرار می‌دهد و آن را به HTML اجرایی تبدیل نمی‌کند."},
      {id:"js-4",prompt:"در fetch، چه زمانی بهتر است پاسخ HTTP ناموفق را به خطا تبدیل کنیم؟",options:["همیشه پیش از ارسال","پس از دریافت پاسخ و بررسی response.ok","فقط در finally","هیچ‌وقت"],answer:1,explanation:"fetch برای بسیاری از وضعیت‌های HTTP مانند 404 خودبه‌خود reject نمی‌شود؛ response.ok باید بررسی شود."},
      {id:"js-5",prompt:"هدف اصلی try/catch در کد async چیست؟",options:["افزایش سرعت شبکه","مدیریت خطاهای Promise و عملیات ناهمگام","تبدیل همه داده‌ها به رشته","جلوگیری از اجرای تابع"],answer:1,explanation:"try/catch امکان رسیدگی کنترل‌شده به خطاهای پرتاب‌شده در مسیر async/await را فراهم می‌کند."}
    ],
    project:{title:"پروژه پایانی: مدیریت فهرست کارها",brief:"یک برنامه کوچک مدیریت کارها بساز که امکان افزودن، تکمیل، فیلتر و حذف موردها را داشته باشد. داده‌ها را با ساختار روشن نگهداری کن و نمایش DOM را امن انجام بده.",deliverables:["مدل داده مبتنی بر آرایه‌ای از اشیا","افزودن، تکمیل، فیلتر و حذف کارها","مدیریت رویدادها بدون handlerهای inline","نمایش متن کاربر با textContent یا node text","اعتبارسنجی ورودی خالی و پیام وضعیت قابل‌فهم"],rubric:["درستی منطق و مدیریت حالت","ساختار توابع و خوانایی کد","امنیت نمایش ورودی و اعتبارسنجی","رفتار قابل‌استفاده و مدیریت خطا"]}
  },
  git:{
    title:"سنجش مهارت Git و GitHub",
    questions:[
      {id:"git-1",prompt:"کدام دستور وضعیت working tree و staging area را نشان می‌دهد؟",options:["git status","git push","git clone","git tag"],answer:0,explanation:"git status فایل‌های تغییرکرده، آماده commit و بدون رهگیری را گزارش می‌کند."},
      {id:"git-2",prompt:"هدف staging area چیست؟",options:["حذف تاریخچه","انتخاب تغییرات برای commit بعدی","انتشار سایت","ساخت remote"],answer:1,explanation:"با git add تغییرات موردنظر را برای commit بعدی انتخاب می‌کنیم."},
      {id:"git-3",prompt:"چرا برای یک قابلیت جدید branch جدا می‌سازیم؟",options:["برای حذف تست‌ها","برای جداسازی تغییرات و کاهش ریسک روی شاخه اصلی","برای افزایش حجم repository","برای مخفی‌کردن commitها"],answer:1,explanation:"شاخه مستقل امکان توسعه و بازبینی تغییرات را بدون دست‌کاری مستقیم شاخه اصلی می‌دهد."},
      {id:"git-4",prompt:"پیش از ادغام Pull Request چه کاری ضروری است؟",options:["نادیده‌گرفتن diff","بازبینی تغییرات و نتیجه تست‌ها","حذف شاخه اصلی","تغییر نام همه فایل‌ها"],answer:1,explanation:"diff، تست‌ها و پیامد تغییرات باید پیش از ادغام بررسی شوند."},
      {id:"git-5",prompt:"کدام دستور تاریخچه کوتاه commitها را نمایش می‌دهد؟",options:["git log --oneline","git clean -fd","git reset --hard","git remote remove"],answer:0,explanation:"گزینه --oneline هر commit را در یک خط خلاصه می‌کند."}
    ],
    project:{title:"پروژه پایانی: گردش‌کار توسعه تیمی",brief:"برای یک برنامه کوچک مخزن Git بساز، تغییرات را در چند commit معنادار ثبت کن و یک قابلیت را از شاخه مستقل تا Pull Request پیش ببر. در این تمرین از حذف یا بازنویسی مخرب تاریخچه اجتناب کن.",deliverables:["README و ساختار اولیه مخزن","حداقل سه commit با پیام روشن","شاخه feature مستقل","توضیح هدف، دامنه و روش تست در PR","بازبینی diff و ثبت نتیجه آزمون‌ها"],rubric:["کیفیت تاریخچه و پیام commit","تفکیک مسئولیت با branch","شفافیت PR و قابلیت بازبینی","شواهد تست و حفظ تغییرات موجود"]}
  },
  linux:{
    title:"سنجش مهارت Linux",
    questions:[
      {id:"linux-1",prompt:"برای نمایش مسیر فعلی در ترمینال کدام دستور مناسب است؟",options:["pwd","whoami","uname","touch"],answer:0,explanation:"pwd مسیر working directory فعلی را نمایش می‌دهد."},
      {id:"linux-2",prompt:"مجوز عددی 640 چه مفهومی دارد؟",options:["مالک rw، گروه r، دیگران بدون دسترسی","همه دسترسی کامل","مالک فقط اجرا","گروه و دیگران نوشتن دارند"],answer:0,explanation:"6 برابر read+write، 4 برابر read و 0 بدون مجوز است."},
      {id:"linux-3",prompt:"برای مشاهده پردازه‌ها کدام ابزار پایه مناسب است؟",options:["ps","mkdir","chmod","grep فقط"],answer:0,explanation:"ps اطلاعات پردازه‌ها را نمایش می‌دهد و می‌توان خروجی آن را فیلتر کرد."},
      {id:"linux-4",prompt:"برای بررسی مسیرهای مسیریابی شبکه از کدام دستور استفاده می‌شود؟",options:["ip route","cat /etc/passwd","chmod 777","touch route"],answer:0,explanation:"ip route جدول مسیرهای شبکه را نمایش می‌دهد."},
      {id:"linux-5",prompt:"اصل حداقل دسترسی در مدیریت سیستم یعنی چه؟",options:["دادن دسترسی root به همه","اعطای حداقل مجوز لازم برای انجام وظیفه","غیرفعال‌کردن به‌روزرسانی","استفاده همیشگی از chmod 777"],answer:1,explanation:"هر حساب یا سرویس فقط باید مجوزهای موردنیاز خود را داشته باشد."}
    ],
    project:{title:"پروژه پایانی: گزارش سلامت سیستم آزمایشی",brief:"در یک ماشین یا محیط Linux که مالک آن هستی، گزارشی مستند از وضعیت فایل‌سیستم، منابع، پردازه‌ها، سرویس‌های منتخب و پیکربندی شبکه تهیه کن. این پروژه فقط شامل مشاهده و تغییرات بی‌خطر در محیط آزمایشی است.",deliverables:["ثبت مشخصات سیستم و نسخه توزیع","گزارش فضای دیسک و حافظه","فهرست پردازه‌ها و وضعیت سرویس‌های منتخب","گزارش آدرس و مسیر شبکه","توضیح حداقل سه مشاهده و پیشنهاد نگهداری"],rubric:["صحت دستورات و تفسیر خروجی","ساختار و شفافیت گزارش","رعایت اصل حداقل دسترسی","تفکیک مشاهده از تغییرات انجام‌شده"]}
  },
  "web-security":{
    title:"سنجش مهارت امنیت دفاعی وب",
    questions:[
      {id:"sec-1",prompt:"در مدل تهدید، دارایی (asset) چیست؟",options:["چیزی که نیازمند حفاظت است","هر پیام خطا","فقط آدرس IP","نام یک کتابخانه"],answer:0,explanation:"دارایی می‌تواند داده، حساب، سرویس یا قابلیتی باشد که برای سازمان ارزش دارد."},
      {id:"sec-2",prompt:"کدام ویژگی کوکی دسترسی مستقیم JavaScript به آن را محدود می‌کند؟",options:["Secure","HttpOnly","SameSite","Path"],answer:1,explanation:"HttpOnly دسترسی از طریق APIهای سمت مرورگر مانند document.cookie را محدود می‌کند."},
      {id:"sec-3",prompt:"اعتبارسنجی مجوز دسترسی به یک منبع باید کجا انجام شود؟",options:["فقط در ظاهر رابط","در سمت سرور برای هر درخواست","فقط در نام دکمه","در توضیح README"],answer:1,explanation:"کنترل دسترسی باید سمت سرور و برای منبع و عملیات درخواستی اعمال شود."},
      {id:"sec-4",prompt:"چرا encode خروجی باید متناسب با context باشد؟",options:["چون یک روش برای همه contextها کافی است","چون متن HTML، ویژگی، URL و JavaScript قواعد متفاوت دارند","برای حذف نیاز به اعتبارسنجی","برای مخفی‌کردن خطاها"],answer:1,explanation:"خنثی‌سازی ایمن به محل درج داده وابسته است؛ روش یک context ممکن است در context دیگر ایمن نباشد."},
      {id:"sec-5",prompt:"کدام گزینه نشانه مدیریت مناسب اسرار است؟",options:["قرار دادن کلید در مخزن عمومی","استفاده از متغیر محیطی و محدودسازی دسترسی","ارسال کلید در پیام خطا","استفاده مجدد از یک رمز ثابت"],answer:1,explanation:"اسرار باید خارج از کد منبع نگهداری شوند، دسترسی محدود داشته باشند و در صورت افشا چرخانده شوند."}
    ],
    project:{title:"پروژه پایانی: بازبینی دفاعی یک برنامه وب آزمایشی",brief:"یک برنامه وب محلی یا نمونه‌ای که اجازه بررسی آن را داری انتخاب کن و یک بازبینی دفاعی مستند انجام بده. فقط تنظیمات، کد و رفتارهای قابل‌مشاهده را در محیط مجاز بررسی کن؛ هدف، اصلاح و کاهش ریسک است.",deliverables:["تعریف دامنه و دارایی‌های مورد بررسی","فهرست مرزهای اعتماد و ورودی‌های غیرقابل‌اعتماد","بازبینی دفاعی نشست، کنترل دسترسی و اعتبارسنجی","ثبت یافته‌ها با شدت، شواهد بی‌خطر و پیشنهاد اصلاح","چک‌لیست بازآزمایی پس از اصلاح"],rubric:["وضوح دامنه و مدل تهدید","کیفیت شواهد و اولویت‌بندی ریسک","قابلیت اجرای پیشنهادهای اصلاحی","رعایت مجوز و رویکرد دفاعی"]}
  }
};

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
deepFreeze(assessments);

export function getAcademyAssessment(courseId) {
  return Object.hasOwn(assessments, courseId) ? assessments[courseId] : null;
}

export function getAcademyAssessmentStats() {
  return { courses: COURSE_IDS.length, questions: COURSE_IDS.reduce((sum,id)=>sum+assessments[id].questions.length,0), projects: COURSE_IDS.length };
}

export function gradeAcademyAssessment(courseId, answers) {
  const assessment = getAcademyAssessment(courseId);
  if (!assessment) return null;
  const safeAnswers = answers && typeof answers === "object" && !Array.isArray(answers) ? answers : {};
  const details = assessment.questions.map(question => {
    const selected = Number.isInteger(safeAnswers[question.id]) && safeAnswers[question.id] >= 0 && safeAnswers[question.id] < question.options.length ? safeAnswers[question.id] : null;
    return { questionId:question.id, selected, correct:selected === question.answer, answer:question.answer, explanation:question.explanation };
  });
  const correct = details.filter(item=>item.correct).length;
  const score = Math.round(correct / assessment.questions.length * 100);
  return { score, correct, total:assessment.questions.length, passed:score >= PASS_PERCENTAGE, passPercentage:PASS_PERCENTAGE, details };
}

export function normalizeAcademyAssessmentState(raw) {
  let value=raw;
  if(typeof value==="string"){
    if(value.length>12000)value={};
    else{try{value=JSON.parse(value);}catch{value={};}}
  }
  if(!value||typeof value!=="object"||Array.isArray(value))value={};
  const results={},projects={};
  for(const id of COURSE_IDS){
    const result=value.results?.[id];
    if(result&&typeof result==="object"&&Number.isInteger(result.score)&&result.score>=0&&result.score<=100&&Number.isInteger(result.attempts)&&result.attempts>=1&&result.attempts<=10000){
      results[id]={score:result.score,passed:result.score>=PASS_PERCENTAGE,attempts:result.attempts,completedAt:typeof result.completedAt==="string"&&result.completedAt.length<=40&&Number.isFinite(Date.parse(result.completedAt))?result.completedAt:null};
    }
    const checks=value.projects?.[id];
    if(Array.isArray(checks))projects[id]=[...new Set(checks.filter(index=>Number.isInteger(index)&&index>=0&&index<assessments[id].project.deliverables.length))].sort((a,b)=>a-b);
  }
  return {results,projects};
}

export function serializeAcademyAssessmentState(state) {
  const normalized=normalizeAcademyAssessmentState(state);
  return JSON.stringify(normalized);
}

export function getAcademyCourseIds() {
  return [...COURSE_IDS];
}
