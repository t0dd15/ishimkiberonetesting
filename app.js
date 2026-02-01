const $ = (id) => document.getElementById(id);

const state = {
  route: "home",
  chaos: false,
  coupon: null,
  products: [
    { id: "p1", name: "Space Battle", category: "games", price: 399 },
    { id: "p2", name: "Mario Clone", category: "games", price: 499 },
    { id: "p3", name: "Web Starter", category: "edu", price: 299 },
    { id: "p4", name: "QA Basics", category: "edu", price: 199 },
    { id: "p5", name: "Keyboard Pro", category: "gadgets", price: 699 },
    { id: "p6", name: "Mouse Mini", category: "gadgets", price: 349 },
  ],
};

function logEvent(text) {
  const box = $("eventLog");
  if (!box) return;
  const ts = new Date().toLocaleTimeString();
  box.textContent = `[${ts}] ${text}\n` + box.textContent;
}

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
  return readLS("qa_users", []);
}
function setUsers(users) {
  writeLS("qa_users", users);
}

function getSession() {
  return readLS("qa_session", { user: null });
}
function setSession(session) {
  writeLS("qa_session", session);
}

function getCart() {
  return readLS("qa_cart", []);
}
function setCart(cart) {
  writeLS("qa_cart", cart);
  updateCartBadge();
}

function updateCartBadge() {
  const cart = getCart();
  const count = cart.reduce((acc, it) => acc + (it.qty || 0), 0);
  const el = document.querySelector('[data-testid="cart-count"]');
  if (el) el.textContent = String(count);
}

function routeTo(route) {
  state.route = route;

  document.querySelectorAll(".page").forEach((sec) => {
    const is = sec.getAttribute("data-page") === route;
    sec.classList.toggle("hidden", !is);
  });

  if (route === "catalog") renderCatalog();
  if (route === "cart") renderCart();
  if (route === "auth") renderAuth();
}

function maybeChaos() {
  if (!state.chaos) return false;
  return Math.random() < 0.25;
}

function setMsg(el, text, type) {
  el.classList.remove("ok", "err");
  el.textContent = text;
  if (type) el.classList.add(type);
}

function initNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => routeTo(btn.getAttribute("data-route")));
  });
}

function initTheme() {
  const toggle = $("themeToggle");
  const saved = localStorage.getItem("qa_theme") || "dark";
  document.body.classList.toggle("light", saved === "light");
  toggle.checked = saved === "light";

  toggle.addEventListener("change", () => {
    const isLight = toggle.checked;
    document.body.classList.toggle("light", isLight);
    localStorage.setItem("qa_theme", isLight ? "light" : "dark");
    logEvent(`Theme switched to ${isLight ? "light" : "dark"}`);
  });
}

function initChaos() {
  const btn = $("chaosToggle");
  btn.addEventListener("click", () => {
    state.chaos = !state.chaos;
    btn.textContent = `Chaos: ${state.chaos ? "ON" : "OFF"}`;
    btn.classList.toggle("danger", !state.chaos);
    logEvent(`Chaos mode ${state.chaos ? "enabled" : "disabled"}`);
  });
}

function renderAuth() {
  const s = getSession();
  $("currentUser").textContent = s.user ? `${s.user.name} <${s.user.email}>` : "—";
}

