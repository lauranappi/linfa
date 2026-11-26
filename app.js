let done = read("done") || {};
if (!isDay(read("dal"))) write("dal", today());

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
const soilDone = day => !!Acqua.get(day) || done.soil === day;
const isDone = (k, day) => k.id === "soil" ? soilDone(day) : done[k.id] === day;
window.clearSoil = () => { delete done.soil; write("done", done); };

function action(k, day) {
  const ok = isDone(k, day), soil = k.id === "soil", card = el("div", "", (ok ? "action done" : "action") + (soil && !ok ? " ask" : "")), text = el("div");
  const said = soil && Acqua.get(day) === "w" ? "Annaffiata oggi" : soil && Acqua.get(day) === "u" ? "Controllata: era umida" : "Fatto oggi";
  text.append(el("strong", k.t), el("span", ok ? said : k.short));
  card.append(text);
  const button = (label, aria, run) => { const b = el("button", label); b.type = "button"; b.setAttribute("aria-label", aria); b.onclick = run; return b; };
  const mark = r => () => { Acqua.set(day, r); done.soil = day; write("done", done); render(); if (r === "w") pour(); };
  if (soil && !ok) {
    const row = el("p");
    row.append(button("Ho bagnato", "Ho annaffiato la pianta", mark("w")), button("Era umida", "La terra era ancora umida", mark("u")));
    card.append(row);
  } else {
    card.append(button(ok ? "Annulla" : "Fatto", (ok ? "Annulla: " : "Fatto: ") + k.t, () => {
      if (soil) Acqua.set(day, null);
      if (ok) delete done[k.id]; else done[k.id] = day;
      write("done", done); render();
    }));
  }
  return card;
}
function render() {
  const day = today(), noon = noonOf(day), due = Bonsai.due(day), name = plantName(), her = name || "lei";
  const together = Math.max(1, daysBetween(read("dal") || day, day) + 1);
  $("date").textContent = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase()) + " · insieme da " + (together === 1 ? "1 giorno" : together + " giorni");
  const open = due.filter(k => !isDone(k, day)).length;
  $("hello").textContent = !open ? "Per oggi è tutto." : open === 1 ? "Un gesto per " + her + "." : open + " gesti per " + her + ".";
  $("today").replaceChildren(...due.map(k => action(k, day)));
  $("plant-title").textContent = name || "La tua pianta";
  $("now-title").textContent = Guide.now().t; $("now-sub").textContent = Guide.now().short;
  const upcoming = Bonsai.TASKS.filter(k => !due.includes(k)).map(k => ({ k, n: Bonsai.next(k, day) })).sort((a, b) => a.n - b.n);
  $("soon").replaceChildren(...upcoming.slice(0, 2).map(x => item(x.k, x.k.short, when(x.n, day))));
  for (const group of ["often", "season"]) {
    const list = Bonsai.TASKS.filter(k => k.group === group)
      .map(k => ({ k, n: due.includes(k) ? noon : Bonsai.next(k, day) })).sort((a, b) => a.n - b.n);
    $(group).replaceChildren(...list.map(x => item(x.k, x.k.every, when(x.n, day))));
  }
}
// Pagine interne: nel menu resta accesa la scheda da cui partono.
const PARENT = { aiuto: "pianta", stagione: "pianta", parti: "pianta" };
function route() {
  const views = [...document.querySelectorAll("[data-view]")];
  const name = views.some(v => "#" + v.dataset.view === location.hash) ? location.hash.slice(1) : "oggi";
  views.forEach(v => v.hidden = v.dataset.view !== name);
  document.querySelectorAll("[data-nav]").forEach(a => a.dataset.nav === (PARENT[name] || name) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (name === "diario") Diario.show();
  if (name === "aiuto") Guide.help();
  if (name === "stagione") Guide.season();
  if (name === "parti") Guide.away();
  document.querySelector("main").scrollTop = 0;
}
window.go = name => { history.replaceState(null, "", "#" + name); route(); };

// L'albero: sole o luna secondo l'ora, foglie che si muovono, gocce quando bagni.
const SVG = "http://www.w3.org/2000/svg";
const shape = (tag, attrs) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const tree = document.querySelector(".tree svg");
const crown = shape("g", { class: "crown" });
const leaves = [...tree.querySelectorAll('path[d^="M-10 0"]')];
tree.insertBefore(crown, leaves[0]); crown.append(...leaves);
const sky = shape("g", {}); tree.append(sky);
function paintSky() {
  const h = new Date().getHours(), light = h >= 7 && h < 18;
  sky.replaceChildren(...(light
    ? [shape("path", { d: "M244 20v6M244 50v6M226 38h6M256 38h6M231 25l4 4M253 47l4 4M257 25l-4 4M235 47l-4 4", stroke: "#F2B84B", "stroke-width": 2.5, "stroke-linecap": "round" })]
    : [shape("circle", { cx: 249, cy: 34, r: 8, fill: "#0F1622" })]));
}
function replay(node, cls) { node.classList.remove(cls); void node.getBoundingClientRect(); node.classList.add(cls); }
window.pour = () => {
  const rain = shape("g", { class: "rain", "aria-hidden": "true" });
  [118, 134, 150, 166, 182, 126, 158, 174].forEach((x, i) => {
    const d = shape("path", { d: `M${x} 130c0 0-5 7-5 10a5 5 0 0 0 10 0c0-3-5-10-5-10z`, fill: "#8FD3F4" });
    d.style.animationDelay = (i * 90) + "ms"; rain.append(d);
  });
  tree.querySelector(".rain")?.remove(); tree.append(rain); setTimeout(() => rain.remove(), 1900);
  replay(crown, "rustle");
};
$("tree").onclick = () => replay(crown, "rustle");

// Nome e data: restano sul telefono.
function fillAbout() { $("p-name").value = plantName(); $("p-since").value = read("dal"); $("p-since").max = today(); }
$("p-name").oninput = () => { write("nome", $("p-name").value.slice(0, 20)); render(); };
$("p-since").onchange = () => { if (isDay($("p-since").value) && $("p-since").value <= today()) { write("dal", $("p-since").value); render(); } };
window.reloadData = () => { done = read("done") || {}; fillAbout(); render(); };

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

const say = text => { $("msg").textContent = text; $("msg").hidden = !text; };
const ready = supported && !(ios && !standalone);
let busy = false;

// ok = il codice è già su GitHub (l'hai confermato tu, o è arrivata una notifica vera).
function paint(on, ok) {
  $("daily").checked = on;
  $("try").disabled = !on;
  $("out").hidden = !on || ok;
  $("redo").hidden = !on || !ok;
  if (on) $("cfg").value = JSON.stringify(read("config"));
}
async function forgetPush() {
  write("ok", false);
  $("copy").textContent = "Copia il codice";
  try { await (await caches.open("linfa-state")).delete("push-ok"); } catch (e) {}
}
// L'interruttore mostra lo stato vero: acceso solo se il telefono è iscritto.
async function refresh() {
  if (!ready || busy) return;
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    const config = read("config");
    const on = !!(config && sub && Notification.permission === "granted");
    if (on && sub.endpoint !== config.subscription.endpoint) {
      write("config", { ...config, subscription: sub.toJSON() });
      await forgetPush();
    }
    if (await caches.match("push-ok")) write("ok", true);
    if (!busy) paint(on, !!read("ok"));
  } catch (e) {}
}
async function turnOn() {
  // La richiesta di permesso deve partire direttamente dal tocco.
  if (await Notification.requestPermission() !== "granted") throw new Error("Le notifiche sono bloccate: abilitale in Impostazioni > Notifiche.");
  await navigator.serviceWorker.register("sw.js");
  const reg = await navigator.serviceWorker.ready;
  let config = read("config"), sub = await reg.pushManager.getSubscription();
  if (!config) {
    if (sub) await sub.unsubscribe();
    sub = null;
    config = await makeKeys();
  }
  sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(config.publicKey) });
  const subscription = sub.toJSON();
  if (config.subscription?.endpoint !== subscription.endpoint) await forgetPush();
  config = { publicKey: config.publicKey, privateKey: config.privateKey, subscription };
  const saved = write("config", config);
  paint(true, !!read("ok"));
  $("cfg").value = JSON.stringify(config);
  if (!saved) { $("cfg").hidden = false; say("Copia subito il codice: non riesco a conservarlo."); }
}
async function turnOff() {
  const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
  await forgetPush();
  paint(false, false);
  say("Promemoria spento. Se lo riaccendi, salva su GitHub il codice nuovo.");
}

