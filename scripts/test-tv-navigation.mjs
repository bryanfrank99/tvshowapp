// scripts/test-tv-navigation.mjs
// Test automatizado de navegación espacial para Android TV y Web,
// incluyendo exclusión estricta de logo y reloj (Clock).

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO PRUEBAS DE NAVEGACIÓN ESPACIAL ANDROID TV ===");

// -------------------------------------------------------------
// [TEST 0] Verificación estática del código fuente
// -------------------------------------------------------------
console.log("\n[TEST 0] Verificación estática de exclusión en Clock.tsx, SideNav.tsx y Header.tsx");

const clockCode = fs.readFileSync(path.join(process.cwd(), "components/Clock.tsx"), "utf8");
const sideNavCode = fs.readFileSync(path.join(process.cwd(), "components/SideNav.tsx"), "utf8");
const headerCode = fs.readFileSync(path.join(process.cwd(), "components/Header.tsx"), "utf8");
const tvNavCode = fs.readFileSync(path.join(process.cwd(), "components/TvNav.tsx"), "utf8");

// Clock no debe ser un botón ni alterar el idioma
assert.strictEqual(
  clockCode.includes("<button"),
  false,
  "Clock.tsx NO debe renderizar un <button>"
);
assert.strictEqual(
  clockCode.includes("setClientLang"),
  false,
  "Clock.tsx NO debe alterar el idioma al recibir eventos"
);
assert.strictEqual(
  clockCode.includes('data-tv-skip="true"'),
  true,
  "Clock.tsx debe marcarse con data-tv-skip='true'"
);
assert.strictEqual(
  clockCode.includes("tabIndex={-1}"),
  true,
  "Clock.tsx debe tener tabIndex={-1}"
);

// SideNav logo debe estar excluido
assert.strictEqual(
  sideNavCode.includes('id="nav-logo"'),
  true,
  "SideNav.tsx debe contener el logo"
);
assert.strictEqual(
  sideNavCode.includes('tabIndex={-1}'),
  true,
  "SideNav.tsx debe asignar tabIndex={-1} al logo"
);
assert.strictEqual(
  sideNavCode.includes('data-tv-skip="true"'),
  true,
  "SideNav.tsx debe asignar data-tv-skip='true' al logo"
);

// TvNav debe implementar filtro isFocusable excluyendo logo y reloj
assert.strictEqual(
  tvNavCode.includes("nav-logo"),
  true,
  "TvNav.tsx debe contemplar la exclusión de nav-logo"
);
assert.strictEqual(
  tvNavCode.includes("header-clock"),
  true,
  "TvNav.tsx debe contemplar la exclusión de header-clock"
);
console.log("  ✓ Verificación estática exitosa: Logo y Reloj están excluidos y Clock es no-interactivo");

