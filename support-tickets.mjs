const API_BASE = "https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev";
const MIN_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 365;

export function supportGate(payload) {
  const days = payload?.features?.supportRetentionDays;
  return payload?.status === "ready" &&
    payload?.dependencies?.database === "ready" &&
    payload?.features?.publicSupport === true &&
    Number.isInteger(days) && days >= MIN_RETENTION_DAYS && days <= MAX_RETENTION_DAYS;
}

export function supportTrackingGate(payload) {
  return payload?.status === "ready" && payload?.dependencies?.database === "ready";
}

export function validTicketCredentials(code, secret) {
  return /^MS-[A-F0-9]{16}$/i.test(String(code || "").trim()) &&
    /^[a-f0-9]{64}$/i.test(String(secret || "").trim());
}

async function request(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    ...options,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { Accept: "application/json", ...(options.headers || {}) }
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error?.message || "درخواست ناموفق بود؛ اتصال را بررسی و دوباره تلاش کن.");
  return data;
}

const $ = selector => document.querySelector(selector);
function setFormEnabled(form, enabled) {
  if (!form) return;
  form.querySelectorAll("input,select,textarea,button").forEach(control => { control.disabled = !enabled; });
}
function status(target, text) {
  if (target) target.textContent = text;
}
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function ticketStatus(value) {
  return ({ open: "باز", in_progress: "در حال بررسی", waiting_user: "در انتظار پاسخ کاربر", resolved: "پاسخ داده‌شده" })[value] || "نامشخص";
}

function appendTicketStatusEvents(list, events, prepend = false) {
  const fragment = document.createDocumentFragment();
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event !== "object") continue;
    const item = node("li", "");
    const transition = event.from_status
      ? "از " + ticketStatus(event.from_status) + " به " + ticketStatus(event.to_status)
      : "درخواست ثبت شد · " + ticketStatus(event.to_status);
    const date = typeof event.created_at === "string" && Number.isFinite(Date.parse(event.created_at))
      ? new Date(event.created_at) : null;
    const time = node("time", "", date ? date.toLocaleString("fa-IR") : "زمان نامشخص");
    if (date) time.dateTime = event.created_at;
    item.append(node("span", "", transition), time);
    fragment.append(item);
  }
  if (prepend) list.prepend(fragment);
  else list.append(fragment);
}
function renderTicketStatusHistory(events, options = {}) {
  const section = node("section", "support-ticket-history");
  section.setAttribute("aria-label", "تاریخچه تغییر وضعیت");
  section.append(node("strong", "", "تاریخچه وضعیت"));
  const list = node("ol", "");
  appendTicketStatusEvents(list, events);
  if (!list.children.length) list.append(node("li", "", "هنوز سابقه‌ای برای وضعیت درخواست ثبت نشده است."));
  section.append(list);
  const older = node("button", "button support-ticket-history-older", "بارگذاری تغییر وضعیت‌های قدیمی‌تر");
  older.type = "button";
  older.dataset.cursor = options.nextCursor || "";
  older.hidden = options.hasMore !== true;
  section.append(older);
  return section;
}

async function checkAvailability() {
  const requestForm = $("#supportRequestForm");
  const trackForm = $("#ticketTrackForm");
  const requestStatus = $("#supportRequestStatus");
  const trackResult = $("#ticketTrackResult");
  try {
    const health = await request("/v1/health/ready");
    const intakeEnabled = supportGate(health);
    const trackingEnabled = supportTrackingGate(health);
    setFormEnabled(requestForm, intakeEnabled);
    setFormEnabled(trackForm, trackingEnabled);
    status(requestStatus, intakeEnabled
      ? `سرویس ثبت درخواست آماده است. درخواست‌های بدون به‌روزرسانی پس از ${health.features.supportRetentionDays} روز حذف می‌شوند؛ اطلاعات محرمانه ارسال نکن.`
      : "ثبت درخواست جدید تا زمان انتشار نسخه سازگار و فعال‌شدن سیاست نگهداری امن تیکت‌ها غیرفعال است.");
    status(trackResult, trackingEnabled
      ? "پیگیری درخواست‌های قبلی فعال است؛ کد پیگیری و کلید خصوصی را وارد کن."
      : "پیگیری آنلاین تا زمان آماده‌شدن پایگاه داده در دسترس نیست.");
    return intakeEnabled;
  } catch {
    setFormEnabled(requestForm, false);
    setFormEnabled(trackForm, false);
    const note = "سرویس پشتیبانی فعلاً در دسترس نیست. فرم‌ها تا تأیید آمادگی سرور غیرفعال می‌مانند.";
    status(requestStatus, note);
    status(trackResult, note);
    return false;
  }
}

