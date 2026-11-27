// Storico delle cure, promemoria personali e "Quando sei via".
(function () {
  const map = k => { const v = read(k); return v && typeof v === "object" ? v : {}; };
  const data = () => ({ water: map("water"), done: map("done"), cure: map("cure"), mie: map("mie"), via: map("via"), dal: read("dal") });
  const random = (n, from) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => from[b % from.length]).join("");
  const longDay = d => fmt(d, { weekday: "long", day: "numeric", month: "long" });
  const shortDay = d => fmt(d, { day: "numeric", month: "short", ...(d.slice(0, 4) !== today().slice(0, 4) && { year: "numeric" }) });
  const ago = d => { const n = daysBetween(d, today()); return n === 0 ? "Oggi" : n === 1 ? "Ieri" : n + " giorni fa"; };

  // Un pulsante che chiede un secondo tocco prima di togliere qualcosa.
  function remove(label, run) {
    const b = el("button", "Elimina", "quiet"); b.type = "button"; b.setAttribute("aria-label", "Elimina " + label);
    b.onclick = () => { if (b.dataset.sure) return run(); b.dataset.sure = "1"; b.textContent = "Sicura?"; };
    return b;
  }
  function row(title, sub, button) {
    const r = el("div", "", "row"), t = el("div");
    t.append(el("strong", title), el("small", sub)); r.append(t);
    if (button) r.append(button);
    return r;
  }

  // ---------- Storico ----------
  // Segnare una cura dall'app la aggiunge anche allo storico.
  function log(task, day, on) {
    const cure = map("cure"), id = task.id + "-" + day;
    if (on) { if (!task.log) return; cure[id] = { d: day, k: task.id, t: task.t, n: "" }; }
    else if (cure[id]) delete cure[id];
    else return;
    write("cure", cure);
  }
  const KINDS = [["feed", "Concime"], ["prune", "Potatura"], ["tip", "Germogli accorciati"], ["pot", "Rinvaso"], ["clean", "Foglie pulite"], ["cura", "Trattamento"], ["altro", "Altro"]];
  const nameOf = c => KINDS.find(k => k[0] === c.k)?.[1] || c.t || "Cura";
  function history() {
    const cure = map("cure"), list = Object.entries(cure).sort((a, b) => b[1].d.localeCompare(a[1].d) || b[0].localeCompare(a[0]));
    $("h-last").replaceChildren(...[["feed", "Concime"], ["prune", "Potatura"], ["pot", "Rinvaso"]].map(([k, name]) => {
      const found = list.find(([, c]) => c.k === k);
      return row(name, found ? ago(found[1].d) + " · " + shortDay(found[1].d) : "Mai segnato");
    }));
    $("h-empty").hidden = list.length > 0;
    $("h-list").hidden = !list.length;
    $("h-list").replaceChildren(...list.slice(0, 100).map(([id, c]) => row(nameOf(c), shortDay(c.d) + (c.n ? " · " + c.n : ""), remove(nameOf(c) + " del " + shortDay(c.d), () => {
      const now = map("cure"), done = map("done");
      delete now[id]; write("cure", now);
      if (done[c.k] === c.d) { delete done[c.k]; write("done", done); }
      window.reloadData(); history();
    }))));
  }
  function form(open) {
    $("h-form").hidden = !open; $("h-new").hidden = open;
    if (!open) return;
    const mine = Bonsai.mine(data()).map(m => [m.id, m.t]);
    $("h-kind").replaceChildren(...[...KINDS, ...mine].map(([v, t]) => { const o = el("option", t); o.value = v; return o; }));
    $("h-date").value = today(); $("h-date").max = today(); $("h-note").value = "";
  }
  $("h-new").onclick = () => form(true);
  $("h-cancel").onclick = () => form(false);
  $("h-form").onsubmit = e => {
    e.preventDefault();
    const day = $("h-date").value, k = $("h-kind").value, cure = map("cure");
    if (!isDay(day) || day > today() || day < "2000") return $("h-date").focus();
    cure[Date.now() + "-" + random(6, "abcdefghijklmnopqrstuvwxyz")] = { d: day, k, t: $("h-kind").selectedOptions[0].textContent, n: $("h-note").value.trim().slice(0, 200) };
    write("cure", cure); form(false); window.reloadData(); history();
  };

  // ---------- Promemoria personali ----------
  function mine() {
    const d = data(), day = today(), list = Bonsai.mine(d);
    $("m-list").hidden = !list.length;
    $("m-empty").hidden = list.length > 0;
    $("m-list").replaceChildren(...list.map(m => {
      const open = Bonsai.since(m, d, day);
      const when = open ? "da fare" : "il " + shortDay(Bonsai.next(m, d, day).toISOString().slice(0, 10));
      return row(m.t, m.every + " · " + when, remove(m.t, () => {
        const now = map("mie"), done = map("done");
        delete now[m.id]; delete done[m.id]; write("mie", now); write("done", done);
        window.reloadData();
      }));
    }));
  }
  function mineForm(open) {
    $("m-form").hidden = !open; $("m-new").hidden = open; $("m-msg").hidden = true;
    if (open) { $("m-what").value = ""; $("m-n").value = "1"; $("m-unit").value = "s"; $("m-from").value = today(); $("m-from").min = today(); }
  }
  $("m-new").onclick = () => mineForm(true);
  $("m-cancel").onclick = () => mineForm(false);
  $("m-form").onsubmit = e => {
    e.preventDefault();
    const t = $("m-what").value.trim().slice(0, 40), n = Number($("m-n").value), u = $("m-unit").value, dal = $("m-from").value, list = map("mie");
    const wrong = !t ? "Scrivi cosa ricordarti." : !(Number.isInteger(n) && n >= 1 && n <= 365) ? "Scegli ogni quanto, da 1 a 365." : !isDay(dal) || dal < "2000" || dal > "2099" ? "Scegli da quando." : Object.keys(list).length >= 30 ? "Hai già 30 promemoria: eliminane uno." : "";
    if (wrong) { $("m-msg").textContent = wrong; $("m-msg").hidden = false; return; }
    list["x" + random(10, "abcdefghijklmnopqrstuvwxyz")] = { t, n, u, dal };
    write("mie", list); mineForm(false); window.reloadData();
  };

  // ---------- Quando sei via ----------
  const trip = () => { const v = map("via"); return isDay(v.da) && isDay(v.a) && today() < v.a ? v : null; };
  function away() {
    const v = trip();
    $("v-form").hidden = !!v; $("v-on").hidden = !v; $("v-msg").hidden = true;
    if (v) $("v-text").textContent = "Promemoria in pausa da " + longDay(v.da) + ". Tornano " + longDay(v.a) + ".";
    else { $("v-from").value = $("v-from").value || today(); $("v-from").min = $("v-to").min = today(); }
  }
  // In "Oggi": un avviso finché il viaggio è segnato.
  function banner() {
    const v = trip();
    $("v-banner").hidden = !v;
    if (!v) return;
    const gone = v.da <= today();
    $("v-title").textContent = gone ? "Sei via" : "Parti " + longDay(v.da);
    $("v-sub").textContent = gone ? "Promemoria in pausa fino a " + longDay(v.a) : "Tocca per le istruzioni da lasciare";
  }
  $("v-form").onsubmit = e => {
    e.preventDefault();
    const da = $("v-from").value, a = $("v-to").value;
    const wrong = !isDay(da) || !isDay(a) ? "Scegli quando parti e quando torni." : da < today() || a <= da || a > "2099" ? "Il rientro deve venire dopo la partenza." : "";
    if (wrong) { $("v-msg").textContent = wrong; $("v-msg").hidden = false; return; }
    write("via", { da, a }); window.reloadData(); away();
  };
  $("v-off").onclick = () => { write("via", {}); $("v-from").value = $("v-to").value = ""; window.reloadData(); away(); };
  const period = () => { const v = trip(); return v ? "Da " + longDay(v.da) + " a " + longDay(v.a) + ".\n" : ""; };

  window.Cure = { data, log, history, mine, away, banner, period, closeForms() { form(false); mineForm(false); } };
})();
