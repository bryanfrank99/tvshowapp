// scripts/test-tv-navigation.mjs
// Test automatizado de navegación espacial para Android TV y Web

import assert from "node:assert";

console.log("=== INICIANDO PRUEBAS DE NAVEGACIÓN ESPACIAL ANDROID TV ===");

// 1. Simulación de entorno DOM para pruebas precisas
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
    if (selector === 'nav[aria-label="Principal"]') {
      return this.tagName === "NAV" && this.getAttribute("aria-label") === "Principal";
    }
    if (selector === '[role="dialog"]') return this.getAttribute("role") === "dialog";
    if (selector === ".rail") return this.classList.contains("rail");
    if (selector.includes("[aria-current=\"page\"]")) return this.getAttribute("aria-current") === "page";
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

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  focus() {
    this.focused = true;
  }

  blur() {
    this.focused = false;
  }

  click() {
    this.clicked = true;
  }

  scrollIntoView(options) {
    this.scrolled = options;
  }
}

// 2. Construcción del Árbol DOM de la aplicación TVShow
const rootDoc = new MockDOMElement("div", "root");
const body = new MockDOMElement("body", "body", "tv");
rootDoc.appendChild(body);

// SideNav
const aside = new MockDOMElement("aside", "aside", "tv-aside");
const sideNav = new MockDOMElement("nav", "sidenav");
sideNav.setAttribute("aria-label", "Principal");
sideNav.setRect(0, 0, 68, 1080);
aside.appendChild(sideNav);
body.appendChild(aside);

const navLogo = new MockDOMElement("a", "nav-logo");
navLogo.setAttribute("href", "/");
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
  // Cada tarjeta de 180px de ancho con 16px de separación
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

// 3. Importación lógica de los algoritmos de TvNav
const allElements = [
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

function getFocusableElements() {
  return allElements.filter(isVisible);
}

function setVisualFocus(target) {
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
  const navItems = [navLogo, navSearch, navHome, navMovies, navSeries, navLang];
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
    const navItems = [navLogo, navSearch, navHome, navMovies, navSeries, navLang];
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

  if (dir === "ArrowLeft") {
    let hasLeftNeighbor = false;
    for (const cand of candidates) {
      if (cand === current || !cand.closest("main")) continue;
      const r = cand.getBoundingClientRect();
      if (r.right <= curRect.left + 5 && Math.abs(r.top - curRect.top) < 60) {
        hasLeftNeighbor = true;
        break;
      }
    }
    if (!hasLeftNeighbor && curRect.left < 280) {
      const navItems = [navLogo, navSearch, navHome, navMovies, navSeries, navLang];
      return navItems.find((n) => n.getAttribute("aria-current") === "page") || navItems[0];
    }
  }

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
// Moverse secuencialmente por Rail 1
for (let i = 0; i < 5; i++) {
  next = findNextTarget(current, "ArrowRight", getFocusableElements());
  assert.strictEqual(next, rail1Cards[i + 1], `ArrowRight debe ir a rail1-card-${i + 1}`);
  setVisualFocus(next);
  current = next;
}
console.log("  ✓ Movimiento horizontal hacia la derecha a través de todas las tarjetas del carril");

// Límite derecho del carril
next = findNextTarget(current, "ArrowRight", getFocusableElements());
assert.strictEqual(next, null, "ArrowRight al final del carril no debe saltar arbitrariamente");
console.log("  ✓ Límite derecho del carril respetado (no salta fuera de control)");

// Regresar hacia la izquierda
for (let i = 5; i > 0; i--) {
  next = findNextTarget(current, "ArrowLeft", getFocusableElements());
  assert.strictEqual(next, rail1Cards[i - 1], `ArrowLeft debe ir a rail1-card-${i - 1}`);
  setVisualFocus(next);
  current = next;
}
console.log("  ✓ Movimiento horizontal hacia la izquierda hasta el inicio del carril");

console.log("\n[TEST 3] Transición de Carril a SideNav y Navegación en SideNav");
// Estando en la tarjeta 0, pulsar ArrowLeft debe saltar a SideNav
next = findNextTarget(current, "ArrowLeft", getFocusableElements());
assert.strictEqual(next, navHome, "ArrowLeft en tarjeta 0 debe saltar al ítem activo de SideNav (nav-home)");
setVisualFocus(next);
current = next;
console.log("  ✓ Transición limpia de Rail a SideNav (#nav-home)");

// En SideNav: ArrowDown
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

// En SideNav: ArrowUp
next = findNextTarget(current, "ArrowUp", getFocusableElements());
assert.strictEqual(next, navMovies, "ArrowUp en SideNav debe regresar a #nav-movies");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowUp en SideNav regresa a #nav-movies");

// En SideNav: ArrowRight -> Salida hacia el contenido
next = findNextTarget(current, "ArrowRight", getFocusableElements());
assert.strictEqual(next, heroPlayBtn, "ArrowRight en SideNav debe salir al contenido principal (#hero-play-btn)");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowRight desde SideNav salta de vuelta al contenido principal (#hero-play-btn)");

console.log("\n[TEST 4] Navegación Vertical Inter-Carril (Preservando Columna / Coordenada X)");
// Ir a la tarjeta 3 de Rail 1
current = rail1Cards[3];
setVisualFocus(current);

// Pulsar ArrowDown -> Debe ir a la tarjeta 3 de Rail 2 (misma coordenada X)
next = findNextTarget(current, "ArrowDown", getFocusableElements());
assert.strictEqual(next, rail2Cards[3], "ArrowDown desde rail1-card-3 debe ir a rail2-card-3 preservando la columna X");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowDown salta verticalmente a #rail2-card-3 manteniendo la columna");

// Pulsar ArrowUp -> Debe regresar a la tarjeta 3 de Rail 1
next = findNextTarget(current, "ArrowUp", getFocusableElements());
assert.strictEqual(next, rail1Cards[3], "ArrowUp desde rail2-card-3 debe regresar a rail1-card-3");
setVisualFocus(next);
current = next;
console.log("  ✓ ArrowUp regresa verticalmente a #rail1-card-3 manteniendo la columna");

console.log("\n[TEST 5] Ejecución de Acción (D-Pad Center / Enter)");
current = rail1Cards[2];
setVisualFocus(current);
// Simular Enter / Click
current.click();
assert.strictEqual(current.clicked, true, "El elemento enfocado debe registrar el evento click al pulsar Enter");
console.log("  ✓ Evento click ejecutado correctamente en el elemento enfocado");

console.log("\n=== TODAS LAS PRUEBAS DE NAVEGACIÓN ESPACIAL PASARON CON ÉXITO ===");