function initAuth() {
  const loginMsg = $("loginMsg");
  const regMsg = $("regMsg");

  $("loginBtn").addEventListener("click", () => {
    const email = $("loginEmail").value.trim();
    const pass = $("loginPassword").value;

    if (!email) return setMsg(loginMsg, "Введите email.", "err");
    if (!pass) return setMsg(loginMsg, "Введите пароль.", "err");

    const users = getUsers();
    const user = users.find((u) => u.email === email);

    if (maybeChaos()) {
      setMsg(loginMsg, "Сервис временно недоступен. Попробуйте позже.", "err");
      logEvent("Login failed: outage");
      return;
    }

    if (!user) {
      setMsg(loginMsg, "Пользователь не найден.", "err");
      logEvent(`Login failed: user not found (${email})`);
      return;
    }
    if (user.password !== pass) {
      setMsg(loginMsg, "Неверный пароль.", "err");
      logEvent(`Login failed: wrong password (${email})`);
      return;
    }

    setSession({ user: { name: user.name, email: user.email } });
    renderAuth();
    setMsg(loginMsg, "Успешно! Добро пожаловать.", "ok");
    logEvent(`Login success (${email})`);
  });

  $("logoutBtn").addEventListener("click", () => {
    setSession({ user: null });
    renderAuth();
    setMsg(loginMsg, "Вы вышли из аккаунта.", "ok");
    logEvent("Logout");
  });

  $("regBtn").addEventListener("click", () => {
    const name = $("regName").value;
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value;
    const age = $("regAge").value;
    const terms = $("regTerms").checked;

    if (!name) return setMsg(regMsg, "Введите имя.", "err");
    if (!email) return setMsg(regMsg, "Введите email.", "err");
    if (password.length < 8) return setMsg(regMsg, "Пароль слишком короткий.", "err");
    if (!terms) return setMsg(regMsg, "Нужно согласиться с правилами.", "err");

    const users = getUsers();
    const exists = users.some((u) => u.email === email);

    if (exists) {
      setMsg(regMsg, "Такой email уже зарегистрирован.", "err");
      logEvent(`Register failed: email exists (${email})`);
      return;
    }

    users.push({ name: name.trim(), email, password, age });
    setUsers(users);

    setMsg(regMsg, "Аккаунт создан! Теперь войдите.", "ok");
    logEvent(`Register success (${email})`);
  });
}

function productCard(p) {
  return `
    <div class="product" data-testid="product-card-${p.id}">
      <h4 data-testid="product-name-${p.id}">${p.name}</h4>
      <div class="meta">
        <span class="pill" data-testid="product-cat-${p.id}">${p.category}</span>
        <span class="pill">id: ${p.id}</span>
      </div>
      <div class="price" data-testid="product-price-${p.id}">${p.price} ₽</div>
      <div class="row">
        <div class="qty">
          <label class="small">Qty</label>
          <input data-testid="product-qty-${p.id}" value="1" id="qty_${p.id}" />
        </div>
        <button class="primary" data-testid="add-to-cart-${p.id}" onclick="addToCart('${p.id}')">В корзину</button>
      </div>
    </div>
  `;
}

function renderCatalog() {
  const box = $("products");
  const msg = $("catalogMsg");
  const q = $("searchInput").value;
  const cat = $("categorySelect").value;

  let items = state.products.slice();
  if (cat !== "all") items = items.filter((p) => p.category === cat);
  if (q) items = items.filter((p) => p.name.includes(q));

  box.innerHTML = items.map(productCard).join("");

  if (items.length === 0) setMsg(msg, "Ничего не найдено. Попробуйте изменить запрос.", "err");
  else setMsg(msg, `Найдено товаров: ${items.length}`, "ok");
}

function initCatalog() {
  $("searchBtn").addEventListener("click", renderCatalog);
  $("categorySelect").addEventListener("change", renderCatalog);
}

window.addToCart = function (productId) {
  const qtyEl = document.getElementById(`qty_${productId}`);
  const qtyRaw = qtyEl ? qtyEl.value : "1";
  const qty = parseInt(qtyRaw, 10);

  const cart = getCart();
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;

  if (maybeChaos()) {
    logEvent("Add to cart failed");
    alert("Ошибка добавления. Попробуйте ещё раз.");
    return;
  }

  const existing = cart.find((it) => it.id === productId);
  const add = isNaN(qty) ? 1 : qty;

  if (existing) existing.qty += add;
  else cart.push({ id: p.id, name: p.name, price: p.price, qty: add });

  setCart(cart);
  logEvent(`Added to cart: ${productId} x${add}`);
};

function renderCart() {
  const list = $("cartList");
  const cart = getCart();

  if (cart.length === 0) {
    list.innerHTML = `<div class="msg err">Корзина пуста.</div>`;
  } else {
    list.innerHTML = cart
      .map(
        (it) => `
      <div class="cart-item" data-testid="cart-item-${it.id}">
        <div class="cart-left">
          <div class="cart-title" data-testid="cart-name-${it.id}">${it.name}</div>
          <div class="cart-sub">${it.price} ₽ за шт.</div>
        </div>
        <div class="cart-right">
          <button class="ghost" data-testid="cart-dec-${it.id}" onclick="decQty('${it.id}')">−</button>
          <input data-testid="cart-qty-${it.id}" value="${it.qty}" onchange="setQty('${it.id}', this.value)" />
          <button class="ghost" data-testid="cart-inc-${it.id}" onclick="incQty('${it.id}')">+</button>
          <button class="danger" data-testid="cart-del-${it.id}" onclick="delItem('${it.id}')">Удалить</button>
        </div>
      </div>
    `
      )
      .join("");
  }

  recalcTotals();
}