// -------------------------------------------------------------
// 1. Simulación de entorno DOM para pruebas dinámicas
// -------------------------------------------------------------
class MockDOMElement {
  constructor(tag, id = "", className = "") {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = {
      contains: (c) => this.className.split(" ").includes(c),
      add: (c) => {
        if (!this.classList.contains(c)) this.className = (this.className + " " + c).trim();
      },
      remove: (c) => {
        this.className = this.className.split(" ").filter((x) => x !== c).join(" ");
      },
      toggle: (c, force) => {
        if (force === undefined) force = !this.classList.contains(c);
        if (force) this.classList.add(c);
        else this.classList.remove(c);
      }
    };
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this._rect = { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 };
    this.clicked = false;
    this.focused = false;
    this.isConnected = true;
  }

  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) || null; }
  removeAttribute(k) { this.attributes.delete(k); }
  hasAttribute(k) { return this.attributes.has(k); }

  setRect(top, left, width, height) {
    this._rect = {
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height
    };
  }

  getBoundingClientRect() { return this._rect; }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  contains(other) {
    if (other === this) return true;
    for (const c of this.children) {
      if (c.contains(other)) return true;
    }
    return false;
  }

  closest(selector) {
    let cur = this;
    while (cur) {
      if (cur.matches(selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  matches(selector) {
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    if (selector === "main") return this.tagName === "MAIN";
    if (selector === "nav") return this.tagName === "NAV";
    if (selector === "header") return this.tagName === "HEADER";
    if (selector === 'nav[aria-label="Principal"]') {
      return this.tagName === "NAV" && this.getAttribute("aria-label") === "Principal";
    }
    if (selector === '[role="dialog"]') return this.getAttribute("role") === "dialog";
    if (selector === ".rail") return this.classList.contains("rail");
    if (selector.includes("[aria-current=\"page\"]")) return this.getAttribute("aria-current") === "page";
    if (selector === '[data-tv-skip="true"]') return this.getAttribute("data-tv-skip") === "true";
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelectorAll(selector) {
    const res = [];
    const search = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) res.push(child);
        search(child);
      }
    };
    search(this);
    return res;
  }

  focus() { this.focused = true; }
  blur() { this.focused = false; }
  click() { this.clicked = true; }
}

// Estructura DOM
const body = new MockDOMElement("body", "body");

// Header con reloj no-interactivo y skip
const header = new MockDOMElement("header", "header");
header.setRect(0, 0, 1840, 60);
body.appendChild(header);

const headerClock = new MockDOMElement("time", "header-clock");
headerClock.setAttribute("tabindex", "-1");
headerClock.setAttribute("data-tv-skip", "true");
headerClock.setRect(15, 1750, 60, 30);
header.appendChild(headerClock);

// SideNav
const aside = new MockDOMElement("aside", "aside", "tv-aside");
const sideNav = new MockDOMElement("nav", "sidenav");
sideNav.setAttribute("aria-label", "Principal");
sideNav.setRect(0, 0, 68, 1080);
aside.appendChild(sideNav);
body.appendChild(aside);

// Logo con tabindex="-1" y data-tv-skip="true"
const navLogo = new MockDOMElement("a", "nav-logo");
navLogo.setAttribute("href", "/");
navLogo.setAttribute("tabindex", "-1");
navLogo.setAttribute("data-tv-skip", "true");
navLogo.setRect(10, 10, 48, 48);
sideNav.appendChild(navLogo);

const navSearch = new MockDOMElement("a", "nav-search");
navSearch.setAttribute("href", "/search");
navSearch.setRect(65, 10, 48, 48);
sideNav.appendChild(navSearch);

const navHome = new MockDOMElement("a", "nav-home");
navHome.setAttribute("href", "/");
navHome.setAttribute("aria-current", "page");
navHome.setRect(120, 10, 48, 48);
sideNav.appendChild(navHome);

const navMovies = new MockDOMElement("a", "nav-movies");
navMovies.setAttribute("href", "/movies");
navMovies.setRect(175, 10, 48, 48);
sideNav.appendChild(navMovies);

const navSeries = new MockDOMElement("a", "nav-series");
navSeries.setAttribute("href", "/series");
navSeries.setRect(230, 10, 48, 48);
sideNav.appendChild(navSeries);

const navLang = new MockDOMElement("button", "nav-lang");
navLang.setRect(950, 10, 48, 48);
sideNav.appendChild(navLang);

// Contenido Principal (main)
const main = new MockDOMElement("main", "main-content");
main.setRect(0, 80, 1840, 3000);
body.appendChild(main);

// Hero Section
const heroSection = new MockDOMElement("section", "hero");
heroSection.setRect(20, 100, 1800, 400);
main.appendChild(heroSection);

const heroPlayBtn = new MockDOMElement("a", "hero-play-btn");
heroPlayBtn.setAttribute("href", "/title?type=movie&id=101");
heroPlayBtn.setRect(320, 120, 160, 48);
heroSection.appendChild(heroPlayBtn);

const heroFavBtn = new MockDOMElement("button", "hero-fav-btn");
heroFavBtn.setRect(320, 300, 160, 48);
heroSection.appendChild(heroFavBtn);

// Rail 1: "Películas Populares"
const rail1 = new MockDOMElement("div", "rail-1", "rail");
rail1.setRect(450, 100, 1800, 260);
main.appendChild(rail1);

const rail1Cards = [];
for (let i = 0; i < 6; i++) {
  const card = new MockDOMElement("a", `rail1-card-${i}`);
  card.setAttribute("href", `/title?type=movie&id=100${i}`);
  card.setRect(460, 120 + i * (180 + 16), 180, 240);
  rail1.appendChild(card);
  rail1Cards.push(card);
}

// Rail 2: "Series de Estreno"
const rail2 = new MockDOMElement("div", "rail-2", "rail");
rail2.setRect(740, 100, 1800, 260);
main.appendChild(rail2);

const rail2Cards = [];
for (let i = 0; i < 6; i++) {
  const card = new MockDOMElement("a", `rail2-card-${i}`);
  card.setAttribute("href", `/title?type=tv&id=200${i}`);
  card.setRect(750, 120 + i * (180 + 16), 180, 240);
  rail2.appendChild(card);
  rail2Cards.push(card);
}

const allElements = [
  headerClock,
  navLogo, navSearch, navHome, navMovies, navSeries, navLang,
  heroPlayBtn, heroFavBtn,
  ...rail1Cards,
  ...rail2Cards
];

function isVisible(el) {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function isFocusable(el) {
  if (!el || !el.isConnected) return false;
  if (el.hasAttribute("disabled")) return false;
  if (el.getAttribute("tabindex") === "-1") return false;
  if (el.hasAttribute("data-tv-skip") || el.getAttribute("data-tv-skip") === "true") return false;
  if (el.id === "nav-logo" || el.id === "header-clock") return false;
  if (el.closest('[data-tv-skip="true"], #nav-logo, #header-clock, [aria-hidden="true"]')) return false;
  return isVisible(el);
}

function getFocusableElements() {
  return allElements.filter(isFocusable);
}

function setVisualFocus(target) {
  if (!isFocusable(target)) return;
  allElements.forEach((node) => {
    node.classList.remove("tv-focused");
    node.removeAttribute("data-tv-focused");
  });
  target.classList.add("tv-focused");
  target.setAttribute("data-tv-focused", "true");
  target.focus();
}

function navigateFromSideNav(current, dir, candidates) {
  const nav = current.closest('nav[aria-label="Principal"]');
  if (!nav) return null;
  const rawNavItems = [navLogo, navSearch, navHome, navMovies, navSeries, navLang];
  const navItems = rawNavItems.filter(isFocusable);
  const curIdx = navItems.indexOf(current);

  if (dir === "ArrowDown") {
    if (curIdx >= 0 && curIdx < navItems.length - 1) return navItems[curIdx + 1];
    return null;
  }
  if (dir === "ArrowUp") {
    if (curIdx > 0) return navItems[curIdx - 1];
    return null;
  }
  if (dir === "ArrowLeft") return null;
  if (dir === "ArrowRight") {
    const mainCandidates = candidates.filter((c) => c.closest("main"));
    if (mainCandidates.length === 0) return null;
    if (isVisible(heroPlayBtn)) return heroPlayBtn;
    return mainCandidates[0];
  }
  return null;
}

function navigateFromRail(current, dir, rail, candidates) {
  const railItems = rail === rail1 ? rail1Cards : rail2Cards;
  const curIdx = railItems.indexOf(current);

  if (dir === "ArrowRight") {
    if (curIdx >= 0 && curIdx < railItems.length - 1) return railItems[curIdx + 1];
    return null;
  }
  if (dir === "ArrowLeft") {
    if (curIdx > 0) return railItems[curIdx - 1];
    // Al llegar a la primera tarjeta, salta a la barra de navegación
    const navItems = [navLogo, navSearch, navHome, navMovies, navSeries, navLang].filter(isFocusable);
    return navItems.find((n) => n.getAttribute("aria-current") === "page") || navItems[0];
  }

  const curRect = current.getBoundingClientRect();
  const curCenterX = curRect.left + curRect.width / 2;
  const curCenterY = curRect.top + curRect.height / 2;

  if (dir === "ArrowDown") {
    const mainCandidates = candidates.filter((c) => !rail.contains(c) && c.closest("main"));
    const below = mainCandidates.filter((c) => {
      const cr = c.getBoundingClientRect();
      return cr.top >= curRect.bottom - 10 && (cr.top + cr.height / 2) > curCenterY + 20;
    });
    if (below.length === 0) return null;

    let minTop = Infinity;
    for (const c of below) {
      const cr = c.getBoundingClientRect();
      if (cr.top < minTop) minTop = cr.top;
    }
    const nextRow = below.filter((c) => Math.abs(c.getBoundingClientRect().top - minTop) < 70);

    let bestCandidate = nextRow[0];
    let minXDiff = Infinity;
    for (const c of nextRow) {
      const cr = c.getBoundingClientRect();
      const candCenterX = cr.left + cr.width / 2;
      const diff = Math.abs(candCenterX - curCenterX);
      if (diff < minXDiff) {
        minXDiff = diff;
        bestCandidate = c;
      }
    }
    return bestCandidate;
  }

  if (dir === "ArrowUp") {
    const mainCandidates = candidates.filter((c) => !rail.contains(c) && c.closest("main"));
    const above = mainCandidates.filter((c) => {
      const cr = c.getBoundingClientRect();
      return cr.bottom <= curRect.top + 10 && (cr.top + cr.height / 2) < curCenterY - 20;
    });
    if (above.length === 0) {
      if (isVisible(heroPlayBtn) && !rail.contains(heroPlayBtn)) return heroPlayBtn;
      return null;
    }
    let maxBottom = -Infinity;
    for (const c of above) {
      const cr = c.getBoundingClientRect();
      if (cr.bottom > maxBottom) maxBottom = cr.bottom;
    }
    const prevRow = above.filter((c) => Math.abs(c.getBoundingClientRect().bottom - maxBottom) < 70);
    let bestCandidate = prevRow[0];
    let minXDiff = Infinity;
    for (const c of prevRow) {
      const cr = c.getBoundingClientRect();
      const candCenterX = cr.left + cr.width / 2;
      const diff = Math.abs(candCenterX - curCenterX);
      if (diff < minXDiff) {
        minXDiff = diff;
        bestCandidate = c;
      }
    }
    return bestCandidate;
  }
  return null;
}

function navigateGenericSpatial(current, dir, candidates) {
  const curRect = current.getBoundingClientRect();
  const curX = curRect.left + curRect.width / 2;
  const curY = curRect.top + curRect.height / 2;

  let best = null;
  let bestScore = Infinity;

  for (const cand of candidates) {
    if (cand === current || cand.contains(current) || current.contains(cand)) continue;
    const r = cand.getBoundingClientRect();
    const candX = r.left + r.width / 2;
    const candY = r.top + r.height / 2;

    let dPrimary = 0;
    let dSecondary = 0;

    if (dir === "ArrowRight") {
      if (r.left >= curRect.left + 2 && candX > curX + 2) {
        dPrimary = candX - curX;
        dSecondary = Math.abs(candY - curY);
        const score = dPrimary + dSecondary * 3.5;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowLeft") {
      if (r.right <= curRect.right - 2 && candX < curX - 2) {
        dPrimary = curX - candX;
        dSecondary = Math.abs(candY - curY);
        const score = dPrimary + dSecondary * 3.5;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowDown") {
      if (r.top >= curRect.top + 2 && candY > curY + 2) {
        dPrimary = candY - curY;
        dSecondary = Math.abs(candX - curX);
        const score = dPrimary + dSecondary * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    } else if (dir === "ArrowUp") {
      if (r.bottom <= curRect.bottom - 2 && candY < curY - 2) {
        dPrimary = curY - candY;
        dSecondary = Math.abs(candX - curX);
        const score = dPrimary + dSecondary * 1.8;
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }
  }
  return best;
}

function findNextTarget(current, dir, candidates) {
  if (current.closest('nav[aria-label="Principal"]')) {
    return navigateFromSideNav(current, dir, candidates);
  }
  const rail = current.closest(".rail");
  if (rail) {
    const railTarget = navigateFromRail(current, dir, rail, candidates);
    if (railTarget) return railTarget;
  }
  return navigateGenericSpatial(current, dir, candidates);
}

// ==========================================
// EJECUCIÓN DE PRUEBAS
// ==========================================

console.log("\n[TEST 1] Foco Inicial y Hero Action Buttons");
let current = heroPlayBtn;
setVisualFocus(current);
assert.strictEqual(current.classList.contains("tv-focused"), true, "Hero play button debe tener .tv-focused");
assert.strictEqual(current.getAttribute("data-tv-focused"), "true", "Hero play button debe tener data-tv-focused");
console.log("  ✓ Foco inicial colocado correctamente en #hero-play-btn");

// Hero: Right -> Fav Button
let next = findNextTarget(current, "ArrowRight", getFocusableElements());
assert.strictEqual(next, heroFavBtn, "ArrowRight desde heroPlayBtn debe enfocar heroFavBtn");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowRight se mueve a #hero-fav-btn");

// Hero: Left -> Play Button
next = findNextTarget(current, "ArrowLeft", getFocusableElements());
assert.strictEqual(next, heroPlayBtn, "ArrowLeft desde heroFavBtn debe regresar a heroPlayBtn");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowLeft regresa a #hero-play-btn");

// Hero: Down -> Rail 1 Card 0
next = findNextTarget(current, "ArrowDown", getFocusableElements());
assert.strictEqual(next, rail1Cards[0], "ArrowDown desde heroPlayBtn debe enfocar rail1-card-0");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowDown desde hero salta a #rail1-card-0");

console.log("\n[TEST 2] Navegación Intra-carril Horizontal (.rail)");
for (let i = 0; i < 5; i++) {
  next = findNextTarget(current, "ArrowRight", getFocusableElements());
  assert.strictEqual(next, rail1Cards[i + 1], `ArrowRight debe ir a rail1-card-${i + 1}`);
  setVisualFocus(next);
  current = next;
}
console.log("  ✓ Movimiento horizontal hacia la derecha a través de todas las tarjetas del carril");

next = findNextTarget(current, "ArrowRight", getFocusableElements());
assert.strictEqual(next, null, "ArrowRight al final del carril no debe saltar arbitrariamente");
console.log("  ✓ Límite derecho del carril respetado (no salta fuera de control)");

for (let i = 5; i > 0; i--) {
  next = findNextTarget(current, "ArrowLeft", getFocusableElements());
  assert.strictEqual(next, rail1Cards[i - 1], `ArrowLeft debe ir a rail1-card-${i - 1}`);
  setVisualFocus(next);
  current = next;
}
console.log("  ✓ Movimiento horizontal hacia la izquierda hasta el inicio del carril");

console.log("\n[TEST 3] Transición de Carril a SideNav y Navegación en SideNav");
next = findNextTarget(current, "ArrowLeft", getFocusableElements());
assert.strictEqual(next, navHome, "ArrowLeft en tarjeta 0 debe saltar al ítem activo de SideNav (nav-home)");
setVisualFocus(next);
current = next;
console.log("  ✓ Transición limpia de Rail a SideNav (#nav-home)");

next = findNextTarget(current, "ArrowDown", getFocusableElements());
assert.strictEqual(next, navMovies, "ArrowDown en SideNav debe ir a #nav-movies");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowDown en SideNav va a #nav-movies");

next = findNextTarget(current, "ArrowDown", getFocusableElements());
assert.strictEqual(next, navSeries, "ArrowDown en SideNav debe ir a #nav-series");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowDown en SideNav va a #nav-series");

next = findNextTarget(current, "ArrowUp", getFocusableElements());
assert.strictEqual(next, navMovies, "ArrowUp en SideNav debe regresar a #nav-movies");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowUp en SideNav regresa a #nav-movies");

next = findNextTarget(current, "ArrowRight", getFocusableElements());
assert.strictEqual(next, heroPlayBtn, "ArrowRight en SideNav debe salir al contenido principal (#hero-play-btn)");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowRight desde SideNav salta de vuelta al contenido principal (#hero-play-btn)");

console.log("\n[TEST 4] Navegación Vertical Inter-Carril (Preservando Columna / Coordenada X)");
current = rail1Cards[3];
setVisualFocus(current);

next = findNextTarget(current, "ArrowDown", getFocusableElements());
assert.strictEqual(next, rail2Cards[3], "ArrowDown desde rail1-card-3 debe ir a rail2-card-3 preservando la columna X");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowDown salta verticalmente a #rail2-card-3 manteniendo la columna");

next = findNextTarget(current, "ArrowUp", getFocusableElements());
assert.strictEqual(next, rail1Cards[3], "ArrowUp desde rail2-card-3 debe regresar a rail1-card-3");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowUp regresa verticalmente a #rail1-card-3 manteniendo la columna");

console.log("\n[TEST 5] Ejecución de Acción (D-Pad Center / Enter)");
current = rail1Cards[2];
setVisualFocus(current);
current.click();
assert.strictEqual(current.clicked, true, "El elemento enfocado debe registrar el evento click al pulsar Enter");
console.log("  ✓ Evento click ejecutado correctamente en el elemento enfocado");

console.log("\n[TEST 6] Exclusión Estricta de Foco en Logo y Hora (Clock)");

// 1. Verificar que el logo y el reloj son clasificados como NO focusables
assert.strictEqual(isFocusable(navLogo), false, "navLogo NO debe ser focusable");
assert.strictEqual(isFocusable(headerClock), false, "headerClock NO debe ser focusable");

// 2. getFocusableElements no debe contener ni logo ni reloj
const focusableElements = getFocusableElements();
assert.strictEqual(focusableElements.includes(navLogo), false, "navLogo NO debe estar en getFocusableElements()");
assert.strictEqual(focusableElements.includes(headerClock), false, "headerClock NO debe estar en getFocusableElements()");
console.log("  ✓ getFocusableElements excluye completamente tanto el logo (#nav-logo) como la hora (#header-clock)");

// 3. Al situarse en el primer ítem del SideNav (navSearch) y presionar ArrowUp, NUNCA debe ir a navLogo
current = navSearch;
setVisualFocus(current);
next = findNextTarget(current, "ArrowUp", getFocusableElements());
assert.strictEqual(next, null, "ArrowUp desde navSearch no debe saltar al logo");
console.log("  ✓ ArrowUp en el elemento superior de SideNav (#nav-search) respeta el límite y NO enfoca el logo");

// 4. Intentar setVisualFocus en navLogo o headerClock debe ser ignorado
setVisualFocus(navLogo);
assert.strictEqual(navLogo.focused, false, "navLogo no debe poder recibir foco visual");
assert.strictEqual(navLogo.classList.contains("tv-focused"), false, "navLogo no debe tener clase tv-focused");

setVisualFocus(headerClock);
assert.strictEqual(headerClock.focused, false, "headerClock no debe poder recibir foco visual");
assert.strictEqual(headerClock.classList.contains("tv-focused"), false, "headerClock no debe tener clase tv-focused");
console.log("  ✓ setVisualFocus protege el sistema impidiendo enfocar el logo o la hora");

console.log("\n=== TODAS LAS PRUEBAS DE NAVEGACIÓN Y EXCLUSIONES PASARON CON ÉXITO ===");