if (!ready) {
  say("Questo dispositivo non supporta le notifiche. Su iPhone installa prima l'app dalla schermata Home.");
} else {
  $("daily").disabled = false;
  refresh();
}
$("daily").onchange = async () => {
  const wanted = $("daily").checked;
  busy = true; $("daily").disabled = true; say("");
  try { await (wanted ? turnOn() : turnOff()); }
  catch (e) { $("daily").checked = !wanted; say(e.message || "Qualcosa è andato storto, riprova."); }
  finally { busy = false; $("daily").disabled = false; }
};
$("got").onclick = () => { write("ok", true); say(""); paint(true, true); };
$("redo").onclick = async () => { await forgetPush(); paint(true, false); };
$("try").onclick = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Prova", { body: "Le notifiche funzionano. Ti ricorderò come curare la pianta.", icon: "icon-192-v2.png", tag: "prova" });
  } catch (e) { say("Prova non riuscita: " + e.message); }
};
$("copy").onclick = async () => {
  try { await navigator.clipboard.writeText($("cfg").value); $("copy").textContent = "Copiato"; }
  catch (e) { $("cfg").hidden = false; $("cfg").select(); say("Copia a mano il testo selezionato."); }
};
fillAbout();
paintSky();
render();
route();
addEventListener("hashchange", route);
// Le voci del menu cambiano vista senza navigare.
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  history.replaceState(null, "", a.getAttribute("href"));
  route();
  if (a.dataset.nav === "oggi") doppioTocco(a);
});

// Doppio tocco su Oggi (entro 0,6 secondi): rotellina, poi ricarica per prendere la versione nuova.
let ultimoTocco = 0, aggiorno = false;
function doppioTocco(a) {
  const adesso = Date.now(), doppio = adesso - ultimoTocco < 600;
  ultimoTocco = doppio ? 0 : adesso;
  if (!doppio || aggiorno) return;
  aggiorno = true;
  a.querySelector("svg").outerHTML = '<svg class="gira" width="20" height="20" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Aggiorno"><path d="M12.5 7A5.5 5.5 0 1 1 9.9 2.3"/><path d="M12.5 2.5v3.2H9.3"/></svg>';
  setTimeout(aggiornaApp, 480);
}
async function aggiornaApp() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await Promise.race([reg.update(), new Promise(r => setTimeout(r, 2500))]);
  } catch (e) { /* senza service worker basta ricaricare */ }
  location.reload();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refresh(); paintSky(); if (location.hash === "#diario") Diario.show(); } });
if (supported) navigator.serviceWorker.addEventListener("message", e => { if (e.data === "push-ok") refresh(); });
