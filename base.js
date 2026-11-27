// Piccoli aiuti usati da tutta l'app.
const $ = id => document.getElementById(id);
const today = () => new Date().toLocaleDateString("en-CA");
const read = k => { try { return JSON.parse(localStorage.getItem("linfa:" + k)); } catch (e) { return null; } };
const write = (k, v) => {
  try { localStorage.setItem("linfa:" + k, JSON.stringify(v)); } catch (e) { return false; }
  if (k === "water" || k === "done" || k === "dal") window.Nuvola?.cambia();
  return true;
};
function el(tag, text, cls) { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
const isDay = s => typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s) && !isNaN(Date.parse(s + "T12:00:00Z"));
const noonOf = day => new Date(day + "T12:00:00Z");
const daysBetween = (a, b) => Math.round((noonOf(b) - noonOf(a)) / 864e5);
const shift = (day, n) => new Date(+noonOf(day) + n * 864e5).toISOString().slice(0, 10);
const fmt = (day, o) => noonOf(day).toLocaleDateString("it-IT", { ...o, timeZone: "UTC" });
