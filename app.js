const $ = id => document.getElementById(id);
const today = () => new Date().toLocaleDateString("en-CA");
const read = k => { try { return JSON.parse(localStorage.getItem("linfa:" + k)); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem("linfa:" + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
let done = read("done") || {};

function el(tag, text, cls) { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
function when(date, day) {
  if (date.toISOString().slice(0, 10) === day) return "oggi";
  const far = date - new Date(day + "T12:00:00Z") > 300 * 864e5;
  const o = far ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" };
  return date.toLocaleDateString("it-IT", { ...o, timeZone: "UTC" });
}
function item(k, sub, label) {
  const li = el("li"), node = el("div", "", "node"), icon = el("span"), info = el("div", "", "info"), text = el("div");
  icon.innerHTML = ICONS[k.icon];
  node.append(icon); text.append(el("strong", k.t), el("small", sub));
  info.append(text, el("span", label, "when")); li.append(node, info);
  return li;
}
function render() {
  const day = today(), noon = new Date(day + "T12:00:00Z"), due = Bonsai.due(day);
  $("date").textContent = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase());
  const open = due.filter(k => done[k.id] !== day).length;
  $("hello").textContent = !open ? "Per oggi è tutto." : open === 1 ? "Un gesto per lei." : open + " gesti per lei.";
  $("today").replaceChildren(...due.map(k => {
    const ok = done[k.id] === day, card = el("div", "", ok ? "action done" : "action"), text = el("div");
    text.append(el("strong", k.t), el("span", ok ? "Fatto oggi" : k.short));
    const b = el("button", ok ? "Annulla" : "Fatto");
    b.setAttribute("aria-label", (ok ? "Annulla: " : "Fatto: ") + k.t);
    b.onclick = () => { if (ok) delete done[k.id]; else done[k.id] = day; write("done", done); render(); };
    card.append(text, b); return card;
  }));
  const upcoming = Bonsai.TASKS.filter(k => !due.includes(k)).map(k => ({ k, n: Bonsai.next(k, day) })).sort((a, b) => a.n - b.n);
  $("soon").replaceChildren(...upcoming.slice(0, 2).map(x => item(x.k, x.k.short, when(x.n, day))));
  for (const group of ["often", "season"]) {
    const list = Bonsai.TASKS.filter(k => k.group === group)
      .map(k => ({ k, n: due.includes(k) ? noon : Bonsai.next(k, day) })).sort((a, b) => a.n - b.n);
    $(group).replaceChildren(...list.map(x => item(x.k, x.k.every, when(x.n, day))));
  }
}
function route() {
  const views = [...document.querySelectorAll("[data-view]")];
  const name = views.some(v => "#" + v.dataset.view === location.hash) ? location.hash.slice(1) : "oggi";
  views.forEach(v => v.hidden = v.dataset.view !== name);
  document.querySelectorAll("[data-nav]").forEach(a => a.dataset.nav === name ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  document.querySelector("main").scrollTop = 0;
}

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const bytes = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function makeKeys() {
  const p = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { publicKey: b64(await crypto.subtle.exportKey("raw", p.publicKey)), privateKey: (await crypto.subtle.exportKey("jwk", p.privateKey)).d };
}
const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const ios = /iPhone|iPad/.test(navigator.userAgent);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

if (ios && !standalone) {
  $("msg").textContent = "Prima aggiungi l'app alla Home: in Safari tocca Condividi, poi “Aggiungi alla schermata Home”. Aprila dall'icona.";
  $("on").hidden = true;
} else if (!supported) {
  $("msg").textContent = "Questo browser non supporta le notifiche push. Su iPhone serve iOS 16.4 o successivo.";
  $("on").hidden = true;
} else {
  $("msg").textContent = "Tocca il pulsante e consenti le notifiche.";
  const c = read("config");
  if (c) show(c);
  checkPush();
}
// Collegato = in questo telefono è arrivata una notifica vera (o l'hai confermato tu).
function paint(ok) {
  $("active").hidden = $("redo").hidden = !ok;
  $("steps").hidden = $("msg").hidden = $("on").hidden = ok;
  $("out").hidden = ok || !read("config");
  $("kicker").textContent = ok ? "Tutto collegato" : "Una volta sola";
}
function show(config) {
  $("cfg").value = JSON.stringify(config);
  $("on").textContent = "Ricollega notifiche";
  $("on").className = "quiet";
  $("msg").textContent = "Salva il codice su GitHub. Alla prima notifica serale questa pagina si riordina da sola.";
  paint(false);
}
async function checkPush() {
  if (!read("config") || Notification.permission === "denied") return;
  try { if (await caches.match("push-ok")) write("ok", true); } catch (e) {}
  if (read("ok")) paint(true);
}
async function forgetPush() {
  write("ok", false);
  try { await (await caches.open("linfa-state")).delete("push-ok"); } catch (e) {}
}
$("got").onclick = () => { write("ok", true); paint(true); };
$("redo").onclick = async () => { await forgetPush(); paint(false); };

$("on").onclick = async () => {
  try {
    // La richiesta di permesso deve partire direttamente dal tocco.
    if (await Notification.requestPermission() !== "granted") { $("msg").textContent = "Permesso negato: attivalo in Impostazioni > Notifiche."; return; }
    await navigator.serviceWorker.register("sw.js");
    const reg = await navigator.serviceWorker.ready;
    let config = read("config");
    if (!config) {
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      config = await makeKeys();
    }
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(config.publicKey) });
    config = { publicKey: config.publicKey, privateKey: config.privateKey, subscription: sub.toJSON() };
    const saved = write("config", config);
    await forgetPush();
    show(config);
    if (!saved) { $("out").hidden = false; $("cfg").hidden = false; }
    $("copy").textContent = "Copia il codice";
    $("msg").textContent = saved ? "Permesso concesso. Ora copia il codice." : "Permesso concesso, ma copia subito il codice: non riesco a conservarlo.";
  } catch (e) { $("msg").textContent = "Attivazione non riuscita: " + e.message; }
};
$("try").onclick = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Linfa", { body: "Prova riuscita sul telefono.", icon: "icon-192.png" });
  } catch (e) { $("msg").textContent = "Prova non riuscita: " + e.message; }
};
$("copy").onclick = async () => {
  try { await navigator.clipboard.writeText($("cfg").value); $("copy").textContent = "Copiato"; }
  catch (e) { $("cfg").hidden = false; $("cfg").select(); $("msg").textContent = "Copia a mano il testo selezionato."; }
};
render();
route();
addEventListener("hashchange", route);
// Le voci del menu cambiano vista senza navigare: toccarle di nuovo non ricarica nulla.
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  history.replaceState(null, "", a.getAttribute("href"));
  route();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); if (supported) checkPush(); } });
if (supported) navigator.serviceWorker.addEventListener("message", e => { if (e.data === "push-ok") checkPush(); });
