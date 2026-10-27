(() => { "use strict";

const mascot = document.getElementById("bullo-mascot"); const leftPupil = document.getElementById("bullo-pupil-left"); const rightPupil = document.getElementById("bullo-pupil-right");

if (!mascot || !leftPupil || !rightPupil) { console.warn("Bullo : éléments SVG ou conteneur introuvables."); return; }

const isTouch = window.matchMedia("(hover: none), (pointer: coarse)"); const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const MAX_X = 5; const MAX_Y = 5; const NEAR_DESKTOP = 125; const NEAR_MOBILE = 85;

let pointerX = -10000; let pointerY = -10000; let hidden = false; let timer = null; let raf = null;

function setState(state) { mascot.classList.remove( "is-visible", "is-hiding", "is-hesitating" ); mascot.classList.add(state); hidden = state === "is-hiding"; }

function movePupils(x, y) { const box = mascot.getBoundingClientRect();

if (!box.width || !box.height) return; const centerX = box.left + box.width / 2; const centerY = box.top + box.height / 2; const dx = x - centerX; const dy = y - centerY; const length = Math.hypot(dx, dy) || 1; const nx = dx / length; const ny = dy / length; const px = nx * MAX_X; const py = ny * MAX_Y; leftPupil.setAttribute("transform", `translate(${px} ${py})`); rightPupil.setAttribute("transform", `translate(${px} ${py})`); 

}

function distanceToMascot(x, y) { const r = mascot.getBoundingClientRect(); const cx = Math.max(r.left, Math.min(x, r.right)); const cy = Math.max(r.top, Math.min(y, r.bottom)); return Math.hypot(x - cx, y - cy); }

function clearTimer() { if (timer !== null) { clearTimeout(timer); timer = null; } }

function scheduleReturn() { clearTimer();

timer = setTimeout(() => { if (isTouch.matches) { setState("is-hesitating"); timer = setTimeout(() => { setState("is-visible"); }, 500); return; } if ( distanceToMascot(pointerX, pointerY) < (window.innerWidth < 600 ? NEAR_MOBILE : NEAR_DESKTOP) ) { scheduleReturn(); return; } setState("is-hesitating"); timer = setTimeout(() => { if ( distanceToMascot(pointerX, pointerY) < (window.innerWidth < 600 ? NEAR_MOBILE : NEAR_DESKTOP) ) { setState("is-hiding"); scheduleReturn(); } else { setState("is-visible"); } }, 500); }, 850); 

}

function hideBullo() { if (hidden) return;

clearTimer(); setState("is-hiding"); scheduleReturn(); 

}

document.addEventListener("pointermove", (event) => { if (event.pointerType !== "mouse" && event.pointerType !== "pen") { return; }

pointerX = event.clientX; pointerY = event.clientY; if (!hidden) { if ( distanceToMascot(pointerX, pointerY) < (window.innerWidth < 600 ? NEAR_MOBILE : NEAR_DESKTOP) ) { hideBullo(); } else if (mascot.getBoundingClientRect().width > 0) { if (raf !== null) cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!hidden) movePupils(pointerX, pointerY); }); } } else { scheduleReturn(); } 

}, { passive: true });

mascot.addEventListener("click", () => { if (!isTouch.matches) return;

clearTimer(); if (!hidden) { setState("is-hiding"); scheduleReturn(); } else { setState("is-hesitating"); timer = setTimeout(() => { setState("is-visible"); }, 500); } 

});

mascot.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault();

if (!hidden) { hideBullo(); } } 

});

setState("is-hiding");

timer = setTimeout(() => { setState("is-hesitating");

timer = setTimeout(() => { setState("is-visible"); }, reducedMotion.matches ? 0 : 650); 

}, reducedMotion.matches ? 0 : 400); })();

