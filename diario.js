// Diario: annaffiature (localStorage), foto (IndexedDB) e copia di sicurezza. Tutto resta sul telefono.
(function () {
  // ---------- Acqua ----------
  const log = () => { const l = read("water"); return l && typeof l === "object" ? l : {}; };
  const Acqua = window.Acqua = {
    get: day => log()[day] || null,
    set(day, r) { const l = log(); if (r) l[day] = r; else delete l[day]; return write("water", l); },
    stats(day) {
      const l = log(), w = Object.keys(l).filter(d => l[d] === "w" && d <= day).sort(), last = w[w.length - 1];
      const recent = w.slice(-7);
      return {
        since: last ? daysBetween(last, day) : null,
        every: recent.length >= 3 ? Math.round(daysBetween(recent[0], recent[recent.length - 1]) / (recent.length - 1) * 10) / 10 : null,
        count: w.filter(d => daysBetween(d, day) < 30).length
      };
    }
  };
  const ago = n => n === null ? "Mai" : n === 0 ? "Oggi" : n === 1 ? "Ieri" : n + " giorni fa";
  const STATE = { w: "annaffiata", u: "terra umida" };

  function paintWater() {
    const day = today(), s = Acqua.stats(day);
    $("w-last").textContent = s.since === null ? "Non ancora" : ago(s.since);
    $("w-every").textContent = s.every ? "In media ogni " + String(s.every).replace(".", ",") + " giorni." : "Dopo 3 annaffiature vedrai ogni quanto beve.";
    $("w-count").textContent = s.count === 1 ? "1 volta in 30 giorni" : s.count + " volte in 30 giorni";
    const watered = Acqua.get(day) === "w";
    $("w-now").textContent = watered ? "Annaffiata oggi · annulla" : "Ho annaffiato oggi";
    $("w-now").className = watered ? "quiet" : "sap";
    // Cinque settimane, da lunedì, fino alla domenica di questa settimana.
    const start = shift(day, -((noonOf(day).getUTCDay() + 6) % 7) - 28);
    const cells = [..."LMMGVSD"].map(x => { const h = el("span", x, "wd"); h.setAttribute("aria-hidden", "true"); return h; });
    for (let i = 0; i < 35; i++) {
      const d = shift(start, i), r = Acqua.get(d), b = el("button", String(+d.slice(8)), "day" + (r ? " " + r : "") + (d === day ? " now" : ""));
      b.type = "button"; b.disabled = d > day; b.dataset.day = d;
      b.setAttribute("aria-label", fmt(d, { day: "numeric", month: "long" }) + ": " + (STATE[r] || "niente segnato"));
      cells.push(b);
    }
    $("w-grid").replaceChildren(...cells);
  }

  // ---------- Foto ----------
  let dbp;
  const db = () => dbp || (dbp = new Promise((ok, no) => {
    const r = indexedDB.open("linfa", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("foto", { keyPath: "id" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; no(r.error); };
  }));
  async function store(mode, run) {
    const d = await db();
    return new Promise((ok, no) => {
      const t = d.transaction("foto", mode), req = run(t.objectStore("foto"));
      t.oncomplete = () => ok(req && req.result);
      t.onerror = t.onabort = () => no(t.error);
    });
  }
  const photos = async () => (await store("readonly", s => s.getAll())).sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));

  // Riduce la foto: occupa poco e si apre subito.
  function shrink(file) {
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? ok(b) : no(new Error("foto")), "image/jpeg", .82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error("foto")); };
      img.src = url;
    });
  }

  let urls = [], draft = null, open = null, painting = 0;
  const blobOf = p => new Blob([p.buf], { type: "image/jpeg" });
  const note = text => { $("f-msg").textContent = text; $("f-msg").hidden = !text; };
  const longDay = d => fmt(d, { day: "numeric", month: "long", year: "numeric" });

  async function paintPhotos() {
    const turn = ++painting;
    let list;
    try { list = await photos(); } catch (e) { note("Non riesco ad aprire le foto su questo telefono."); return; }
    if (turn !== painting) return;
    urls.forEach(URL.revokeObjectURL); urls = [];
    const img = (p, alt) => { const i = el("img"), u = URL.createObjectURL(blobOf(p)); urls.push(u); i.src = u; i.alt = alt; return i; };
    const current = open && list.find(p => p.id === open);
    $("f-detail").hidden = !current || !!draft;
    $("f-list").hidden = !!current || !!draft;
    $("f-edit").hidden = !draft;
    if (current) {
      $("f-big").replaceChildren(img(current, "Foto del " + longDay(current.day)));
      $("f-day").textContent = longDay(current.day);
      $("f-text").textContent = current.note || "Nessuna nota.";
      $("f-del").textContent = "Elimina"; $("f-del").dataset.sure = "";
      const file = new File([blobOf(current)], "linfa-" + current.day + ".jpg", { type: "image/jpeg" });
      $("f-share").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      $("f-share").onclick = () => navigator.share({ files: [file] }).catch(() => {});
    }
    $("f-empty").hidden = list.length > 0;
    $("f-compare").hidden = list.length < 2;
    if (list.length >= 2) {
      const a = list[0], b = list[list.length - 1], gap = daysBetween(a.day, b.day);
      $("f-gap").textContent = gap === 0 ? "Stesso giorno" : gap === 1 ? "Un giorno di differenza" : gap + " giorni di differenza";
      $("f-pair").replaceChildren(...[a, b].map(p => { const f = el("figure"); f.append(img(p, "Foto del " + longDay(p.day)), el("figcaption", fmt(p.day, { day: "numeric", month: "short" }))); return f; }));
    }
    $("f-grid").replaceChildren(...list.slice().reverse().map(p => {
      const b = el("button", "", "shot"); b.type = "button";
      b.append(img(p, ""), el("span", fmt(p.day, { day: "numeric", month: "short", ...(p.day.slice(0, 4) !== today().slice(0, 4) && { year: "numeric" }) })));
      b.setAttribute("aria-label", "Apri la foto del " + longDay(p.day));
      b.onclick = () => { open = p.id; paintPhotos(); document.querySelector("main").scrollTop = 0; };
      return b;
    }));
  }
  function closeDraft() { if (draft) URL.revokeObjectURL(draft.url); draft = null; $("f-file").value = ""; }

  let tab = "acqua";
  function show(next) {
    if (next) tab = next;
    for (const t of ["acqua", "foto"]) { $("tab-" + t).setAttribute("aria-pressed", t === tab); $("panel-" + t).hidden = t !== tab; }
    if (tab === "acqua") paintWater(); else paintPhotos();
  }

  $("tab-acqua").onclick = () => show("acqua");
  $("tab-foto").onclick = () => { open = null; show("foto"); };
  $("w-now").onclick = () => { const d = today(); const undo = Acqua.get(d) === "w"; Acqua.set(d, undo ? null : "w"); if (undo) window.clearSoil?.(); else window.pour?.(); paintWater(); window.render?.(); };
  $("w-grid").onclick = e => {
    const b = e.target.closest("button[data-day]"); if (!b) return;
    const d = b.dataset.day, r = Acqua.get(d);
    Acqua.set(d, !r ? "w" : r === "w" ? "u" : null);
    // Togliendo il segno di oggi va via anche il "Fatto" della terra.
    if (d === today() && r === "u") window.clearSoil?.();
    paintWater(); window.render?.();
    $("w-grid").querySelector('[data-day="' + d + '"]').focus({ preventScroll: true });
  };
  $("f-file").onchange = async () => {
    const file = $("f-file").files[0]; if (!file) return;
    note("Preparo la foto…");
    try {
      const blob = await shrink(file);
      closeDraft(); draft = { blob, url: URL.createObjectURL(blob) };
      $("f-preview").src = draft.url; $("f-date").value = today(); $("f-date").max = today(); $("f-note").value = ""; open = null;
      note(""); paintPhotos(); document.querySelector("main").scrollTop = 0;
    } catch (e) { note("Questa foto non si apre: prova con un'altra."); }
  };
  $("f-cancel").onclick = () => { closeDraft(); note(""); paintPhotos(); };
  $("f-save").onclick = async () => {
    if (!draft) return;
    $("f-save").disabled = true;
    try {
      const day = isDay($("f-date").value) && $("f-date").value <= today() ? $("f-date").value : today();
      const buf = await draft.blob.arrayBuffer();
      await store("readwrite", s => s.put({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 8), day, note: $("f-note").value.trim().slice(0, 200), buf }));
      navigator.storage?.persist?.().catch(() => {});
      closeDraft(); note("");
    } catch (e) { note("Salvataggio non riuscito: forse lo spazio è finito."); }
    $("f-save").disabled = false; paintPhotos();
  };
  $("f-back").onclick = () => { open = null; paintPhotos(); };
  $("f-del").onclick = async () => {
    if (!$("f-del").dataset.sure) { $("f-del").dataset.sure = "1"; $("f-del").textContent = "Tocca ancora per eliminare"; return; }
    try { await store("readwrite", s => s.delete(open)); open = null; note(""); } catch (e) { note("Eliminazione non riuscita."); }
    paintPhotos();
  };

  // ---------- Copia di sicurezza (senza il codice delle notifiche, che è privato) ----------
  const say = text => { $("b-msg").textContent = text; $("b-msg").hidden = !text; };
  const toData = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
  let copy = null, incoming = null;
  $("b-make").onclick = async () => {
    try {
      say("Preparo la copia…");
      const foto = [];
      for (const p of await photos()) foto.push({ id: p.id, day: p.day, note: p.note, img: await toData(blobOf(p)) });
      const json = JSON.stringify({ app: "linfa", v: 1, day: today(), data: { done: read("done") || {}, water: log(), dal: read("dal") }, foto });
      copy = new File([json], "linfa-copia-" + today() + ".json", { type: "application/json" });
      $("b-save").hidden = false; say("Copia pronta: " + (foto.length === 1 ? "1 foto" : foto.length + " foto") + ". Ora salvala in File.");
    } catch (e) { say("Copia non riuscita."); }
  };
  // Il salvataggio parte subito dal tocco, come chiede iPhone.
  $("b-save").onclick = () => {
    if (!copy) return;
    if (navigator.canShare && navigator.canShare({ files: [copy] })) { navigator.share({ files: [copy] }).catch(() => {}); return; }
    const a = el("a"), u = URL.createObjectURL(copy); a.href = u; a.download = copy.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  };
  const goodPhoto = p => p && typeof p.id === "string" && isDay(p.day) && typeof p.img === "string" && p.img.startsWith("data:image/jpeg;base64,");
  $("b-file").onchange = async () => {
    const f = $("b-file").files[0]; $("b-file").value = ""; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== "linfa" || !j.data || !Array.isArray(j.foto)) throw new Error();
      incoming = j; $("b-apply").hidden = false;
      say("Copia del " + (isDay(j.day) ? longDay(j.day) : "?") + ": " + j.foto.filter(goodPhoto).length + " foto, " + Object.keys(j.data.water || {}).length + " giorni di acqua. I giorni uguali vengono sostituiti.");
    } catch (e) { incoming = null; $("b-apply").hidden = true; say("Questo file non è una copia di Linfa."); }
  };
  $("b-apply").onclick = async () => {
    if (!incoming) return;
    $("b-apply").disabled = true;
    try {
      const d = incoming.data;
      for (const p of incoming.foto.filter(goodPhoto)) {
        const buf = Uint8Array.from(atob(p.img.slice(p.img.indexOf(",") + 1)), c => c.charCodeAt(0)).buffer;
        await store("readwrite", s => s.put({ id: p.id, day: p.day, note: String(p.note || "").slice(0, 200), buf }));
      }
      const water = log();
      for (const [k, v] of Object.entries(d.water || {})) if (isDay(k) && (v === "w" || v === "u")) water[k] = v;
      write("water", water);
      const done = read("done") || {};
      for (const [k, v] of Object.entries(d.done || {})) if (Bonsai.TASKS.some(t => t.id === k) && isDay(v) && !(done[k] > v)) done[k] = v;
      write("done", done);
      if (isDay(d.dal)) write("dal", d.dal);
      incoming = null; $("b-apply").hidden = true; say("Fatto: i tuoi dati sono tornati.");
      window.reloadData?.();
    } catch (e) { say("Ripristino non riuscito a metà: riprova con lo stesso file."); }
    $("b-apply").disabled = false;
  };

  window.Diario = { show };
})();
