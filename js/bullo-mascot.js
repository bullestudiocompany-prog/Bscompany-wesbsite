(() => { "use strict";

const mascot = document.getElementById("bullo-mascot"); if (!mascot) { console.warn("Bullo : conteneur HTML introuvable."); return; }

const isTouch = window.matchMedia("(hover: none), (pointer: coarse)"); const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const MAX_X = 5; const MAX_Y = 5; const NEAR_DESKTOP = 125; const NEAR_MOBILE = 85;

let leftPupil = null; let rightPupil = null; let pointerX = -10000; let pointerY = -10000; let hidden = false; let timer = null; let raf = null;

function setState(state) { mascot.classList.remove( "is-visible", "is-hiding", "is-hesitating" );

mascot.classList.add(state); hidden = state === "is-hiding"; 

}

function clearTimer() { if (timer !== null) { clearTimeout(timer); timer = null; } }

function distanceToMascot(x, y) { const r = mascot.getBoundingClientRect(); const cx = Math.max(r.left, Math.min(x, r.right)); const cy = Math.max(r.top, Math.min(y, r.bottom));

return Math.hypot(x - cx, y - cy); 

}

function movePupils(x, y) { if (!leftPupil || !rightPupil) return;

const box = mascot.getBoundingClientRect(); if (!box.width || !box.height) return; const centerX = box.left + box.width / 2; const centerY = box.top + box.height / 2; const dx = x - centerX; const dy = y - centerY; const length = Math.hypot(dx, dy) || 1; const px = (dx / length) * MAX_X; const py = (dy / length) * MAX_Y; leftPupil.setAttribute("transform", `translate(${px} ${py})`); rightPupil.setAttribute("transform", `translate(${px} ${py})`); 

}

function scheduleReturn() { clearTimer();

timer = setTimeout(() => { if (isTouch.matches) { setState("is-hesitating"); timer = setTimeout(() => { setState("is-visible"); }, 500); return; } const threshold = window.innerWidth < 600 ? NEAR_MOBILE : NEAR_DESKTOP; if (distanceToMascot(pointerX, pointerY) < threshold) { scheduleReturn(); return; } setState("is-hesitating"); timer = setTimeout(() => { if (distanceToMascot(pointerX, pointerY) < threshold) { setState("is-hiding"); scheduleReturn(); } else { setState("is-visible"); } }, 500); }, 850); 

}

function hideBullo() { if (hidden) return;

clearTimer(); setState("is-hiding"); scheduleReturn(); 

}

async function loadBullo() { try { const response = await fetch("img/bullo.svg");

if (!response.ok) { throw new Error(`Impossible de charger img/bullo.svg (${response.status})`); } const svgText = await response.text(); const parser = new DOMParser(); const svgDocument = parser.parseFromString(svgText, "image/svg+xml"); const svg = svgDocument.documentElement; if ( svg.localName !== "svg" || svg.querySelector("parsererror") ) { throw new Error("Le fichier bullo.svg n'est pas un SVG valide."); } const importedSvg = document.importNode(svg, true); importedSvg.removeAttribute("width"); importedSvg.removeAttribute("height"); importedSvg.setAttribute("width", "100%"); importedSvg.setAttribute("height", "100%"); importedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet"); importedSvg.setAttribute("aria-hidden", "true"); importedSvg.style.display = "block"; mascot.replaceChildren(importedSvg); leftPupil = importedSvg.querySelector("#bullo-pupil-left"); rightPupil = importedSvg.querySelector("#bullo-pupil-right"); if (!leftPupil || !rightPupil) { console.warn( "Bullo s'affiche, mais les pupilles n'ont pas été trouvées dans le SVG. Vérifie leurs identifiants." ); } setState("is-hiding"); timer = setTimeout(() => { setState("is-hesitating"); timer = setTimeout(() => { setState("is-visible"); }, reducedMotion.matches ? 0 : 650); }, reducedMotion.matches ? 0 : 400); } catch (error) { console.error("Bullo : erreur de chargement.", error); mascot.textContent = "Bullo n'a pas pu être chargé."; mascot.classList.add("bullo-error"); } 

}

document.addEventListener("pointermove", (event) => { if (event.pointerType !== "mouse" && event.pointerType !== "pen") { return; }

pointerX = event.clientX; pointerY = event.clientY; const threshold = window.innerWidth < 600 ? NEAR_MOBILE : NEAR_DESKTOP; if (!hidden) { if (distanceToMascot(pointerX, pointerY) < threshold) { hideBullo(); } else if (leftPupil && rightPupil) { if (raf !== null) cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!hidden) movePupils(pointerX, pointerY); }); } } else { scheduleReturn(); } 

}, { passive: true });

mascot.addEventListener("click", () => { if (!isTouch.matches) return;

clearTimer(); if (!hidden) { setState("is-hiding"); scheduleReturn(); } else { setState("is-hesitating"); timer = setTimeout(() => { setState("is-visible"); }, 500); } 

});

mascot.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault();

if (!hidden) { hideBullo(); } } 

});

loadBullo(); })();
