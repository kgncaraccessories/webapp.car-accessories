import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

/* =====================================================================
   Shop Manager — single-page app
   GitHub Pages (frontend) + Supabase (database/auth) + Cloudinary (images)
   ===================================================================== */

const configured = !String(CONFIG.SUPABASE_URL).includes('YOUR-');
const sb = configured ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;
const $app = document.getElementById('app');
let session = null;

/* ---------- Icons ---------- */
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  home: svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  customers: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>'),
  stock: svg('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>'),
  orders: svg('<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3.5"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
};

/* ---------- Helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const moneyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: CONFIG.CURRENCY || 'INR', maximumFractionDigits: 2 });
const fmt = (n) => moneyFmt.format(Number(n) || 0);
const num = (n) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (arr, f) => (arr || []).reduce((s, x) => s + (Number(f(x)) || 0), 0);
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const parseYmd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const dayRange = (from, to) => [parseYmd(from).toISOString(), addDays(parseYmd(to), 1).toISOString()];
const fmtDateTime = (s) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const fmtDay = (s) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const cleanPhone = (p) => String(p ?? '').replace(/\D/g, '');
const phoneToEmail = (p) => `${p}@${CONFIG.LOGIN_EMAIL_DOMAIN}`;
const myPhone = () => (session?.user?.email || '').split('@')[0];
const initials = (s) => String(s || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const thumb = (url, w = 300) => (url && url.includes('/upload/') ? url.replace('/upload/', `/upload/w_${w},h_${w},c_fill,q_auto,f_auto/`) : url);
const waLink = (phone, text) => {
  let p = cleanPhone(phone);
  if (p.length === 10) p = (CONFIG.COUNTRY_CODE || '91') + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};
const METHODS = ['cash', 'upi', 'card', 'bank'];
const methodOptions = (sel = 'cash') => METHODS.map((m) => `<option value="${m}" ${m === sel ? 'selected' : ''}>${m.toUpperCase()}</option>`).join('');
const itemImg = (it, size = 300, cls = '') => (it?.image_url
  ? `<img class="${cls}" src="${esc(thumb(it.image_url, size))}" alt="" loading="lazy">`
  : `<div class="ph ${cls}">${esc(initials(it?.name))}</div>`);

const spinner = () => '<div class="loading"><span class="spin"></span></div>';
const empty = (t) => `<div class="empty">${esc(t)}</div>`;
const errorBox = (e) => `<div class="error-box"><b>Something went wrong</b><div>${esc(e?.message || e)}</div></div>`;
const summaryBox = (pairs) => `<div class="summary">${pairs.map(([k, v]) => `<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;

function friendly(err) {
  const m = err?.message || String(err);
  if (/failed to fetch|networkerror/i.test(m)) return 'No internet connection. Please try again.';
  return m;
}
async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(friendly(error));
  return data;
}
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false; t.className = `toast ${type}`;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => (t.hidden = true), 250); }, 2800);
}
/** Form submit wrapper: prevents default, disables button, shows errors as toast */
async function submit(e, fn) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button:not([type=button])');
  if (btn?.disabled) return;
  const data = Object.fromEntries(new FormData(form));
  if (btn) btn.disabled = true;
  try { await fn(data, form); } catch (err) { toast(friendly(err), 'bad'); } finally { if (btn) btn.disabled = false; }
}
async function guarded(fn) { try { await fn(); } catch (err) { toast(friendly(err), 'bad'); } }

