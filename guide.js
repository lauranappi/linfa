// Guide: "Qualcosa non va?", le stagioni e cosa fare se parti. Modifica qui i testi.
(function () {
  const DOG = "Se usi un prodotto, segui l'etichetta e tieni lontano il cane.";
  const PROBLEMS = [
    { icon: "eye", t: "Foglie gialle", q: "Com'è la terra?", a: [
      ["Bagnata o fradicia", "Probabilmente troppa acqua", ["Bagna di nuovo solo quando la superficie è asciutta.", "Svuota sempre il sottovaso.", "Controlla che i fori sotto il vaso siano liberi."]],
      ["Secca", "Probabilmente ha avuto sete", ["Immergi il vaso in acqua per qualche minuto, poi lascialo scolare.", "Controlla la terra ogni sera."]],
      ["Umida il giusto", "Forse cambio di posto o poca luce", ["Mettila nel punto più luminoso e lasciala ferma.", "Guarda sotto le foglie: cerca insetti.", "Poche foglie gialle ogni tanto sono normali."]]] },
    { icon: "drop", t: "Foglie secche", q: "Com'è la situazione?", a: [
      ["Croccanti, e la terra è secca", "Mancanza d'acqua", ["Immergi il vaso per qualche minuto, poi lascialo scolare.", "Non potare adesso: aspetta i nuovi germogli.", "Controlla la terra ogni sera."]],
      ["Punte e bordi secchi, terra umida", "Aria secca o troppo sole", ["Allontanala dal termosifone.", "Metti il vaso su ghiaia bagnata, senza immergerlo.", "Evita il sole forte di mezzogiorno."]]] },
    { icon: "turn", t: "Foglie che cadono", q: "È cambiato qualcosa?", a: [
      ["L'ho appena portata a casa o spostata", "Si sta ambientando", ["Lasciala ferma nello stesso punto, con tanta luce.", "Non darle acqua in più: segui la terra.", "Se i rami si seccano, chiedi al vivaio."]],
      ["Fa freddo o c'è uno spiffero", "Colpo di freddo", ["Tienila tra 12 e 22°.", "Allontanala da finestre aperte e porte.", "Di notte staccala dal vetro."]],
      ["Niente di nuovo", "Controlla acqua, aria e insetti", ["Tocca la terra: né secca né fradicia.", "Allontanala dal termosifone.", "Guarda sotto le foglie e sui germogli."]]] },
    { icon: "spot", t: "Macchie", q: "Che aspetto hanno?", a: [
      ["Marroni e secche", "Sole forte o sete", ["Spostala dal sole diretto di mezzogiorno.", "Controlla che la terra non si secchi del tutto."]],
      ["Appiccicose o nerastre", "Spesso è colpa di insetti", ["Pulisci le foglie con un panno umido.", "Cerca cocciniglie o afidi, anche sul tronco."]],
      ["Muffa bianca o grigia", "Possibile fungo", ["Togli le foglie colpite.", "Dalle aria e non bagnare le foglie la sera.", "Se si estende, porta una foto al vivaio."]]] },
    { icon: "bug", t: "Insetti o ragnatele", q: "Cosa vedi?", a: [
      ["Batuffoli bianchi o scudetti marroni", "Cocciniglia", ["Tienila lontana dalle altre piante.", "Toglila con un cotton fioc appena umido d'alcol (prova prima su una foglia).", "Ricontrolla ogni settimana.", DOG]],
      ["Ragnatele sottili e puntini chiari", "Ragnetto rosso", ["Sciacqua la chioma, proteggendo la terra.", "Rendi l'aria meno secca.", "Se resta, chiedi al vivaio un acaricida.", DOG]],
      ["Insettini verdi o neri sui germogli", "Afidi", ["Toglili con un getto d'acqua leggero.", "Se tornano, usa sapone molle diluito come da etichetta.", DOG]],
      ["Moschine bianche che volano", "Mosca bianca", ["Lava la pagina inferiore delle foglie.", "Metti una trappola adesiva gialla.", "Se restano, chiedi al vivaio.", DOG]],
      ["Moscerini che escono dalla terra", "Terra spesso troppo bagnata", ["Lascia asciugare la superficie prima di bagnare.", "Metti una trappola adesiva gialla."]]] }
  ];
  const SEASONS = [
    { m: [11, 12, 1, 2], t: "Mesi freddi", short: "Tanta luce, lontana dal termosifone", rows: [["Luce", "Il punto più luminoso che hai."], ["Temperatura", "Tra 12 e 22°, lontana da termosifoni e spifferi."], ["Acqua", "La terra può asciugare più piano: bagna solo se serve."], ["Concime", "In pausa fino a marzo."], ["Da fare", "A fine febbraio, la potatura."]] },
    { m: [3, 4, 5], t: "Risveglio", short: "Riparte la crescita: torna il concime", rows: [["Luce", "Finestra luminosa, senza sole forte."], ["Temperatura", "Fuori solo quando le notti restano sopra i 15°."], ["Acqua", "Cresce e beve di più: controlla ogni sera."], ["Concime", "Il 1° del mese, dosi da etichetta."], ["Da fare", "Se serve, il rinvaso (ogni 2-3 anni)."]] },
    { m: [6, 7, 8], t: "Gran caldo", short: "La terra asciuga in fretta", rows: [["Luce", "Se va fuori, abituala piano e riparala a mezzogiorno."], ["Temperatura", "All'aperto va bene con notti sopra i 15°."], ["Acqua", "Controlla anche mattina e sera."], ["Concime", "Il 1° del mese, dosi da etichetta."], ["Da fare", "Cerca insetti sotto le foglie."]] },
    { m: [9, 10], t: "Si rientra", short: "In casa prima del fresco", rows: [["Luce", "Torna al punto più luminoso di casa."], ["Temperatura", "Rientro prima che le notti scendano sotto i 15°."], ["Acqua", "Rallenta: segui la terra."], ["Concime", "L'ultima dose a ottobre."], ["Da fare", "Controlla le foglie prima di portarla dentro."]] }
  ];
  const AWAY = [
    ["1-2 giorni", ["Tocca la terra prima di uscire e bagna se è asciutta.", "Lasciala al suo posto, lontana dal termosifone.", "Non lasciare acqua nel sottovaso."]],
    ["3-6 giorni", ["Chiedi a qualcuno di controllare la terra ogni giorno o due.", "Fagli vedere come bagni.", "Metti il vaso su ghiaia bagnata, senza immergerlo.", "Tienila luminosa ma fuori dal sole forte."]],
    ["Oltre 6", ["Organizza qualcuno che passi ogni giorno o due.", "Lascia le istruzioni scritte.", "Non concimare né potare prima di partire.", "Non lasciarla a mollo nell'acqua."]]
  ];
  const now = () => SEASONS.find(s => s.m.includes(new Date().getMonth() + 1));

  function list(items) {
    const ul = el("ul", "", "steps");
    items.forEach(x => ul.append(el("li", x)));
    return ul;
  }
  function choice(label, run, icon) {
    const b = el("button", "", "choice"); b.type = "button";
    if (icon) { const i = el("span", "", "blob"); i.innerHTML = ICONS[icon]; b.append(i); }
    b.append(el("span", label), el("i", "›")); b.onclick = () => { run(); document.querySelector("main").scrollTop = 0; };
    return b;
  }
  function help(p, ans) {
    const box = $("help");
    $("help-kicker").textContent = ans ? p.t : p ? "Una domanda" : "Scegli cosa vedi";
    $("help-title").textContent = ans ? ans[1] : p ? p.q : "Qualcosa non va?";
    if (!p) return box.replaceChildren(...PROBLEMS.map(x => choice(x.t, () => help(x), x.icon)));
    const back = el("button", ans ? "Scegli un altro problema" : "Indietro", "link"); back.type = "button"; back.onclick = () => help();
    if (!ans) return box.replaceChildren(...p.a.map(x => choice(x[0], () => help(p, x))), back);
    const card = el("div", "", "out"); card.append(el("strong", "Cosa fare"), list(ans[2]));
    const photo = el("button", "Fai una foto per il diario", "quiet"); photo.type = "button";
    photo.onclick = () => { Diario.show("foto"); window.go("diario"); };
    box.replaceChildren(card, el("p", "È un'indicazione generale. Se peggiora, porta la pianta o una foto al vivaio.", "mut"), photo, back);
  }
  function season() {
    const s = now();
    $("season-title").textContent = s.t;
    $("season-now").replaceChildren(...s.rows.map(([k, v]) => { const d = el("div", "", "fact"); d.append(el("strong", k), el("span", v)); return d; }));
    $("season-other").replaceChildren(...SEASONS.filter(x => x !== s).map(x => {
      const d = el("details"), sum = el("summary", x.t + " · " + fmt("2027-" + String(x.m[0]).padStart(2, "0") + "-01", { month: "short" }) + "–" + fmt("2027-" + String(x.m[x.m.length - 1]).padStart(2, "0") + "-01", { month: "short" }));
      d.append(sum, ...x.rows.map(([k, v]) => { const f = el("div", "", "fact"); f.append(el("strong", k), el("span", v)); return f; }));
      return d;
    }));
  }
  let trip = 0;
  function away(i = trip) {
    trip = i;
    $("away-tabs").replaceChildren(...AWAY.map(([t], n) => { const b = el("button", t); b.type = "button"; b.setAttribute("aria-pressed", n === i); b.onclick = () => away(n); return b; }));
    $("away-list").replaceChildren(list(AWAY[i][1]));
    $("away-share").hidden = i === 0; $("away-share").textContent = "Condividi le istruzioni";
  }
  $("away-share").onclick = async () => {
    const text = "Come curare il mio bonsai mentre non ci sono:\n" + window.Cure.period() + "• Ogni giorno o due tocca la terra: se in superficie è asciutta, bagna bene.\n• Svuota il sottovaso.\n• Tienila in un punto luminoso, lontana da termosifoni e sole forte.\n• Non concimare e non potare.\n• Lontana dalla portata degli animali.";
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); $("away-share").textContent = "Copiate"; }
    } catch (e) {}
  };
  window.Guide = { help, season, away, now };
})();