function showNewTicketCredentials(ticket) {
  const box = $("#supportTicketCredential");
  if (!box) return;
  box.replaceChildren();
  box.hidden = false;
  box.append(
    node("p", "", "درخواست ثبت شد. کد و کلید زیر فقط اکنون نمایش داده می‌شوند؛ آن‌ها را در جای امنی نگه دار. درخواست پس از " + ticket.retention_days + " روز بدون به‌روزرسانی حذف می‌شود."),
    node("p", "ticket-secret", "کد پیگیری: " + ticket.code),
    node("p", "ticket-secret", "کلید خصوصی: " + ticket.token)
  );
}

async function createTicket(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const result = $("#supportRequestStatus");
  if (submit.disabled) return;
  const subject = $("#supportSubject").value.trim();
  const message = $("#supportMessage").value.trim();
  if (!subject || !message) { status(result, "موضوع و شرح درخواست را کامل کن."); return; }
  if (!$("#supportConsent").checked) { status(result, "برای ثبت درخواست، اطلاعیهٔ حریم خصوصی را مطالعه و تأیید کن."); return; }
  const payload = {
    category: $("#supportCategory").value,
    subject,
    contact_email: $("#supportEmail").value.trim() || null,
    message,
    website: $("#supportWebsite").value.trim(),
    consent: $("#supportConsent").checked
  };
  submit.disabled = true;
  status(result, "در حال ثبت درخواست…");
  try {
    const data = await request("/v1/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (data.ticket?.code && data.ticket?.token) {
      showNewTicketCredentials(data.ticket);
      status(result, "ثبت درخواست با موفقیت انجام شد.");
      $("#supportSubject").value = "";
      $("#supportEmail").value = "";
      $("#supportMessage").value = "";
      $("#supportWebsite").value = "";
      $("#supportConsent").checked = false;
    } else {
      status(result, "درخواست دریافت شد.");
    }
  } catch (error) {
    status(result, error.message);
  } finally {
    submit.disabled = false;
  }
}

