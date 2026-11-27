// Salvataggio online: diario e foto vanno sul server da soli, dopo un accesso con email e password.
// Il telefono resta la copia che si usa; qui si allineano le due.
(function () {
  const URL_DATI = "https://fwwzqbelrfdstlsgtwrf.supabase.co/functions/v1/dati";
  const APIKEY = "sb_publishable_2tL_Nx-qeHqTcpSwhv8kOw_QQtEs0yu"; // pubblica
  const conto = () => { const c = read("nuvola"); return c && c.token ? c : null; };
  const tolte = () => { const t = read("tolte"); return Array.isArray(t) ? t : []; };
  let corre = false, ancora = false, timer, applico = false;

  async function server(azione, dati) {
    const stop = new AbortController(), attesa = setTimeout(() => stop.abort(), 30000);
    try {
      const r = await fetch(URL_DATI, { method: "POST", signal: stop.signal, headers: { "Content-Type": "application/json", apikey: APIKEY }, body: JSON.stringify({ azione, ...dati }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.errore || "Il server non risponde, riprova tra poco."), { status: r.status });
      return j;
    } catch (e) {
      if (e.status) throw e;
      throw Object.assign(new Error("Non riesco a collegarmi: controlla la connessione."), { status: 0 });
    } finally { clearTimeout(attesa); }
  }

  // ---------- Diario (annaffiature, gesti fatti, data di arrivo) ----------
  const locale = () => ({ water: read("water") || {}, done: read("done") || {}, dal: read("dal") || null });
  const uguali = (a, b) => JSON.stringify(ordina(a)) === JSON.stringify(ordina(b));
  const ordina = o => o && typeof o === "object" ? Object.fromEntries(Object.keys(o).sort().map(k => [k, ordina(o[k])])) : o;
  // Unione a tre: quello che è cambiato qui rispetto all'ultima volta vince, il resto viene dall'altra parte.
  function unisci(prima, qui, la) {
    const out = {};
    for (const campo of ["water", "done"]) {
      const b = prima?.[campo] || {}, l = qui[campo] || {}, s = la?.[campo] || {}, m = {};
      for (const k of new Set([...Object.keys(l), ...Object.keys(s)])) {
        const v = l[k] !== b[k] ? l[k] : s[k];
        if (v !== undefined) m[k] = v;
      }
      out[campo] = m;
    }
    // La primissima volta vale la data di arrivo più vecchia.
    if (!prima) out.dal = [qui.dal, la?.dal].filter(isDay).sort()[0] || null;
    else out.dal = qui.dal !== prima.dal ? qui.dal : la?.dal || qui.dal;
    return out;
  }
  function scrivi(d) {
    applico = true;
    write("water", d.water); write("done", d.done); if (d.dal) write("dal", d.dal);
    applico = false;
  }
  async function diario(c) {
    for (let giro = 0; giro < 3; giro++) {
      const s = await server("stato", { token: c.token });
      const qui = locale(), tutto = unisci(c.base, qui, s.dati);
      if (!uguali(tutto, s.dati)) {
        try { await server("salva", { token: c.token, base: s.versione, dati: tutto }); }
        catch (e) { if (e.status === 409) continue; throw e; }
      }
      // Se intanto hai toccato qualcosa, non va perso.
      const adesso = locale(), finale = unisci(qui, adesso, tutto), cambiato = !uguali(finale, adesso);
      if (cambiato) scrivi(finale);
      if (!uguali(finale, tutto)) ancora = true;
      c.base = tutto;
      return { foto: s.foto, cambiato };
    }
    throw new Error("Il diario continua a cambiare: riprovo tra poco.");
  }

  // ---------- Foto ----------
  const base64 = buf => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.slice(r.result.indexOf(",") + 1)); r.onerror = no; r.readAsDataURL(new Blob([buf])); });
  async function foto(c, online) {
    let cambiato = false;
    const daTogliere = tolte();
    for (const id of daTogliere) {
      await server("togli", { token: c.token, id });
      write("tolte", tolte().filter(x => x !== id));
    }
    const qui = new Map((await Foto.tutte()).map(p => [p.id, p]));
    for (const p of online) {
      if (daTogliere.includes(p.id) || tolte().includes(p.id)) continue;
      if (p.tolta) { if (qui.has(p.id)) { await Foto.cancella(p.id); cambiato = true; } continue; }
      if (qui.has(p.id)) continue;
      const { img } = await server("scarica", { token: c.token, id: p.id });
      if (!conto() || tolte().includes(p.id)) continue;
      await Foto.metti({ id: p.id, day: p.day, note: p.note, buf: Uint8Array.from(atob(img), x => x.charCodeAt(0)).buffer });
      cambiato = true;
    }
    const note = new Set([...online.map(p => p.id), ...daTogliere]);
    for (const p of qui.values()) {
      if (note.has(p.id) || tolte().includes(p.id)) continue;
      stato("Salvo le foto…");
      const r = await server("carica", { token: c.token, id: p.id, day: p.day, note: p.note, img: await base64(p.buf) });
      if (r.tolta) { await Foto.cancella(p.id); cambiato = true; }
    }
    return cambiato;
  }

  // ---------- Giro completo ----------
  const stato = text => { $("c-state").textContent = text; };
  const avviso = text => { $("c-msg").textContent = text; $("c-msg").hidden = !text; };
  function mostra() {
    const c = conto();
    $("c-login").hidden = !!c; $("c-in").hidden = !c;
    if (c) $("c-who").textContent = c.email;
  }
  async function allinea() {
    clearTimeout(timer);
    if (corre) { ancora = true; return; }
    const c = conto();
    if (!c) return;
    corre = true; ancora = false; stato("Salvo…");
    const mio = c.token, stessoConto = () => conto()?.token === mio;
    try {
      const d = await diario(c);
      if (!stessoConto()) return;
      write("nuvola", c);
      if (d.cambiato) window.reloadData?.();
      const nuove = await foto(c, d.foto);
      if ((nuove || d.cambiato) && location.hash === "#diario") Diario.show();
      c.quando = Date.now();
      if (!stessoConto()) return;
      write("nuvola", c); avviso("");
      stato("Tutto salvato alle " + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      ancora = false;
      if (!stessoConto()) return;
      if (e.status === 401) { write("nuvola", null); mostra(); avviso(e.message); return; }
      stato("Da salvare");
      avviso(e.status === 0 ? "Sei senza rete: salvo appena torna." : e.message || "Salvataggio non riuscito, riprovo più tardi.");
    } finally {
      corre = false;
      if (ancora) cambia();
    }
  }
  function cambia() {
    if (applico || !conto()) return;
    stato("Da salvare");
    clearTimeout(timer); timer = setTimeout(allinea, 1500);
  }
  window.Nuvola = {
    cambia,
    // Una foto eliminata va tolta anche online, pure se adesso non c'è rete.
    tolta(id) { write("tolte", [...new Set([...tolte(), id])]); cambia(); }
  };

  $("c-login").onsubmit = async e => {
    e.preventDefault();
    const email = $("c-email").value.trim(), password = $("c-pass").value;
    if (!email || password.length < 8) return avviso("Scrivi email e una password di almeno 8 caratteri.");
    $("c-go").disabled = true; avviso("Un momento…");
    try {
      const r = await server("entra", { email, password });
      write("nuvola", { token: r.token, email: r.email });
      $("c-pass").value = ""; avviso(""); mostra();
      navigator.storage?.persist?.().catch(() => {});
      allinea();
    } catch (x) { avviso(x.message); }
    $("c-go").disabled = false;
  };
  $("c-show").onchange = () => { $("c-pass").type = $("c-show").checked ? "text" : "password"; };
  $("c-now").onclick = allinea;
  $("c-out").onclick = () => {
    const c = conto(); if (!c) return;
    server("esci", { token: c.token }).catch(() => {});
    write("nuvola", null); clearTimeout(timer); mostra(); avviso("Sei uscita. I dati restano su questo telefono.");
  };
  addEventListener("online", allinea);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) allinea(); });
  mostra();
  // Parte quando tutta l'app è pronta.
  addEventListener("load", allinea);
})();