/* ---------- Bottom sheets (stackable) ---------- */
const sheets = [];
function openSheet(title, bodyHtml, onMount) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet-backdrop"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>
      <div class="sheet-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(el);
  sheets.push(el);
  el.querySelector('.sheet-backdrop').onclick = closeSheet;
  el.querySelector('[data-close]').onclick = closeSheet;
  requestAnimationFrame(() => el.classList.add('open'));
  const body = el.querySelector('.sheet-body');
  if (onMount) Promise.resolve().then(() => onMount(body, el)).catch((e) => { body.innerHTML = errorBox(e); });
  return el;
}
function closeSheet() {
  const el = sheets.pop();
  if (!el) return;
  el.classList.remove('open');
  setTimeout(() => el.remove(), 240);
}
function closeAllSheets() { while (sheets.length) closeSheet(); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

/* ---------- Image upload (Cloudinary, unsigned preset) ---------- */
async function compressImage(file, max = 1200, quality = 0.82) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b || file), 'image/jpeg', quality));
  } catch { return file; }
}
async function uploadToCloudinary(file) {
  if (String(CONFIG.CLOUDINARY_CLOUD_NAME).includes('YOUR-')) throw new Error('Add your Cloudinary details in config.js to upload photos.');
  const blob = await compressImage(file);
  const fd = new FormData();
  fd.append('file', blob, 'item.jpg');
  fd.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Photo upload failed: ${json.error?.message || res.status}`);
  return json.secure_url;
}

/* =====================================================================
   ROUTER
   ===================================================================== */
const PAGES = {
  home: { title: 'Home', icon: ICON.home, render: renderHome },
  customers: { title: 'Customers', icon: ICON.customers, render: renderCustomers },
  stock: { title: 'Stock', icon: ICON.stock, render: renderStock },
  orders: { title: 'Orders', icon: ICON.orders, render: renderOrders },
  settings: { title: 'Settings', icon: ICON.settings, render: renderSettings },
};
const currentPage = () => { const k = location.hash.replace(/^#\/?/, '').split('?')[0]; return PAGES[k] ? k : 'home'; };

function route() {
  closeAllSheets();
  if (!session) return renderLogin();
  renderShell(currentPage());
  refresh();
}
function refresh() {
  const v = document.getElementById('view');
  if (!v || !session) return;
  Promise.resolve().then(() => PAGES[currentPage()].render(v)).catch((e) => { v.innerHTML = errorBox(e); });
}
function renderShell(name) {
  $app.innerHTML = `
    <header class="topbar"><div><div class="shop">${esc(CONFIG.SHOP_NAME)}</div><h1>${PAGES[name].title}</h1></div><div id="top-actions"></div></header>
    <main id="view" class="view">${spinner()}</main>
    <nav class="tabbar">${Object.entries(PAGES).map(([k, p]) =>
      `<a href="#/${k}" class="${k === name ? 'active' : ''}" ${k === name ? 'aria-current="page"' : ''}>${p.icon}<span>${p.title}</span></a>`).join('')}</nav>`;
}
function setTopAction(label, fn) {
  const el = document.getElementById('top-actions');
  if (!el) return;
  el.innerHTML = label ? `<button class="btn primary sm">${ICON.plus}<span>${esc(label)}</span></button>` : '';
  if (label) el.firstElementChild.onclick = fn;
}

/* =====================================================================
   LOGIN  (mobile number + 6-digit PIN, 5 wrong attempts → 30 min lock)
   ===================================================================== */
const lockedText = (until) => `Too many wrong attempts. Locked until ${fmtTime(until)}.`;

function renderLogin(mode = 'login') {
  const signup = mode === 'signup';
  let lastPhone = '';
  try { lastPhone = localStorage.getItem('lastPhone') || ''; } catch { /* ignore */ }
  $app.innerHTML = `
    <div class="auth"><div class="auth-card">
      <div class="logo">${ICON.stock}</div>
      <h1>${esc(CONFIG.SHOP_NAME)}</h1>
      <p class="muted">${signup ? 'Create your account' : 'Log in with your mobile number and PIN'}</p>
      <form id="lf" class="form" novalidate>
        <label>Mobile number<input name="phone" type="tel" inputmode="numeric" autocomplete="username" maxlength="15" value="${esc(lastPhone)}" required></label>
        <label>${signup ? 'Choose a 6-digit PIN' : '6-digit PIN'}<input name="pin" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>
        ${signup ? '<label>Confirm PIN<input name="pin2" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" required></label>' : ''}
        <div id="lmsg" class="msg" role="alert"></div>
        <button class="btn primary block">${signup ? 'Create account' : 'Log in'}</button>
      </form>
      ${CONFIG.ALLOW_SIGNUP ? `<button class="link-btn" id="toggle">${signup ? 'I already have an account' : 'New here? Create account'}</button>` : ''}
    </div></div>`;

  const form = $app.querySelector('#lf');
  const msg = $app.querySelector('#lmsg');
  const setMsg = (t, type = 'bad') => { msg.textContent = t; msg.className = `msg ${type}`; };
  form.querySelectorAll('.pin').forEach((i) => { i.oninput = () => { i.value = i.value.replace(/\D/g, '').slice(0, 6); }; });
  const tgl = $app.querySelector('#toggle');
  if (tgl) tgl.onclick = () => renderLogin(signup ? 'login' : 'signup');
  (lastPhone ? form.elements.pin : form.elements.phone).focus();

  form.onsubmit = (e) => submit(e, async (d) => {
    const phone = cleanPhone(d.phone);
    if (phone.length < 10 || phone.length > 15) return setMsg('Enter a valid mobile number');
    if (!/^\d{6}$/.test(d.pin)) return setMsg('PIN must be exactly 6 digits');
    try { localStorage.setItem('lastPhone', phone); } catch { /* ignore */ }

    if (signup) {
      if (d.pin !== d.pin2) return setMsg('PINs do not match');
      const { data, error } = await sb.auth.signUp({ email: phoneToEmail(phone), password: d.pin, options: { data: { phone } } });
      if (error) return setMsg(friendly(error));
      if (!data.session) return setMsg('Account created, but Supabase wants email confirmation. Turn OFF "Confirm email" in Supabase → Authentication → Sign In / Providers → Email, then log in.', 'warn');
      return; // auth listener takes over
    }

    const status = await q(sb.rpc('login_status', { p_phone: phone }));
    if (status.locked) return setMsg(lockedText(status.locked_until));

    const { error } = await sb.auth.signInWithPassword({ email: phoneToEmail(phone), password: d.pin });
    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        const r = await q(sb.rpc('record_login_failure', { p_phone: phone }));
        form.elements.pin.value = '';
        return setMsg(r.locked ? lockedText(r.locked_until)
          : `Wrong mobile number or PIN. ${r.remaining} attempt${r.remaining === 1 ? '' : 's'} left.`);
      }
      return setMsg(friendly(error));
    }
    sb.rpc('reset_login_attempts').then(() => {}, () => {});
  });
}

/* =====================================================================
   HOME / DASHBOARD
   ===================================================================== */
const stat = (label, value, sub = '', cls = '') =>
  `<div class="stat ${cls}"><div class="label">${esc(label)}</div><div class="value">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;

function orderStatus(o) {
  const paid = sum(o.payments, (p) => p.amount);
  const due = round2(Number(o.total) - paid);
  if (due <= 0) return { paid, due: 0, label: 'Paid', cls: 'good' };
  return { paid, due, label: paid > 0 ? 'Partial' : 'Due', cls: paid > 0 ? 'warn' : 'bad' };
}
function orderRow(o) {
  const st = orderStatus(o);
  return `<button class="row" data-order="${o.id}">
    <div class="row-main"><div class="row-title">#${o.order_no} · ${esc(o.customers?.name || 'Walk-in')}</div>
    <div class="row-sub">${fmtDateTime(o.created_at)}</div></div>
    <div class="row-end"><div class="amt">${fmt(o.total)}</div><span class="badge ${st.cls}">${st.label}</span></div></button>`;
}
const bindOrderRows = (root) => root.querySelectorAll('[data-order]').forEach((b) => { b.onclick = () => openOrder(b.dataset.order); });

async function renderHome(v) {
  setTopAction('New order', () => openNewOrder());
  const today = startOfDay();
  const [s, recent] = await Promise.all([
    q(sb.rpc('dashboard_stats', { p_day_start: today.toISOString(), p_month_start: startOfMonth().toISOString(), p_month_date: ymd(startOfMonth()) })),
    q(sb.from('orders').select('id, order_no, total, created_at, customers(name), payments(amount)')
      .gte('created_at', today.toISOString()).order('created_at', { ascending: false }).limit(6)),
  ]);
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  v.innerHTML = `
    <p class="muted small" style="margin:0 0 10px">${esc(dateLabel)}</p>
    <div class="stats">
      ${stat('Customers today', num(s.customers_today), `${s.walkins_today} walk-in · ${s.new_customers_today} new`)}
      ${stat('Items sold today', num(s.items_sold_today), `${fmt(s.sales_today)} sales`)}
      ${stat('Money collected today', fmt(s.collected_today), 'cash + UPI + card', 'good')}
      ${stat('Balance amount', fmt(s.balance_total), 'pending from customers', 'warn')}
      ${stat('Sales this month', fmt(s.sales_month), `${s.orders_month} orders · expenses ${fmt(s.expenses_month)}`, 'brand')}
      ${stat('Stock in today', num(s.stock_in_today), s.low_stock ? `<span class="bad-t">${s.low_stock} item${s.low_stock > 1 ? 's' : ''} low on stock</span>` : `${s.stock_in_entries} entries`)}
    </div>
    <div class="quick">
      <button class="btn primary" data-a="order">${ICON.plus}Order</button>
      <button class="btn" data-a="stock">${ICON.plus}Stock</button>
      <button class="btn" data-a="cust">${ICON.plus}Customer</button>
    </div>
    <section class="card">
      <div class="card-head"><h3>Today's orders</h3><a href="#/orders">See all</a></div>
      <div class="list">${recent.length ? recent.map(orderRow).join('') : empty('No orders yet today')}</div>
    </section>`;
  v.querySelector('[data-a=order]').onclick = () => openNewOrder();
  v.querySelector('[data-a=stock]').onclick = () => openItemForm();
  v.querySelector('[data-a=cust]').onclick = () => openCustomerForm();
  bindOrderRows(v);
}

/* =====================================================================
   CUSTOMERS
   ===================================================================== */
const custState = { search: '', onlyDue: false };

async function renderCustomers(v) {
  setTopAction('Add', () => openCustomerForm());
  v.innerHTML = `
    <div class="toolbar">
      <input type="search" id="c-search" placeholder="Search name or phone" value="${esc(custState.search)}">
      <label class="chip"><input type="checkbox" id="c-due" ${custState.onlyDue ? 'checked' : ''}> Balance due</label>
    </div>
    <div id="c-sum"></div><div id="c-list" class="list">${spinner()}</div>`;
  const all = await q(sb.from('customer_balances').select('*').order('name'));
  const draw = () => {
    const s = custState.search.trim().toLowerCase();
    const list = all.filter((c) => (!s || c.name.toLowerCase().includes(s) || (c.phone || '').includes(s)) && (!custState.onlyDue || Number(c.balance) > 0));
    v.querySelector('#c-sum').innerHTML = summaryBox([['Customers', list.length], ['Total due', fmt(sum(list, (c) => Math.max(0, c.balance)))]]);
    v.querySelector('#c-list').innerHTML = list.length ? list.map((c) => `
      <button class="row" data-cust="${c.id}">
        <div class="avatar">${esc(initials(c.name))}</div>
        <div class="row-main"><div class="row-title">${esc(c.name)}</div>
          <div class="row-sub">${esc(c.phone || 'No phone')}${c.last_order ? ` · last ${fmtDay(c.last_order)}` : ''}</div></div>
        <div class="row-end">${Number(c.balance) > 0 ? `<div class="amt bad-t">${fmt(c.balance)}</div><div class="row-sub">due</div>` : '<span class="badge good">Clear</span>'}</div>
      </button>`).join('') : empty(all.length ? 'No customers match' : 'No customers yet — tap Add');
    v.querySelectorAll('[data-cust]').forEach((b) => { b.onclick = () => openCustomer(b.dataset.cust); });
  };
  v.querySelector('#c-search').oninput = (e) => { custState.search = e.target.value; draw(); };
  v.querySelector('#c-due').onchange = (e) => { custState.onlyDue = e.target.checked; draw(); };
  draw();
}

function openCustomerForm(c = null, onSaved) {
  openSheet(c ? 'Edit customer' : 'New customer', `
    <form class="form" id="cf">
      <label>Name<input name="name" required value="${esc(c?.name)}" autocomplete="off"></label>
      <label>Mobile number<input name="phone" type="tel" inputmode="numeric" value="${esc(c?.phone)}"></label>
      <label>Address<textarea name="address" rows="2">${esc(c?.address)}</textarea></label>
      <button class="btn primary block">Save</button>
      ${c ? '<button type="button" class="btn danger-t block" id="c-del">Delete customer</button>' : ''}
    </form>`, (body) => {
    body.querySelector('[name=name]').focus();
    body.querySelector('#cf').onsubmit = (e) => submit(e, async (d) => {
      if (!d.name.trim()) throw new Error('Enter a name');
      const row = { name: d.name.trim(), phone: cleanPhone(d.phone) || null, address: d.address.trim() || null };
      const saved = c
        ? await q(sb.from('customers').update(row).eq('id', c.id).select().single())
        : await q(sb.from('customers').insert(row).select().single());
      closeSheet();
      toast('Customer saved');
      if (onSaved) onSaved(saved); else refresh();
    });
    const del = body.querySelector('#c-del');
    if (del) del.onclick = () => guarded(async () => {
      if (!confirm(`Delete ${c.name}? Their orders stay but won't be linked to them.`)) return;
      await q(sb.from('customers').delete().eq('id', c.id));
      closeAllSheets(); toast('Customer deleted'); refresh();
    });
  });
}

function openCustomer(id) {
  openSheet('Customer', spinner(), async (body) => {
    const [c, orders, pays] = await Promise.all([
      q(sb.from('customer_balances').select('*').eq('id', id).single()),
      q(sb.from('orders').select('id, order_no, total, created_at, payments(amount)').eq('customer_id', id).order('created_at', { ascending: false }).limit(50)),
      q(sb.from('payments').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(50)),
    ]);
    const bal = Number(c.balance);
    const reminder = `Hello ${c.name}, this is a reminder from ${CONFIG.SHOP_NAME}. Your pending balance is ${fmt(bal)}. Thank you!`;
    body.innerHTML = `
      <div class="profile"><div class="avatar lg">${esc(initials(c.name))}</div>
        <div><h3>${esc(c.name)}</h3>
          <div class="muted">${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : 'No phone'}</div>
          ${c.address ? `<div class="muted small">${esc(c.address)}</div>` : ''}</div></div>
      <div class="mini-stats">
        <div><span>Billed</span><b>${fmt(c.total_billed)}</b></div>
        <div><span>Paid</span><b class="good-t">${fmt(c.total_paid)}</b></div>
        <div><span>Balance</span><b class="${bal > 0 ? 'bad-t' : ''}">${fmt(bal)}</b></div>
      </div>
      <div class="btn-row">
        <button class="btn primary" data-a="pay">Receive payment</button>
        <button class="btn" data-a="order">New order</button>
        <button class="btn" data-a="edit">Edit</button>
      </div>
      ${c.phone && bal > 0 ? `<a class="btn block" href="${waLink(c.phone, reminder)}" target="_blank" rel="noopener">Send balance reminder on WhatsApp</a>` : ''}
      <h4>Orders (${orders.length})</h4>
      <div class="list">${orders.length ? orders.map((o) => orderRow({ ...o, customers: { name: c.name } })).join('') : empty('No orders yet')}</div>
      <h4>Payments</h4>
      <div class="list">${pays.length ? pays.map((p) => `
        <div class="row static"><div class="row-main"><div class="row-title">${fmt(p.amount)} · ${esc(p.method.toUpperCase())}</div>
        <div class="row-sub">${fmtDateTime(p.created_at)}${p.order_id ? ' · with order' : ''}${p.note ? ` · ${esc(p.note)}` : ''}</div></div></div>`).join('') : empty('No payments yet')}</div>`;
    body.querySelector('[data-a=pay]').onclick = () => openPaymentForm({
      customerId: id, suggested: Math.max(bal, 0),
      onSaved: () => { closeAllSheets(); refresh(); openCustomer(id); },
    });
    body.querySelector('[data-a=order]').onclick = () => openNewOrder(id);
    body.querySelector('[data-a=edit]').onclick = () => openCustomerForm(c, () => { closeAllSheets(); refresh(); openCustomer(id); });
    bindOrderRows(body);
  });
}

function openPaymentForm({ customerId = null, orderId = null, suggested = 0, onSaved }) {
  openSheet('Receive payment', `
    <form class="form" id="pf">
      <label>Amount<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${suggested > 0 ? round2(suggested) : ''}"></label>
      <label>Method<select name="method">${methodOptions()}</select></label>
      <label>Note<input name="note" placeholder="Optional"></label>
      <button class="btn primary block">Save payment</button>
    </form>`, (body) => {
    body.querySelector('[name=amount]').focus();
    body.querySelector('#pf').onsubmit = (e) => submit(e, async (d) => {
      const amount = round2(d.amount);
      if (!(amount > 0)) throw new Error('Enter an amount');
      await q(sb.from('payments').insert({ customer_id: customerId, order_id: orderId, amount, method: d.method, note: d.note.trim() || null }));
      toast(`${fmt(amount)} received`);
      if (onSaved) onSaved(); else { closeSheet(); refresh(); }
    });
  });
}

/* =====================================================================
   STOCK
   ===================================================================== */
const stockState = { tab: 'items', search: '', cat: '', low: false, from: ymd(new Date()), to: ymd(new Date()), inSearch: '' };
const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen', 'metre', 'set', 'pair'];

async function renderStock(v) {
  setTopAction('New item', () => openItemForm());
  v.innerHTML = `
    <div class="seg"><button data-tab="items" class="${stockState.tab === 'items' ? 'on' : ''}">Items</button>
    <button data-tab="in" class="${stockState.tab === 'in' ? 'on' : ''}">Stock in history</button></div>
    <div id="s-body">${spinner()}</div>`;
  v.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { stockState.tab = b.dataset.tab; refresh(); }; });
  const box = v.querySelector('#s-body');
  if (stockState.tab === 'items') await drawItems(box); else await drawStockIn(box);
}

