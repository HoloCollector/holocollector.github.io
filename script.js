/* =====================================================================
   SHOP SETTINGS — edit these first
   ===================================================================== */
const SHOP = {
  name: "HoloCollector",             // also edit it in index.html (title + data-shop-name)
  whatsapp: "971500000000",          // PLACEHOLDER: your number in international format, digits only (971 = UAE, no + or leading 0)
  email: "yourname@example.com",     // PLACEHOLDER: your email address
  currency: "AED",
};

/* =====================================================================
   PRODUCTS — the list of cards for sale
   ---------------------------------------------------------------------
   HOW TO ADD A CARD: copy one { ... } block, paste it below the last one
   (keep the comma between blocks!) and change the values:
     id        – unique short code, no spaces (e.g. "pika-02")
     name      – card name shown on the site
     set       – the set / expansion it's from
     number    – card number in the set (optional, "" if unknown)
     type      – one of: Fire, Water, Grass, Electric, Psychic, Dark, Dragon, Normal
     condition – Mint, Near Mint, Lightly Played, Played
     price     – price in AED (number only, no "AED")
     stock     – how many you have (0 = shows "Sold out")
     emoji     – placeholder picture (any emoji)
     rare      – true to show a "RARE" badge, false otherwise
   HOW TO REMOVE A CARD: delete its { ... } block.
   NOTE: The list starts empty. Uncomment the sample line (or copy it) to add a real card.
   ===================================================================== */
const PRODUCTS = [
  // { id: "pika-02", name: "Pikachu", set: "Scarlet & Violet", number: "063/198", type: "Electric", condition: "Mint", price: 15, stock: 1, emoji: "⚡", rare: false },
];

/* =====================================================================
   You normally don't need to edit anything below this line.
   ===================================================================== */
const CART_KEY = "cardshop-cart-v1";
const $ = (s) => document.querySelector(s);
const fmt = (n) => `${n.toLocaleString("en-AE")} ${SHOP.currency}`;
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let cart = loadCart();

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY)) || {};
    // drop items that no longer exist and clamp to stock
    const clean = {};
    for (const [id, q] of Object.entries(raw)) {
      const p = byId(id);
      if (p && p.stock > 0 && q > 0) clean[id] = Math.min(q, p.stock);
    }
    return clean;
  } catch { return {}; }
}
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }

/* ---------- Product grid ---------- */
function renderFilters() {
  const types = [...new Set(PRODUCTS.map((p) => p.type))].sort();
  $("#typeFilter").insertAdjacentHTML("beforeend", types.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join(""));
}