async function loadTicket(code, secret, root, options = {}) {
  const append = options.append === true;
  const params = new URLSearchParams({ limit: "50" });
  if (append && options.cursor) params.set("cursor", options.cursor);
  const data = await request("/v1/support/tickets/" + encodeURIComponent(code) + "?" + params.toString(), {
    headers: { Authorization: "Bearer " + secret }
  });
  let messages = root.querySelector(".support-ticket-messages");
  let older = root.querySelector(".support-ticket-older");
  if (!append) {
    root.replaceChildren();
    const history = renderTicketStatusHistory(data.status_history, {
      hasMore: data.status_history_has_more,
      nextCursor: data.status_history_next_cursor
    });
    root.append(
      node("p", "support-ticket-heading", data.ticket.subject),
      node("p", "support-ticket-meta", data.ticket.ticket_code + " · " + ticketStatus(data.ticket.status)),
      history
    );
    const historyOlder = history.querySelector(".support-ticket-history-older");
    historyOlder.addEventListener("click", async () => {
      const cursor = historyOlder.dataset.cursor;
      if (!cursor || historyOlder.disabled) return;
      historyOlder.disabled = true;
      try {
        const params = new URLSearchParams({ status_limit: "50", status_cursor: cursor });
        const olderPage = await request("/v1/support/tickets/" + encodeURIComponent(code) + "?" + params.toString(), {
          headers: { Authorization: "Bearer " + secret }
        });
        appendTicketStatusEvents(history.querySelector("ol"), olderPage.status_history, true);
        historyOlder.dataset.cursor = olderPage.status_history_next_cursor || "";
        historyOlder.hidden = !olderPage.status_history_has_more;
      } catch (error) {
        status(root, error.message);
      } finally {
        historyOlder.disabled = false;
      }
    });
    messages = node("div", "support-ticket-messages");
    root.append(messages);
    older = node("button", "button support-ticket-older", "بارگذاری پیام‌های قدیمی‌تر");
    older.type = "button";
    root.append(older);
    older.addEventListener("click", async () => {
      const cursor = older.dataset.cursor;
      if (!cursor || older.disabled) return;
      older.disabled = true;
      try {
        await loadTicket(code, secret, root, { append: true, cursor });
      } catch (error) {
        status(root, error.message);
      } finally {
        older.disabled = false;
      }
    });
  }
  const fragment = document.createDocumentFragment();
  for (const item of Array.isArray(data.messages) ? data.messages : []) {
    const message = node("article", "support-ticket-message");
    message.append(
      node("strong", "", ({ user: "شما", admin: "پشتیبانی", assistant: "راهنمای خودکار" })[item.sender_role] || "پیام"),
      node("p", "", String(item.body || ""))
    );
    fragment.append(message);
  }
  if (append) messages.prepend(fragment);
  else messages.append(fragment);
  if (older) {
    older.dataset.cursor = data.next_cursor || "";
    older.hidden = !data.has_more;
  }
  if (!append) {
    const replyForm = node("form", "support-form support-ticket-reply");
    const label = node("label", "", "پیام جدید");
    const input = node("textarea");
    input.rows = 3;
    input.maxLength = 4000;
    input.required = true;
    const send = node("button", "button button-primary", "ارسال پاسخ");
    send.type = "submit";
    replyForm.append(label, input, send);
    replyForm.addEventListener("submit", async event => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || send.disabled) return;
      send.disabled = true;
      try {
        await request("/v1/support/tickets/" + encodeURIComponent(code) + "/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + secret },
          body: JSON.stringify({ message })
        });
        await loadTicket(code, secret, root);
      } catch (error) {
        status(root, error.message);
      } finally {
        send.disabled = false;
      }
    });
    root.append(replyForm);
  }
}
async function trackTicket(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  if (submit.disabled) return;
  const code = $("#ticketCodeInput").value.trim().toUpperCase();
  const secret = $("#ticketTokenInput").value.trim();
  const root = $("#ticketTrackResult");
  if (!validTicketCredentials(code, secret)) {
    status(root, "کد پیگیری یا کلید خصوصی معتبر نیست.");
    return;
  }
  submit.disabled = true;
  try {
    await loadTicket(code, secret, root);
  } catch (error) {
    status(root, error.message);
  } finally {
    submit.disabled = false;
  }
}

function init() {
  const dialog = $("#supportDialog");
  if (!dialog) return;
  const requestForm = $("#supportRequestForm");
  const trackForm = $("#ticketTrackForm");
  if (!requestForm || !trackForm) return;
  setFormEnabled(requestForm, false);
  setFormEnabled(trackForm, false);
  requestForm.addEventListener("submit", createTicket);
  trackForm.addEventListener("submit", trackTicket);
  $("#supportLauncher")?.addEventListener("click", () => { checkAvailability(); });
  window.addEventListener("online", checkAvailability);
  dialog.addEventListener("close", () => {
    $("#ticketTokenInput").value = "";
    $("#ticketTrackResult").replaceChildren();
    $("#supportTicketCredential")?.replaceChildren();
    if ($("#supportTicketCredential")) $("#supportTicketCredential").hidden = true;
  });
  checkAvailability();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