async function drawItems(box) {
  const items = await q(sb.from('items').select('*').order('name'));
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
  box.innerHTML = `
    <div class="toolbar">
      <input type="search" id="s-search" placeholder="Search items" value="${esc(stockState.search)}">
      <select id="s-cat"><option value="">All categories</option>${cats.map((c) => `<option ${c === stockState.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <label class="chip"><input type="checkbox" id="s-low" ${stockState.low ? 'checked' : ''}> Low stock</label>
    </div>
    <div id="s-sum"></div><div id="s-grid" class="grid-items"></div>`;
  const draw = () => {
    const s = stockState.search.trim().toLowerCase();
    const list = items.filter((i) => (!s || i.name.toLowerCase().includes(s) || (i.category || '').toLowerCase().includes(s))
      && (!stockState.cat || i.category === stockState.cat) && (!stockState.low || Number(i.qty) <= Number(i.low_stock_at)));
    box.querySelector('#s-sum').innerHTML = summaryBox([
      ['Items', list.length],
      ['Low stock', list.filter((i) => Number(i.qty) <= Number(i.low_stock_at)).length],
      ['Stock value (cost)', fmt(sum(list, (i) => Math.max(0, i.qty) * i.cost_price))],
      ['Stock value (sale)', fmt(sum(list, (i) => Math.max(0, i.qty) * i.sell_price))],
    ]);
    const grid = box.querySelector('#s-grid');
    grid.style.display = list.length ? '' : 'block';
    grid.innerHTML = list.length ? list.map((i) => {
      const low = Number(i.qty) <= Number(i.low_stock_at);
      return `<button class="item-card" data-item="${i.id}">${itemImg(i, 300)}
        <div class="item-info"><div class="item-name">${esc(i.name)}</div><div class="item-price">${fmt(i.sell_price)} / ${esc(i.unit)}</div>
        <div><span class="badge ${low ? 'bad' : 'good'}">${num(i.qty)} ${esc(i.unit)}</span></div></div></button>`;
    }).join('') : empty(items.length ? 'No items match' : 'No items yet — tap New item');
    grid.querySelectorAll('[data-item]').forEach((b) => { b.onclick = () => openItem(b.dataset.item); });
  };
  box.querySelector('#s-search').oninput = (e) => { stockState.search = e.target.value; draw(); };
  box.querySelector('#s-cat').onchange = (e) => { stockState.cat = e.target.value; draw(); };
  box.querySelector('#s-low').onchange = (e) => { stockState.low = e.target.checked; draw(); };
  draw();
}

async function drawStockIn(box) {
  box.innerHTML = `
    <div class="card filters">
      <div class="grid2"><label>From<input type="date" id="si-from" value="${stockState.from}"></label>
      <label>To<input type="date" id="si-to" value="${stockState.to}"></label></div>
      <input type="search" id="si-search" placeholder="Filter by item name" value="${esc(stockState.inSearch)}">
    </div>
    <div id="si-sum"></div><div id="si-list" class="list">${spinner()}</div>`;
  let rows = [];
  const draw = () => {
    const s = stockState.inSearch.trim().toLowerCase();
    const list = rows.filter((r) => !s || (r.items?.name || '').toLowerCase().includes(s));
    box.querySelector('#si-sum').innerHTML = summaryBox([
      ['Entries', list.length], ['Units in', num(sum(list, (r) => r.qty))], ['Purchase value', fmt(sum(list, (r) => r.qty * (r.cost_price || 0)))],
    ]);
    box.querySelector('#si-list').innerHTML = list.length ? list.map((r) => `
      <button class="row" data-item="${r.item_id}">${itemImg(r.items, 100, 'sm')}
        <div class="row-main"><div class="row-title">${esc(r.items?.name || 'Deleted item')}</div>
        <div class="row-sub">${fmtDateTime(r.created_at)}${r.note ? ` · ${esc(r.note)}` : ''}</div></div>
        <div class="row-end"><div class="amt good-t">+${num(r.qty)} ${esc(r.items?.unit || '')}</div>
        ${r.cost_price != null ? `<div class="row-sub">@ ${fmt(r.cost_price)}</div>` : ''}</div></button>`).join('') : empty('No stock added in this period');
    box.querySelectorAll('[data-item]').forEach((b) => { b.onclick = () => openItem(b.dataset.item); });
  };
  const load = async () => {
    if (stockState.from > stockState.to) return toast('"From" date is after "To" date', 'bad');
    const [from, to] = dayRange(stockState.from, stockState.to);
    rows = await q(sb.from('stock_entries').select('*, items(name, unit, image_url)').gte('created_at', from).lt('created_at', to)
      .order('created_at', { ascending: false }).limit(1000));
    draw();
  };
  box.querySelector('#si-from').onchange = (e) => { stockState.from = e.target.value; guarded(load); };
  box.querySelector('#si-to').onchange = (e) => { stockState.to = e.target.value; guarded(load); };
  box.querySelector('#si-search').oninput = (e) => { stockState.inSearch = e.target.value; draw(); };
  await load();
}

function openItem(id) {
  openSheet('Item', spinner(), async (body) => {
    const [it, entries, sold] = await Promise.all([
      q(sb.from('items').select('*').eq('id', id).single()),
      q(sb.from('stock_entries').select('*').eq('item_id', id).order('created_at', { ascending: false }).limit(15)),
      q(sb.from('order_items').select('qty').eq('item_id', id).gte('created_at', startOfMonth().toISOString())),
    ]);
    const low = Number(it.qty) <= Number(it.low_stock_at);
    body.innerHTML = `
      <div class="item-hero">${it.image_url ? `<img src="${esc(thumb(it.image_url, 800))}" alt="">` : `<div class="ph">${esc(initials(it.name))}</div>`}</div>
      <h3>${esc(it.name)}</h3><div class="muted small">${esc(it.category || 'No category')}</div>
      <div class="mini-stats">
        <div><span>In stock</span><b class="${low ? 'bad-t' : ''}">${num(it.qty)} ${esc(it.unit)}</b></div>
        <div><span>Sell / Cost</span><b>${fmt(it.sell_price)}</b><span>${fmt(it.cost_price)}</span></div>
        <div><span>Sold this month</span><b>${num(sum(sold, (s) => s.qty))}</b></div>
      </div>
      <form class="form card-inset" id="sf">
        <h3>Add stock</h3>
        <div class="grid2"><label>Quantity (${esc(it.unit)})<input name="qty" type="number" step="any" min="0" inputmode="decimal" required></label>
        <label>Cost per ${esc(it.unit)}<input name="cost" type="number" step="0.01" min="0" inputmode="decimal" value="${Number(it.cost_price) || ''}"></label></div>
        <label>Note<input name="note" placeholder="Supplier, bill no. (optional)"></label>
        <button class="btn primary block">Add to stock</button>
      </form>
      <div class="btn-row"><button class="btn" id="i-edit">Edit item</button></div>
      <h4>Recent stock in</h4>
      <div class="list">${entries.length ? entries.map((en) => `
        <div class="row static"><div class="row-main"><div class="row-title">+${num(en.qty)} ${esc(it.unit)}${en.cost_price != null ? ` @ ${fmt(en.cost_price)}` : ''}</div>
        <div class="row-sub">${fmtDateTime(en.created_at)}${en.note ? ` · ${esc(en.note)}` : ''}</div></div>
        <button class="icon-btn" data-del="${en.id}" aria-label="Remove entry">${ICON.close}</button></div>`).join('') : empty('No stock entries yet')}</div>`;
    const reopen = () => { closeAllSheets(); refresh(); openItem(id); };
    body.querySelector('#sf').onsubmit = (e) => submit(e, async (d) => {
      const qty = Number(d.qty);
      if (!(qty > 0)) throw new Error('Enter a quantity');
      await q(sb.from('stock_entries').insert({ item_id: id, qty, cost_price: d.cost === '' ? null : round2(d.cost), note: d.note.trim() || null }));
      toast(`Added ${num(qty)} ${it.unit}`);
      reopen();
    });
    body.querySelector('#i-edit').onclick = () => openItemForm(it);
    body.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => guarded(async () => {
      if (!confirm('Remove this stock entry? The quantity will be taken off stock.')) return;
      await q(sb.from('stock_entries').delete().eq('id', b.dataset.del));
      toast('Entry removed'); reopen();
    }); });
  });
}

function openItemForm(it = null) {
  openSheet(it ? 'Edit item' : 'New item', `
    <form class="form" id="itf">
      <label class="img-pick"><input type="file" name="image" accept="image/*" hidden>
        <div class="img-preview" id="itf-prev">${it?.image_url ? `<img src="${esc(thumb(it.image_url, 500))}" alt="">` : `${ICON.image}<span>Add photo</span>`}</div></label>
      ${it?.image_url ? '<label class="check"><input type="checkbox" name="remove_image"> Remove photo</label>' : ''}
      <label>Item name<input name="name" required value="${esc(it?.name)}" autocomplete="off"></label>
      <div class="grid2">
        <label>Category<input name="category" list="cat-list" value="${esc(it?.category)}" autocomplete="off"></label>
        <label>Unit<select name="unit">${UNITS.map((u) => `<option ${u === (it?.unit || 'pcs') ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      </div>
      <datalist id="cat-list"></datalist>
      <div class="grid2">
        <label>Selling price<input name="sell_price" type="number" step="0.01" min="0" inputmode="decimal" required value="${it?.sell_price ?? ''}"></label>
        <label>Cost price<input name="cost_price" type="number" step="0.01" min="0" inputmode="decimal" value="${it?.cost_price ?? ''}"></label>
      </div>
      <div class="grid2">
        ${it ? '' : '<label>Opening stock<input name="opening" type="number" step="any" min="0" inputmode="decimal" value="0"></label>'}
        <label>Low-stock alert at<input name="low_stock_at" type="number" step="any" min="0" inputmode="decimal" value="${it?.low_stock_at ?? 5}"></label>
      </div>
      <div id="itf-status" class="msg"></div>
      <button class="btn primary block">${it ? 'Save changes' : 'Add item'}</button>
      ${it ? '<button type="button" class="btn danger-t block" id="itf-del">Delete item</button>' : ''}
    </form>`, (body) => {
    const form = body.querySelector('#itf');
    const fileIn = form.elements.image;
    const status = body.querySelector('#itf-status');
    fileIn.onchange = () => {
      const f = fileIn.files[0];
      if (f) body.querySelector('#itf-prev').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`;
    };
    sb.from('items').select('category').not('category', 'is', null).then(({ data }) => {
      const cats = [...new Set((data || []).map((r) => r.category))].sort();
      body.querySelector('#cat-list').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');
    });
    form.onsubmit = (e) => submit(e, async (d) => {
      if (!d.name.trim()) throw new Error('Enter an item name');
      let image_url = it?.image_url || null;
      if (d.remove_image) image_url = null;
      const file = fileIn.files[0];
      if (file) {
        status.className = 'msg'; status.textContent = 'Uploading photo…';
        try { image_url = await uploadToCloudinary(file); } finally { status.textContent = ''; }
      }
      const row = {
        name: d.name.trim(), category: d.category.trim() || null, unit: d.unit,
        sell_price: round2(d.sell_price), cost_price: round2(d.cost_price), low_stock_at: Number(d.low_stock_at) || 0, image_url,
      };
      if (it) {
        await q(sb.from('items').update(row).eq('id', it.id));
        toast('Item updated');
        closeAllSheets(); refresh(); openItem(it.id);
      } else {
        const created = await q(sb.from('items').insert(row).select().single());
        const opening = Number(d.opening) || 0;
        if (opening > 0) {
          await q(sb.from('stock_entries').insert({ item_id: created.id, qty: opening, cost_price: row.cost_price || null, note: 'Opening stock' }));
        }
        toast('Item added');
        closeAllSheets();
        if (currentPage() === 'stock') refresh(); else location.hash = '#/stock';
      }
    });
    const del = body.querySelector('#itf-del');
    if (del) del.onclick = () => guarded(async () => {
      if (!confirm(`Delete "${it.name}"? Its stock history is removed; past orders keep the item name.`)) return;
      await q(sb.from('items').delete().eq('id', it.id));
      closeAllSheets(); toast('Item deleted'); refresh();
    });
  });
}

/* =====================================================================
   ORDERS
   ===================================================================== */
const orderState = { from: ymd(startOfMonth()), to: ymd(new Date()), customer: '', item: '', range: 'month' };
const RANGES = {
  today: ['Today', () => [new Date(), new Date()]],
  yesterday: ['Yesterday', () => [addDays(new Date(), -1), addDays(new Date(), -1)]],
  week: ['Last 7 days', () => [addDays(new Date(), -6), new Date()]],
  month: ['This month', () => [startOfMonth(), new Date()]],
  lastmonth: ['Last month', () => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth() - 1, 1); return [s, new Date(n.getFullYear(), n.getMonth(), 0)]; }],
};

async function renderOrders(v) {
  setTopAction('New order', () => openNewOrder());
  const [customers, items] = await Promise.all([
    q(sb.from('customers').select('id, name').order('name')),
    q(sb.from('items').select('id, name').order('name')),
  ]);
  v.innerHTML = `
    <div class="card filters">
      <div class="chips">${Object.entries(RANGES).map(([k, [label]]) => `<button data-r="${k}" class="${orderState.range === k ? 'on' : ''}">${label}</button>`).join('')}</div>
      <div class="grid2"><label>From<input type="date" id="o-from" value="${orderState.from}"></label>
      <label>To<input type="date" id="o-to" value="${orderState.to}"></label></div>
      <div class="grid2">
        <label>Customer<select id="o-cust"><option value="">All customers</option><option value="walkin" ${orderState.customer === 'walkin' ? 'selected' : ''}>Walk-in only</option>
          ${customers.map((c) => `<option value="${c.id}" ${orderState.customer === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label>Product<select id="o-item"><option value="">All products</option>
          ${items.map((i) => `<option value="${i.id}" ${orderState.item === i.id ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select></label>
      </div>
    </div>
    <div id="o-sum"></div><div id="o-prod"></div><div id="o-list" class="list">${spinner()}</div>`;

  const load = async () => {
    if (orderState.from > orderState.to) return toast('"From" date is after "To" date', 'bad');
    const [from, to] = dayRange(orderState.from, orderState.to);
    v.querySelector('#o-list').innerHTML = spinner();
    let query = sb.from('orders').select('id, order_no, total, created_at, customer_id, customers(name), payments(amount), order_items(item_id, item_name, qty, price)')
      .gte('created_at', from).lt('created_at', to).order('created_at', { ascending: false }).limit(1000);
    if (orderState.customer === 'walkin') query = query.is('customer_id', null);
    else if (orderState.customer) query = query.eq('customer_id', orderState.customer);
    if (orderState.item) {
      const hits = await q(sb.from('order_items').select('order_id').eq('item_id', orderState.item).gte('created_at', from).lt('created_at', to).limit(1000));
      const ids = [...new Set(hits.map((h) => h.order_id))];
      if (!ids.length) return drawOrders([]);
      query = query.in('id', ids);
    }
    drawOrders(await q(query));
  };

  const drawOrders = (orders) => {
    const lines = orders.flatMap((o) => (o.order_items || []).filter((l) => !orderState.item || l.item_id === orderState.item));
    const sales = sum(orders, (o) => o.total);
    const collected = sum(orders, (o) => sum(o.payments, (p) => p.amount));
    v.querySelector('#o-sum').innerHTML = summaryBox([
      ['Orders', orders.length], ['Sales', fmt(sales)], ['Collected', fmt(collected)], ['Due', fmt(Math.max(sales - collected, 0))],
    ]);
    const byProduct = {};
    lines.forEach((l) => { const p = (byProduct[l.item_name] ||= { qty: 0, amount: 0 }); p.qty += Number(l.qty); p.amount += l.qty * l.price; });
    const prods = Object.entries(byProduct).sort((a, b) => b[1].amount - a[1].amount);
    v.querySelector('#o-prod').innerHTML = prods.length ? `
      <details class="card"><summary>Products sold (${prods.length}) · ${num(sum(prods, (p) => p[1].qty))} units</summary>
        <table class="lines" style="margin-top:8px"><tr><th>Product</th><th class="r">Qty</th><th class="r">Amount</th></tr>
        ${prods.map(([n, p]) => `<tr><td>${esc(n)}</td><td class="r">${num(p.qty)}</td><td class="r">${fmt(p.amount)}</td></tr>`).join('')}</table>
      </details>` : '';
    v.querySelector('#o-list').innerHTML = orders.length ? orders.map(orderRow).join('') : empty('No orders found for these filters');
    bindOrderRows(v.querySelector('#o-list'));
  };

  v.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => {
    const [f, t] = RANGES[b.dataset.r][1]();
    Object.assign(orderState, { from: ymd(f), to: ymd(t), range: b.dataset.r });
    v.querySelector('#o-from').value = orderState.from; v.querySelector('#o-to').value = orderState.to;
    v.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x === b));
    guarded(load);
  }; });
  const custom = () => { orderState.range = ''; v.querySelectorAll('[data-r]').forEach((x) => x.classList.remove('on')); };
  v.querySelector('#o-from').onchange = (e) => { orderState.from = e.target.value; custom(); guarded(load); };
  v.querySelector('#o-to').onchange = (e) => { orderState.to = e.target.value; custom(); guarded(load); };
  v.querySelector('#o-cust').onchange = (e) => { orderState.customer = e.target.value; guarded(load); };
  v.querySelector('#o-item').onchange = (e) => { orderState.item = e.target.value; guarded(load); };
  await load();
}

function openOrder(id) {
  openSheet('Order', spinner(), async (body) => {
    const o = await q(sb.from('orders').select('*, customers(id, name, phone), order_items(*), payments(*)').eq('id', id).single());
    const st = orderStatus(o);
    const lines = o.order_items || [];
    const receipt = [
      `*${CONFIG.SHOP_NAME}*`, `Order #${o.order_no} · ${fmtDay(o.created_at)}`, '',
      ...lines.map((l) => `${l.item_name} × ${num(l.qty)} @ ${fmt(l.price)} = ${fmt(l.qty * l.price)}`), '',
      ...(Number(o.discount) > 0 ? [`Discount: ${fmt(o.discount)}`] : []),
      `*Total: ${fmt(o.total)}*`, `Paid: ${fmt(st.paid)}`, ...(st.due > 0 ? [`Balance: ${fmt(st.due)}`] : []), '', 'Thank you!',
    ].join('\n');
    body.innerHTML = `
      <div class="card-head"><div><h3>Order #${o.order_no}</h3><div class="muted small">${fmtDateTime(o.created_at)}</div></div>
        <span class="badge ${st.cls}">${st.label}</span></div>
      <div class="row static" ${o.customers ? `data-cust="${o.customers.id}" style="cursor:pointer"` : ''}>
        <div class="avatar">${esc(initials(o.customers?.name || 'W'))}</div>
        <div class="row-main"><div class="row-title">${esc(o.customers?.name || 'Walk-in customer')}</div>
        <div class="row-sub">${esc(o.customers?.phone || '')}</div></div></div>
      <table class="lines" style="margin-top:10px"><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr>
        ${lines.map((l) => `<tr><td>${esc(l.item_name)}</td><td class="r">${num(l.qty)}</td><td class="r">${fmt(l.price)}</td><td class="r">${fmt(l.qty * l.price)}</td></tr>`).join('')}</table>
      <div class="totals">
        ${Number(o.discount) > 0 ? `<div><span class="muted">Subtotal</span><span>${fmt(o.subtotal)}</span></div><div><span class="muted">Discount</span><span>− ${fmt(o.discount)}</span></div>` : ''}
        <div class="big"><span>Total</span><span>${fmt(o.total)}</span></div>
        <div><span class="muted">Paid</span><span class="good-t">${fmt(st.paid)}</span></div>
        ${st.due > 0 ? `<div><span class="muted">Balance</span><b class="bad-t">${fmt(st.due)}</b></div>` : ''}
      </div>
      ${o.note ? `<p class="muted small">Note: ${esc(o.note)}</p>` : ''}
      ${(o.payments || []).length ? `<h4>Payments</h4><div class="list">${o.payments.map((p) => `<div class="row static"><div class="row-main"><div class="row-title">${fmt(p.amount)} · ${esc(p.method.toUpperCase())}</div><div class="row-sub">${fmtDateTime(p.created_at)}</div></div></div>`).join('')}</div>` : ''}
      <div class="btn-row">
        ${st.due > 0 ? '<button class="btn primary" data-a="pay">Receive payment</button>' : ''}
        <a class="btn" href="${waLink(o.customers?.phone || '', receipt)}" target="_blank" rel="noopener">Share on WhatsApp</a>
      </div>
      <button class="btn danger-t block" data-a="del">Delete order</button>`;
    const pay = body.querySelector('[data-a=pay]');
    if (pay) pay.onclick = () => openPaymentForm({ customerId: o.customer_id, orderId: o.id, suggested: st.due, onSaved: () => { closeAllSheets(); refresh(); openOrder(id); } });
    const custRow = body.querySelector('[data-cust]');
    if (custRow) custRow.onclick = () => openCustomer(custRow.dataset.cust);
    body.querySelector('[data-a=del]').onclick = () => guarded(async () => {
      if (!confirm(`Delete order #${o.order_no}? Items go back into stock and its payments are removed.`)) return;
      await q(sb.rpc('delete_order', { p_order_id: o.id }));
      closeAllSheets(); toast('Order deleted'); refresh();
    });
  });
}

function openNewOrder(preCustomerId = null) {
  openSheet('New order', spinner(), async (body) => {
    const [customers, items] = await Promise.all([
      q(sb.from('customers').select('id, name, phone').order('name')),
      q(sb.from('items').select('*').order('name')),
    ]);
    const cart = []; // { item_id, name, unit, price, qty, max }
    let paidTouched = false;
    body.innerHTML = `
      <form class="form" id="nof">
        <label>Customer
          <div class="input-row"><select name="customer_id" id="no-cust"><option value="">Walk-in customer</option>
            ${customers.map((c) => `<option value="${c.id}" ${c.id === preCustomerId ? 'selected' : ''}>${esc(c.name)}${c.phone ? ` · ${esc(c.phone)}` : ''}</option>`).join('')}</select>
          <button type="button" class="btn" id="no-addc" aria-label="New customer">${ICON.plus}</button></div>
        </label>
        <div class="picker"><input type="search" id="no-search" placeholder="Search items to add…" autocomplete="off"><div id="no-results" class="results"></div></div>
        <div id="no-cart" class="cart"></div>
        <div class="grid2">
          <label>Discount<input name="discount" id="no-disc" type="number" step="0.01" min="0" inputmode="decimal" value="0"></label>
          <label>Paid now<input name="paid" id="no-paid" type="number" step="0.01" min="0" inputmode="decimal" value="0"></label>
        </div>
        <div class="grid2">
          <label>Payment method<select name="method">${methodOptions()}</select></label>
          <label>Note<input name="note" placeholder="Optional"></label>
        </div>
        <div class="total-bar">
          <div><span class="muted small">Total</span><b id="no-total">${fmt(0)}</b></div>
          <div><span class="muted small">Balance</span><b id="no-due">${fmt(0)}</b></div>
          <button class="btn primary">Save order</button>
        </div>
      </form>`;
    const $ = (s) => body.querySelector(s);
    const custSel = $('#no-cust'), searchEl = $('#no-search'), resultsEl = $('#no-results'), cartEl = $('#no-cart');
    const discEl = $('#no-disc'), paidEl = $('#no-paid');

    const total = () => Math.max(round2(sum(cart, (l) => l.qty * l.price) - (Number(discEl.value) || 0)), 0);
    const updateTotals = () => {
      const t = total();
      if (!paidTouched) paidEl.value = t;
      $('#no-total').textContent = fmt(t);
      const due = Math.max(t - (Number(paidEl.value) || 0), 0);
      $('#no-due').textContent = fmt(due);
      $('#no-due').className = due > 0 ? 'bad-t' : '';
    };
    const drawCart = () => {
      cartEl.innerHTML = cart.length ? cart.map((l, i) => `
        <div class="cart-line ${l.qty > l.max ? 'over' : ''}" data-i="${i}">
          <div class="cl-main"><div class="row-title">${esc(l.name)}</div>
            <div class="cl-ctrls">
              <div class="stepper"><button type="button" data-dec aria-label="Less">−</button>
                <input type="number" step="any" min="0" inputmode="decimal" value="${l.qty}" data-qty aria-label="Quantity">
                <button type="button" data-inc aria-label="More">+</button></div>
              <span class="muted">×</span>
              <input class="price-in" type="number" step="0.01" min="0" inputmode="decimal" value="${l.price}" data-price aria-label="Price">
            </div>
            <div class="row-sub">${num(l.max)} ${esc(l.unit)} in stock</div></div>
          <div class="cl-end"><button type="button" class="icon-btn" data-rm aria-label="Remove">${ICON.close}</button><b data-lt>${fmt(l.qty * l.price)}</b></div>
        </div>`).join('') : '<div class="empty small">No items yet — search above to add.</div>';
      cartEl.querySelectorAll('.cart-line').forEach((row) => {
        const l = cart[Number(row.dataset.i)];
        const lt = row.querySelector('[data-lt]');
        const onEdit = () => { lt.textContent = fmt(l.qty * l.price); row.classList.toggle('over', l.qty > l.max); updateTotals(); };
        row.querySelector('[data-qty]').oninput = (e) => { l.qty = Number(e.target.value) || 0; onEdit(); };
        row.querySelector('[data-price]').oninput = (e) => { l.price = Number(e.target.value) || 0; onEdit(); };
        row.querySelector('[data-inc]').onclick = () => { l.qty = Math.min(l.qty + 1, l.max); drawCart(); };
        row.querySelector('[data-dec]').onclick = () => { l.qty = Math.max(l.qty - 1, 0); drawCart(); };
        row.querySelector('[data-rm]').onclick = () => { cart.splice(Number(row.dataset.i), 1); drawCart(); };
      });
      updateTotals();
    };
    const addItem = (it) => {
      const existing = cart.find((l) => l.item_id === it.id);
      if (existing) existing.qty = Math.min(existing.qty + 1, Number(it.qty));
      else cart.push({ item_id: it.id, name: it.name, unit: it.unit, price: Number(it.sell_price), qty: Math.min(1, Number(it.qty)), max: Number(it.qty) });
      searchEl.value = ''; resultsEl.innerHTML = '';
      drawCart();
    };
    const matches = () => {
      const s = searchEl.value.trim().toLowerCase();
      return s ? items.filter((i) => i.name.toLowerCase().includes(s) || (i.category || '').toLowerCase().includes(s)).slice(0, 8) : [];
    };
    searchEl.oninput = () => {
      const m = matches();
      resultsEl.innerHTML = searchEl.value.trim() ? (m.map((i) => `
        <button type="button" class="result" data-add="${i.id}" ${Number(i.qty) <= 0 ? 'disabled' : ''}>${itemImg(i, 100, 'sm')}
          <div class="row-main"><div class="row-title">${esc(i.name)}</div>
          <div class="row-sub">${Number(i.qty) <= 0 ? 'Out of stock' : `${num(i.qty)} ${esc(i.unit)} in stock`}</div></div>
          <b>${fmt(i.sell_price)}</b></button>`).join('') || empty('No matching items')) : '';
      resultsEl.querySelectorAll('[data-add]').forEach((b) => { b.onclick = () => addItem(items.find((i) => i.id === b.dataset.add)); });
    };
    searchEl.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const first = matches().find((i) => Number(i.qty) > 0);
      if (first) addItem(first);
    };
    discEl.oninput = updateTotals;
    paidEl.oninput = () => { paidTouched = true; updateTotals(); };
    $('#no-addc').onclick = () => openCustomerForm(null, (saved) => {
      customers.push(saved);
      custSel.insertAdjacentHTML('beforeend', `<option value="${saved.id}">${esc(saved.name)}</option>`);
      custSel.value = saved.id;
    });
    drawCart();

    $('#nof').onsubmit = (e) => submit(e, async (d) => {
      const lines = cart.filter((l) => l.qty > 0);
      if (!lines.length) throw new Error('Add at least one item');
      const over = lines.find((l) => l.qty > l.max);
      if (over) throw new Error(`Only ${num(over.max)} ${over.unit} of "${over.name}" in stock`);
      const t = total();
      const paid = round2(d.paid);
      if (!d.customer_id && paid < t) throw new Error('Walk-in orders must be paid in full. Choose a customer to keep a balance.');
      const orderId = await q(sb.rpc('create_order', {
        p_customer_id: d.customer_id || null,
        p_items: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, price: l.price })),
        p_discount: round2(d.discount), p_paid: paid, p_method: d.method, p_note: d.note.trim() || null,
      }));
      closeAllSheets();
      toast('Order saved');
      refresh();
      openOrder(orderId);
    });
  });
}

/* =====================================================================
   SETTINGS  (expenses, change PIN, logout)
   ===================================================================== */
let expMonth = ymd(new Date()).slice(0, 7);
const EXPENSE_CATS = ['Rent', 'Salary', 'Electricity', 'Transport', 'Purchase', 'Tea / Snacks', 'Maintenance', 'Internet / Phone', 'Other'];

async function renderSettings(v) {
  setTopAction(null);
  v.innerHTML = `
    <section class="card"><div class="profile"><div class="avatar lg">${esc(initials(CONFIG.SHOP_NAME))}</div>
      <div><h3>${esc(CONFIG.SHOP_NAME)}</h3><div class="muted">Logged in as ${esc(myPhone())}</div></div></div></section>

    <section class="card">
      <div class="card-head"><h3>Expenses</h3><input type="month" id="e-month" value="${expMonth}" style="width:auto"></div>
      <form class="form card-inset" id="ef">
        <div class="grid2">
          <label>Category<input name="category" list="exp-cats" required placeholder="e.g. Rent" autocomplete="off"></label>
          <label>Amount<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" required></label>
        </div>
        <datalist id="exp-cats">${EXPENSE_CATS.map((c) => `<option value="${c}">`).join('')}</datalist>
        <div class="grid2">
          <label>Date<input name="spent_on" type="date" value="${ymd(new Date())}" required></label>
          <label>Note<input name="note" placeholder="Optional"></label>
        </div>
        <button class="btn primary block">Add expense</button>
      </form>
      <div id="e-sum" style="margin-top:12px"></div>
      <div id="e-list" class="list">${spinner()}</div>
    </section>

    <section class="card">
      <h3 style="margin-bottom:10px">Change PIN</h3>
      <form class="form" id="pinf">
        <label>Current PIN<input name="cur" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" required></label>
        <div class="grid2">
          <label>New PIN<input name="pin" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" required></label>
          <label>Confirm<input name="pin2" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" required></label>
        </div>
        <button class="btn primary block">Update PIN</button>
      </form>
    </section>

    <button class="btn danger block" id="logout">Log out</button>`;

  const loadExpenses = async () => {
    const [y, m] = expMonth.split('-').map(Number);
    const rows = await q(sb.from('expenses').select('*').gte('spent_on', `${expMonth}-01`).lt('spent_on', ymd(new Date(y, m, 1)))
      .order('spent_on', { ascending: false }).order('created_at', { ascending: false }));
    const byCat = {};
    rows.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount); });
    v.querySelector('#e-sum').innerHTML = `
      ${summaryBox([['Total this month', fmt(sum(rows, (r) => r.amount))], ['Entries', rows.length]])}
      ${rows.length ? `<div class="cats">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, a]) => `<span class="badge">${esc(c)} · ${fmt(a)}</span>`).join('')}</div>` : ''}`;
    v.querySelector('#e-list').innerHTML = rows.length ? rows.map((r) => `
      <div class="row static"><div class="row-main"><div class="row-title">${esc(r.category)}</div>
        <div class="row-sub">${fmtDay(parseYmd(r.spent_on))}${r.note ? ` · ${esc(r.note)}` : ''}</div></div>
        <div class="amt">${fmt(r.amount)}</div>
        <button class="icon-btn" data-del="${r.id}" aria-label="Delete expense">${ICON.close}</button></div>`).join('') : empty('No expenses this month');
    v.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => guarded(async () => {
      if (!confirm('Delete this expense?')) return;
      await q(sb.from('expenses').delete().eq('id', b.dataset.del));
      toast('Expense deleted'); await loadExpenses();
    }); });
  };

  v.querySelector('#e-month').onchange = (e) => { if (e.target.value) { expMonth = e.target.value; guarded(loadExpenses); } };
  v.querySelector('#ef').onsubmit = (e) => submit(e, async (d, form) => {
    await q(sb.from('expenses').insert({ category: d.category.trim(), amount: round2(d.amount), spent_on: d.spent_on, note: d.note.trim() || null }));
    toast('Expense added');
    form.reset(); form.elements.spent_on.value = ymd(new Date());
    expMonth = d.spent_on.slice(0, 7); v.querySelector('#e-month').value = expMonth;
    await loadExpenses();
  });

  const pinForm = v.querySelector('#pinf');
  pinForm.querySelectorAll('.pin').forEach((i) => { i.oninput = () => { i.value = i.value.replace(/\D/g, '').slice(0, 6); }; });
  pinForm.onsubmit = (e) => submit(e, async (d, form) => {
    if (![d.cur, d.pin, d.pin2].every((p) => /^\d{6}$/.test(p))) throw new Error('PINs must be exactly 6 digits');
    if (d.pin !== d.pin2) throw new Error('New PINs do not match');
    if (d.pin === d.cur) throw new Error('New PIN must be different');
    const { error: wrong } = await sb.auth.signInWithPassword({ email: phoneToEmail(myPhone()), password: d.cur });
    if (wrong) throw new Error('Current PIN is wrong');
    const { error } = await sb.auth.updateUser({ password: d.pin });
    if (error) throw new Error(friendly(error));
    form.reset();
    toast('PIN updated');
  });

  v.querySelector('#logout').onclick = () => guarded(async () => {
    if (!confirm('Log out?')) return;
    await sb.auth.signOut();
    location.hash = '#/home';
  });

  await loadExpenses();
}

/* =====================================================================
   BOOT
   ===================================================================== */
async function boot() {
  if (!configured) {
    $app.innerHTML = `<div class="auth"><div class="auth-card"><div class="logo">${ICON.settings}</div><h1>Almost there</h1>
      <p class="muted">Open <code>config.js</code>, add your Supabase URL and key (and Cloudinary details), then reload this page. See README.md for step-by-step help.</p></div></div>`;
    return;
  }
  const { data } = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange((_event, s) => {
    const changed = !!s !== !!session;
    session = s;
    if (changed) setTimeout(route, 0);
  });
  window.addEventListener('hashchange', route);
  route();
}
boot().catch((e) => { $app.innerHTML = `<div class="auth"><div class="auth-card">${errorBox(e)}</div></div>`; });