function filtered() {
  const q = $("#search").value.trim().toLowerCase();
  const type = $("#typeFilter").value;
  const [min, max] = $("#priceFilter").value === "all" ? [0, Infinity] : $("#priceFilter").value.split("-").map(Number);
  let list = PRODUCTS.filter((p) =>
    (!q || `${p.name} ${p.set} ${p.number}`.toLowerCase().includes(q)) &&
    (type === "all" || p.type === type) &&
    p.price >= min && p.price < max
  );
  const sort = $("#sort").value;
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function renderGrid() {
  const list = filtered();
  const empty = $("#empty");
  if (PRODUCTS.length === 0) {
    empty.hidden = false;
    empty.textContent = "New cards coming soon! Message us on WhatsApp to ask what's in stock.";
  } else {
    empty.hidden = list.length > 0;
    empty.textContent = "No cards match your search. Try a different filter!";
  }
  $("#grid").innerHTML = list.map((p) => {
    const sold = p.stock <= 0;
    return `
    <article class="product">
      <div class="thumb t-${p.type.toLowerCase()}">
        <span class="tag">EXAMPLE</span>
        ${p.rare ? '<span class="tag rare">★ RARE</span>' : ""}
        <div class="mini" aria-hidden="true">${p.emoji}</div>
      </div>
      <div class="p-body">
        <h3>${esc(p.name)}</h3>
        <div class="p-meta">${esc(p.set)}${p.number ? " · " + esc(p.number) : ""} · ${esc(p.type)}</div>
        <span class="cond">${esc(p.condition)}</span>
        <div class="p-foot">
          <div class="price">${p.price} <small>${SHOP.currency}</small></div>
          <button class="btn btn-primary add" data-add="${p.id}" ${sold ? "disabled" : ""}>${sold ? "Sold out" : "Add +"}</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

/* ---------- Cart ---------- */
function cartLines() {
  return Object.entries(cart).map(([id, qty]) => ({ p: byId(id), qty })).filter((l) => l.p);
}
function cartTotal() { return cartLines().reduce((s, l) => s + l.p.price * l.qty, 0); }

function addToCart(id) {
  const p = byId(id);
  if (!p || p.stock <= 0) return;
  const cur = cart[id] || 0;
  if (cur >= p.stock) { toast(`Only ${p.stock} in stock`); return; }
  cart[id] = cur + 1;
  saveCart(); renderCart();
  toast(`Added ${p.name} 🛒`);
  const b = $("#cartOpen"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
}
function setQty(id, qty) {
  const p = byId(id);
  if (qty <= 0) delete cart[id];
  else cart[id] = Math.min(qty, p.stock);
  saveCart(); renderCart();
}

function renderCart() {
  const lines = cartLines();
  $("#cartCount").textContent = lines.reduce((s, l) => s + l.qty, 0);
  $("#cartTotal").textContent = fmt(cartTotal());
  $("#cartItems").innerHTML = lines.length ? lines.map(({ p, qty }) => `
    <div class="ci">
      <div class="ci-thumb t-${p.type.toLowerCase()}">${p.emoji}</div>
      <div>
        <div class="ci-name">${esc(p.name)}</div>
        <div class="ci-sub">${esc(p.condition)} · ${fmt(p.price)} each</div>
        <button class="ci-remove" data-remove="${p.id}">Remove</button>
      </div>
      <div class="qty">
        <button data-dec="${p.id}" aria-label="Decrease">−</button>
        <span>${qty}</span>
        <button data-inc="${p.id}" aria-label="Increase">+</button>
      </div>
    </div>`).join("") : '<p class="cart-empty">Your cart is empty. Add some cards! ✨</p>';
}

function openCart(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", String(!open));
  $("#overlay").hidden = !open;
}

/* ---------- Checkout (no payment — builds a WhatsApp / email message) ---------- */
function buildMessage(data) {
  const lines = cartLines().map(({ p, qty }) =>
    `• ${qty} × ${p.name} (${p.set}${p.number ? " " + p.number : ""}, ${p.condition}) – ${fmt(p.price * qty)}`);
  return [
    `Hi! I'd like to order from ${SHOP.name}:`,
    "",
    ...lines,
    "",
    `Total: ${fmt(cartTotal())}`,
    "",
    `Name: ${data.name}`,
    `Contact: ${data.contact}`,
    data.notes ? `Notes: ${data.notes}` : null,
  ].filter((l) => l !== null).join("\n");
}
function waLink(text) { return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`; }
function mailLink(text) {
  return `mailto:${SHOP.email}?subject=${encodeURIComponent("Card order – " + SHOP.name)}&body=${encodeURIComponent(text)}`;
}

function handleCheckout(e) {
  e.preventDefault();
  const err = $("#formError");
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  for (const k in data) data[k] = String(data[k]).trim();
  if (!cartLines().length) { err.textContent = "Your cart is empty."; err.hidden = false; return; }
  if (!data.name || !data.contact) { err.textContent = "Please add your name and contact."; err.hidden = false; return; }
  err.hidden = true;
  const method = e.submitter?.dataset.method || "whatsapp";
  const msg = buildMessage(data);
  const url = method === "email" ? mailLink(msg) : waLink(msg);
  if (method === "email") window.location.href = url;
  else window.open(url, "_blank", "noopener");
  toast("Order message ready — just hit send! ✅");
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- Wire up ---------- */
function init() {
  document.title = `${SHOP.name} – Trading Cards in Dubai`;
  document.querySelectorAll("[data-shop-name]").forEach((el) => (el.textContent = SHOP.name));
  $("#year").textContent = new Date().getFullYear();
  $("#waContact").href = waLink(`Hi! I have a question about ${SHOP.name}.`);

  renderFilters(); renderGrid(); renderCart();
  ["#search", "#typeFilter", "#priceFilter", "#sort"].forEach((s) => $(s).addEventListener("input", renderGrid));

  $("#grid").addEventListener("click", (e) => { const id = e.target.closest("[data-add]")?.dataset.add; if (id) addToCart(id); });
  $("#cartItems").addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.inc) setQty(t.dataset.inc, (cart[t.dataset.inc] || 0) + 1);
    if (t.dataset.dec) setQty(t.dataset.dec, (cart[t.dataset.dec] || 0) - 1);
    if (t.dataset.remove) setQty(t.dataset.remove, 0);
  });
  $("#cartOpen").addEventListener("click", () => openCart(true));
  $("#cartClose").addEventListener("click", () => openCart(false));
  $("#overlay").addEventListener("click", () => openCart(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") openCart(false); });
  $("#orderForm").addEventListener("submit", handleCheckout);
  $("#clearCart").addEventListener("click", () => { cart = {}; saveCart(); renderCart(); });
}

if (typeof document !== "undefined") init();
