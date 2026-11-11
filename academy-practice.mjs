const CHALLENGES = Object.freeze([
  {id:"js-variables",title:"متغیرها و محاسبه",level:"مقدماتی",brief:"دو عدد را در متغیرها نگه دار و حاصل جمع آن‌ها را چاپ کن.",starter:"const first = 12;\nconst second = 8;\nconsole.log(first + second);",expected:["20"],hint:"از const برای دو مقدار و console.log برای نمایش نتیجه استفاده کن."},
  {id:"js-condition",title:"شرط و تصمیم‌گیری",level:"مقدماتی",brief:"اگر امتیاز ۶۰ یا بیشتر بود، عبارت «قبول» و در غیر این صورت «نیازمند تمرین» را چاپ کن.",starter:"const score = 82;\n// کد شرط را اینجا بنویس",expected:["قبول"],hint:"می‌توانی از if/else یا عملگر شرطی استفاده کنی."},
  {id:"js-array",title:"کار با آرایه‌ها",level:"مقدماتی",brief:"مجموع اعداد بزرگ‌تر از ۱۰ در آرایه را محاسبه و چاپ کن.",starter:"const values = [4, 12, 7, 23];\n// مجموع مقادیر بزرگ‌تر از ۱۰ را بساز",expected:["35"],hint:"filter و reduce دو ابزار مناسب برای این تمرین هستند."},
  {id:"js-function",title:"ساخت تابع",level:"مقدماتی",brief:"تابعی به نام total بساز که قیمت و تعداد را بگیرد و حاصل‌ضرب آن‌ها را برگرداند. نتیجه total(12, 3) را چاپ کن.",starter:"function total(price, count) {\n  // نتیجه را برگردان\n}\nconsole.log(total(12, 3));",expected:["36"],hint:"در تابع از return استفاده کن؛ مقدار را مستقیم چاپ نکن."},
  {id:"js-string",title:"پردازش رشته",level:"مقدماتی",brief:"فاصله‌های ابتدا و انتهای متن را حذف کن، حروف را بزرگ کن و نتیجه را چاپ کن.",starter:"const word = '  hello  ';\n// رشته را پاک‌سازی و چاپ کن",expected:["HELLO"],hint:"متدهای trim و toUpperCase را بررسی کن."},
  {id:"js-object",title:"کار با شیء",level:"مقدماتی",brief:"مقدار property سیستم‌عامل را از شیء زیر بخوان و چاپ کن.",starter:"const device = { name: 'lab-pc', os: 'Linux' };\n// مقدار os را چاپ کن",expected:["Linux"],hint:"به دسترسی نقطه‌ای به ویژگی‌های object توجه کن."}
]);

const KEY = "mr-siavash-ai.academy.practice.v1";
const IDS = new Set(CHALLENGES.map(item => item.id));

export function getAcademyChallenges() { return CHALLENGES.map(item => ({ ...item, expected: [...item.expected] })); }
export function getAcademyChallenge(id) { const item = CHALLENGES.find(challenge => challenge.id === id); return item ? { ...item, expected: [...item.expected] } : null; }
export function normalizeAcademyPracticeState(raw) {
  let value = raw;
  if (typeof raw === "string") { try { value = JSON.parse(raw); } catch { value = {}; } }
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  const completed = [...new Set((Array.isArray(value.completed) ? value.completed : []).filter(id => IDS.has(id)))];
  const attempts = {};
  if (value.attempts && typeof value.attempts === "object" && !Array.isArray(value.attempts)) {
    for (const id of IDS) {
      const count = value.attempts[id];
      if (Number.isSafeInteger(count) && count >= 0 && count <= 10000) attempts[id] = count;
    }
  }
  return { version: 1, completed, attempts };
}
export function gradeAcademyChallenge(id, output) {
  const challenge = getAcademyChallenge(id);
  if (!challenge || !Array.isArray(output) || output.length > 20 || output.some(line => typeof line !== "string" || line.length > 500)) {
    return { valid: false, passed: false, message: "خروجی یا شناسه تمرین معتبر نیست." };
  }
  const actual = output.map(line => line.trim());
  const passed = actual.length === challenge.expected.length && actual.every((line, index) => line === challenge.expected[index]);
  return { valid: true, passed, message: passed ? "آفرین! خروجی مورد انتظار تولید شد." : "هنوز خروجی با پاسخ مورد انتظار یکسان نیست؛ راهنما را بررسی کن." };
}
export function recordAcademyPracticeAttempt(state, id, passed) {
  const normalized = normalizeAcademyPracticeState(state);
  if (!IDS.has(id) || typeof passed !== "boolean") return normalized;
  normalized.attempts[id] = Math.min(10000, (normalized.attempts[id] || 0) + 1);
  if (passed && !normalized.completed.includes(id)) normalized.completed.push(id);
  return normalized;
}
export function serializeAcademyPracticeState(state) { return JSON.stringify(normalizeAcademyPracticeState(state)); }
export function getAcademyPracticeStorageKey() { return KEY; }
