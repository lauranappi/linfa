// Calendario di cura, condiviso tra app e notifiche. Modifica qui le frequenze.
// "keep" sono i giorni in cui una cura resta da fare (e viene ricordata) se non la segni.
(function (root) {
  const DAY = 864e5;
  const utc = s => new Date(s + "T12:00:00Z");
  const iso = d => d.toISOString().slice(0, 10);
  const shift = (day, n) => iso(new Date(+utc(day) + n * DAY));
  const sunday = d => d.getUTCDay() === 0;
  const md = d => d.toISOString().slice(5, 10);
  const month = d => d.getUTCMonth() + 1;
  const TASKS = [
    { id: "soil", icon: "drop", short: "Se è asciutta, bagna", group: "often", every: "Ogni giorno", t: "Tocca la terra", d: "Se in superficie è asciutta, bagna bene e svuota il sottovaso.", keep: 1, on: () => true },
    { id: "turn", icon: "turn", short: "Un quarto di giro", group: "often", every: "Ogni domenica", t: "Ruota il vaso", d: "Un quarto di giro, per una luce uniforme.", keep: 3, on: sunday },
    { id: "leaf", icon: "eye", short: "Parassiti e macchie", group: "often", every: "Una domenica sì e una no", t: "Controlla le foglie", d: "Cerca parassiti, macchie o tante foglie gialle.", keep: 4,
      on: d => sunday(d) && Math.round((d - utc("2026-11-29")) / DAY) % 14 === 0 },
    { id: "clean", icon: "spot", short: "Un panno appena umido", group: "often", every: "Il 15 di ogni mese", t: "Pulisci le foglie", d: "Togli la polvere con delicatezza e le foglie cadute dalla terra.", keep: 7, log: true,
      on: d => d.getUTCDate() === 15 },
    { id: "feed", icon: "feed", short: "Dosi da etichetta", group: "season", every: "Il 1° del mese, mar–ott", t: "Concima", d: "Dosi da etichetta. Salta se le palline a lenta cessione sono ancora attive.", keep: 10, log: true,
      on: d => d.getUTCDate() === 1 && month(d) >= 3 && month(d) <= 10 },
    { id: "tip", icon: "cut", short: "Rametti con 5-6 foglie: lasciane 2-3", group: "season", every: "Il 10 del mese, apr–set", t: "Accorcia i germogli", d: "Solo se la pianta sta bene e ha rametti nuovi lunghi.", keep: 10, log: true,
      on: d => d.getUTCDate() === 10 && month(d) >= 4 && month(d) <= 9 },
    { id: "outside", icon: "sun", short: "Solo con notti sopra i 15°", group: "season", every: "A metà maggio", t: "Se vuoi, portala fuori", d: "Abituala piano, riparata dal sole di mezzogiorno.", keep: 20, log: true,
      on: d => md(d) === "05-15" },
    { id: "inside", icon: "turn", short: "Prima delle notti sotto i 15°", group: "season", every: "A metà settembre", t: "Se è fuori, riportala in casa", d: "Nel punto più luminoso, dopo aver cercato insetti.", keep: 20, log: true,
      on: d => md(d) === "09-15" },
    { id: "prune", icon: "cut", short: "Prima dei nuovi germogli", group: "season", every: "Ogni fine febbraio", t: "Potatura", d: "Accorcia i rametti lunghi, prima della nuova crescita.", keep: 21, log: true, on: d => md(d) === "02-27" },
    { id: "pot", icon: "pot", short: "Radici piene? In primavera", group: "season", every: "Ogni due anni", t: "Valuta il rinvaso", d: "Ogni 2-3 anni, in primavera.", keep: 45, log: true,
      on: d => md(d) === "03-15" && d.getUTCFullYear() >= 2028 && d.getUTCFullYear() % 2 === 0 }
  ];

  // ---------- Promemoria personali: ripartono da quando li fai ----------
  const UNITS = { g: ["Ogni giorno", "giorni"], s: ["Ogni settimana", "settimane"], m: ["Ogni mese", "mesi"] };
  const every = (n, u) => n === 1 ? UNITS[u][0] : "Ogni " + n + " " + UNITS[u][1];
  function add(day, n, u) {
    if (u !== "m") return shift(day, u === "s" ? n * 7 : n);
    const d = utc(day), last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n + 1, 0, 12));
    last.setUTCDate(Math.min(d.getUTCDate(), last.getUTCDate()));
    return iso(last);
  }
  const mine = data => Object.entries(data.mie || {}).filter(([, m]) => m && UNITS[m.u] && m.n >= 1 && m.dal)
    .map(([id, m]) => ({ id, icon: "bell", group: "mine", custom: true, log: true, t: m.t, short: every(m.n, m.u), every: every(m.n, m.u), n: m.n, u: m.u, from: m.dal }))
    .sort((a, b) => a.t.localeCompare(b.t));
  const all = data => [...TASKS, ...mine(data)];

  // Ultima volta in cui è stata fatta, contando anche lo storico.
  function last(task, data, day) {
    const dates = [data.done?.[task.id], ...Object.values(data.cure || {}).filter(c => c.k === task.id).map(c => c.d)];
    return dates.filter(d => d && d <= day).sort().pop() || null;
  }
  // Giorno da cui è da fare, oppure null se per ora è a posto.
  function since(task, data, day) {
    if (task.id === "soil") return data.water?.[day] || data.done?.soil === day ? null : day;
    const done = last(task, data, day);
    if (task.custom) {
      const due = done ? add(done, task.n, task.u) : task.from;
      return due <= day ? due : null;
    }
    for (let i = 0; i < task.keep; i++) {
      const o = shift(day, -i);
      if (!task.on(utc(o))) continue;
      if (data.dal && o < data.dal) return null;
      return done && done >= o ? null : o;
    }
    return null;
  }
  const doneOn = (task, data, day) => task.id === "soil" ? !!(data.water?.[day] || data.done?.soil === day) : data.done?.[task.id] === day;
  // Le cure di un giorno: quelle aperte (con "dal" quando) e quelle segnate quel giorno.
  function agenda(day, data) {
    const todo = [], fatti = [];
    for (const task of all(data)) {
      const from = since(task, data, day);
      if (from) todo.push({ task, from });
      else if (doneOn(task, data, day)) fatti.push(task);
    }
    return { todo, fatti };
  }
  // Prossima volta dopo il giorno indicato.
  function next(task, data, day) {
    if (task.custom) {
      const done = last(task, data, day);
      let d = done ? add(done, task.n, task.u) : task.from;
      if (d <= day) d = add(day, task.n, task.u);
      return utc(d);
    }
    for (let i = 1; i <= 1100; i++) {
      const d = new Date(+utc(day) + i * DAY);
      if (task.on(d)) return d;
    }
    return null;
  }
  const due = day => TASKS.filter(k => k.on(utc(day)));
  // In vacanza dal giorno della partenza a quello prima del rientro.
  const away = (data, day) => !!(data.via?.da && data.via?.a && data.via.da <= day && day < data.via.a);

  const api = { TASKS, due, mine, all, agenda, since, last, next, away, every, add };
  if (typeof module !== "undefined") module.exports = api; else root.Bonsai = api;
})(globalThis);
