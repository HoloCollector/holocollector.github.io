/* =====================================================================
   SHOP SETTINGS — edit these first
   ===================================================================== */
const SHOP = {
  name: "HoloCollector",             // also edit it in index.html (title + data-shop-name)
  whatsapp: "971507591359",          // digits only, international format (971 = UAE, no + or leading 0)
  email: "",                         // Leave "" to hide email ordering and email links. Set a real address, such as "name@gmail.com", to show them.
  currency: "AED",
};

/* =====================================================================
   PRODUCTS — the list of cards for sale
   ---------------------------------------------------------------------
   HOW TO ADD A CARD: copy the sample line below, delete the // at the
   start, and change the values. Keep a comma between cards.
     id        – a short code only you use, no spaces (e.g. "pika-02")
     name      – the card name people see
     set       – the set it comes from, like "Brilliant Stars"
     number    – the card number, like "079/172" (use "" if you don't know)
     tcgId     – the card's id on the price site, like "swsh9-79".
                 This is how the daily price finder knows which card you mean.
                 To find one, open this link and change the name at the end:
                 https://api.pokemontcg.io/v2/cards?q=name:lucario
                 Look for "id" on the matching card (it looks like "swsh9-79").
                 You can leave tcgId out. The finder will then try the set
                 name plus the card number.
     variant   – optional. Which copy's price to use: "holofoil",
                 "reverseHolofoil", or "normal". Leave it out and the finder
                 uses holofoil, then reverse holofoil, then normal.
     autoPrice – set this to false to keep the price you type yourself.
                 Leave it out to use the market price (market + 10%, in AED).
     type      – one of: Fire, Water, Grass, Electric, Psychic, Dark, Dragon, Fighting, Normal
     condition – Mint, Near Mint, Lightly Played, or Played.
                 Mint and Near Mint = full price. Lightly Played = 85%.
                 Played = 70%. Change those in scripts/update-prices.mjs.
     price     – your backup price in AED (a number only, no "AED").
                 Used when autoPrice is false, or if the price finder can't
                 find this card.
     stock     – how many you have (0 = shows "Sold out")
     emoji     – a stand-in picture (any emoji)
     rare      – true to show a RARE badge, false otherwise
   HOW TO REMOVE A CARD: delete its { ... } line.
   Prices refresh every day: market price + 10%, rounded up to whole dirhams.
   NOTE: The list starts empty. Uncomment the sample line (or copy it) to add a real card.
   ===================================================================== */
const PRODUCTS = [
  // { id: "lucario-01", name: "Lucario", set: "Brilliant Stars", number: "079/172", tcgId: "swsh9-79", variant: "holofoil", type: "Fighting", condition: "Near Mint", price: 5, stock: 1, emoji: "🥋", rare: false },
];

/* =====================================================================
   You normally don't need to edit anything below this line.
   ===================================================================== */
const CART_KEY = "cardshop-cart-v1";
const $ = (s) => document.querySelector(s);
const fmt = (n) => `${n.toLocaleString("en-AE")} ${SHOP.currency}`;
const byId = (id) => PRODUCTS.find((p) => p.id === id);
let priceBook = { updated: "", cards: {} };

function priceOf(p) {
  if (!p) return 0;
  if (p.autoPrice === false) return Number(p.price) || 0;
  const saved = priceBook.cards && priceBook.cards[p.id];
  const market = saved ? Number(saved.price) : NaN;
  if (Number.isFinite(market)) return market;
  return Number(p.price) || 0;
}

async function loadPriceBook() {
  try {
    const res = await fetch("prices.json", { cache: "no-cache" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.cards && typeof data.cards === "object") {
      priceBook = { updated: String(data.updated || ""), cards: data.cards };
      return;
    }
    const cards = {};
    if (data && typeof data === "object") {
      for (const [id, row] of Object.entries(data)) {
        if (row && typeof row === "object" && Number.isFinite(Number(row.price))) cards[id] = row;
      }
    }
    priceBook = { updated: String((data && data.updated) || ""), cards };
  } catch {
    /* offline or missing file: each card keeps its typed price */
  }
}

function formatUpdated(iso) {
  const day = String(iso || "").slice(0, 10);
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
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
    priceOf(p) >= min && priceOf(p) < max
  );
  const sort = $("#sort").value;
  if (sort === "price-asc") list.sort((a, b) => priceOf(a) - priceOf(b));
  if (sort === "price-desc") list.sort((a, b) => priceOf(b) - priceOf(a));
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
          <div class="price">${priceOf(p)} <small>${SHOP.currency}</small></div>
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
function cartTotal() { return cartLines().reduce((s, l) => s + priceOf(l.p) * l.qty, 0); }

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
        <div class="ci-sub">${esc(p.condition)} · ${fmt(priceOf(p))} each</div>
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
    `• ${qty} × ${p.name} (${p.set}${p.number ? " " + p.number : ""}, ${p.condition}) – ${fmt(priceOf(p) * qty)}`);
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
function shopEmail() { return String(SHOP.email || "").trim(); }
function waLink(text) { return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`; }
function mailLink(text) {
  const email = shopEmail();
  if (!email) return "";
  return `mailto:${email}?subject=${encodeURIComponent("Card order – " + SHOP.name)}&body=${encodeURIComponent(text)}`;
}

function handleCheckout(e) {
  e.preventDefault();
  const err = $("#formError");
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  for (const k in data) data[k] = String(data[k]).trim();
  if (!cartLines().length) { err.textContent = "Your cart is empty."; err.hidden = false; return; }
  if (!data.name || !data.contact) { err.textContent = "Please add your name and contact."; err.hidden = false; return; }
  const method = e.submitter?.dataset.method || "whatsapp";
  if (method === "email" && !shopEmail()) {
    err.textContent = "Email ordering isn't available. Please use WhatsApp.";
    err.hidden = false;
    return;
  }
  err.hidden = true;
  const msg = buildMessage(data);
  if (method === "email") window.location.href = mailLink(msg);
  else window.open(waLink(msg), "_blank", "noopener");
  toast("Order message ready — just hit send! ✅");
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- Wire up ---------- */
async function init() {
  await loadPriceBook();
  const priceNote = $("#priceNote");
  if (priceNote && priceBook.updated) {
    priceNote.hidden = false;
    priceNote.textContent = `Prices updated ${formatUpdated(priceBook.updated)}`;
  }
  document.title = `${SHOP.name} – Trading Cards in Dubai`;
  document.querySelectorAll("[data-shop-name]").forEach((el) => (el.textContent = SHOP.name));
  $("#year").textContent = new Date().getFullYear();
  $("#waContact").href = waLink(`Hi! I have a question about ${SHOP.name}.`);
  const emailOn = shopEmail() !== "";
  document.querySelectorAll("[data-requires-email]").forEach((el) => {
    el.hidden = !emailOn;
    if (emailOn && el.dataset.emailLink != null) el.href = `mailto:${shopEmail()}`;
  });
  const orderStep = $("#orderStep");
  if (orderStep) {
    orderStep.textContent = emailOn
      ? "Fill in your name and contact, then tap WhatsApp or Email — your order is written for you."
      : "Fill in your name and contact, then tap WhatsApp — your order is written for you.";
  }
  const contactBlurb = $("#contactBlurb");
  if (contactBlurb) {
    contactBlurb.textContent = emailOn
      ? "Message me on WhatsApp or email — happy to send extra photos of any card."
      : "Message me on WhatsApp — happy to send extra photos of any card.";
  }

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
