// Calendario di cura, condiviso tra app e notifiche. Modifica qui le frequenze.
(function (root) {
  const DAY = 864e5;
  const utc = s => new Date(s + "T12:00:00Z");
  const sunday = d => d.getUTCDay() === 0;
  const md = d => d.toISOString().slice(5, 10);
  const TASKS = [
    { id: "soil", icon: "drop", short: "Se è asciutta, bagna", group: "often", every: "Ogni sera", t: "Tocca la terra", d: "Se in superficie è asciutta, bagna bene e svuota il sottovaso.", on: () => true },
    { id: "turn", icon: "turn", short: "Un quarto di giro", group: "often", every: "Ogni domenica", t: "Ruota il vaso", d: "Un quarto di giro, per una luce uniforme.", on: sunday },
    { id: "leaf", icon: "eye", short: "Parassiti e macchie", group: "often", every: "Una domenica sì e una no", t: "Controlla le foglie", d: "Cerca parassiti, macchie o tante foglie gialle.",
      on: d => sunday(d) && Math.round((d - utc("2026-11-29")) / DAY) % 14 === 0 },
    { id: "feed", icon: "feed", short: "Dosi da etichetta", group: "season", every: "Il 1° del mese, mar–ott", t: "Concima", d: "Dosi da etichetta. Salta se le palline a lenta cessione sono ancora attive.",
      on: d => d.getUTCDate() === 1 && d.getUTCMonth() >= 2 && d.getUTCMonth() <= 9 },
    { id: "prune", icon: "cut", short: "Prima dei nuovi germogli", group: "season", every: "Ogni fine febbraio", t: "Potatura", d: "Accorcia i rametti lunghi, prima della nuova crescita.", on: d => md(d) === "02-27" },
    { id: "pot", icon: "pot", short: "In primavera", group: "season", every: "Ogni due anni", t: "Valuta il rinvaso", d: "Ogni 2-3 anni, in primavera.",
      on: d => md(d) === "03-15" && d.getUTCFullYear() >= 2028 && d.getUTCFullYear() % 2 === 0 }
  ];
  const due = day => TASKS.filter(k => k.on(utc(day)));
  function next(task, day) {
    for (let i = 1; i <= 1100; i++) {
      const d = new Date(+utc(day) + i * DAY);
      if (task.on(d)) return d;
    }
    return null;
  }
  const api = { TASKS, due, next };
  if (typeof module !== "undefined") module.exports = api; else root.Bonsai = api;
})(this);