window.incQty = function (id) {
  const cart = getCart();
  const it = cart.find((x) => x.id === id);
  if (!it) return;
  it.qty += 1;
  setCart(cart);
  renderCart();
  logEvent(`Qty inc: ${id}`);
};

window.decQty = function (id) {
  const cart = getCart();
  const it = cart.find((x) => x.id === id);
  if (!it) return;
  it.qty -= 1;
  setCart(cart);
  renderCart();
  logEvent(`Qty dec: ${id}`);
};

window.setQty = function (id, val) {
  const cart = getCart();
  const it = cart.find((x) => x.id === id);
  if (!it) return;
  it.qty = parseInt(val, 10);
  setCart(cart);
  renderCart();
  logEvent(`Qty set: ${id}=${val}`);
};

window.delItem = function (id) {
  let cart = getCart();
  cart = cart.filter((x) => x.id !== id);
  setCart(cart);
  renderCart();
  logEvent(`Item removed: ${id}`);
};

function recalcTotals() {
  const cart = getCart();
  const sum = cart.reduce((acc, it) => acc + it.price * (it.qty || 0), 0);

  let discount = 0;
  if (state.coupon === "SAVE10") discount = Math.round(sum * 0.1);
  if (state.coupon === "FREE") discount = 999999;

  const pay = sum - discount;

  $("totalSum").textContent = String(sum);
  $("totalDiscount").textContent = String(discount);
  $("totalPay").textContent = String(pay);
}

function initCart() {
  $("cartClear").addEventListener("click", () => {
    setCart([]);
    state.coupon = null;
    $("couponInput").value = "";
    $("couponHint").textContent = "";
    $("couponMsg").textContent = "";
    renderCart();
    logEvent("Cart cleared");
  });

  $("couponApply").addEventListener("click", () => {
    const code = $("couponInput").value.trim();

    if (maybeChaos()) {
      setMsg($("couponMsg"), "Ошибка применения купона. Повторите попытку.", "err");
      logEvent("Coupon apply failed");
      return;
    }

    state.coupon = code;
    setMsg($("couponMsg"), `Купон применён: ${code}`, "ok");
    recalcTotals();
    logEvent(`Coupon applied: ${code}`);
  });

  $("checkoutBtn").addEventListener("click", () => {
    const msg = $("checkoutMsg");
    const s = getSession();

    if (!s.user) {
      setMsg(msg, "Чтобы оформить заказ, нужно войти в аккаунт.", "err");
      logEvent("Checkout failed: not logged in");
      return;
    }

    const cart = getCart();
    if (cart.length === 0) {
      setMsg(msg, "Корзина пуста.", "err");
      logEvent("Checkout failed: empty cart");
      return;
    }

    if (maybeChaos()) {
      setMsg(msg, "Оплата не прошла. Попробуйте ещё раз.", "err");
      logEvent("Checkout failed");
      return;
    }

    setMsg(msg, "Заказ оформлен! Спасибо.", "ok");
    logEvent(`Checkout success by ${s.user.email}`);
  });
}

function initFeedback() {
  $("fbSend").addEventListener("click", () => {
    const last = $("fbLastname").value;
    const topic = $("fbTopic").value;
    const text = $("fbMessage").value;

    if (!topic) {
      setMsg($("fbMsg"), "Выберите тему.", "err");
      logEvent("Feedback failed: no topic");
      return;
    }
    if (text.length < 5) {
      setMsg($("fbMsg"), "Сообщение слишком короткое.", "err");
      logEvent("Feedback failed: too short message");
      return;
    }

    if (maybeChaos()) {
      setMsg($("fbMsg"), "Сервер не отвечает. Попробуйте позже.", "err");
      logEvent("Feedback failed");
      return;
    }

    setMsg($("fbMsg"), `Отправлено! Тема: ${topic}.`, "ok");
    logEvent(`Feedback sent: last="${last}", topic="${topic}"`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initTheme();
  initChaos();

  initAuth();
  initCatalog();
  initCart();
  initFeedback();

  updateCartBadge();
  routeTo("home");
  logEvent("App started");
});
