export function initCarousel({
  viewport,
  prevBtn,
  nextBtn,
  dotsContainer,
  itemCount,
  visibleCount = 4
}) {
  if (!viewport || itemCount === 0) return;

  if (viewport.dataset.carouselInitialized === 'true') {
    return;
  }

  viewport.dataset.carouselInitialized = 'true';

  /* =========================
     CONFIGURATION
  ========================= */

  const AUTO_SPEED = 30;

  /* =========================
     DOTS
  ========================= */

  const pageCount = Math.max(
    1,
    Math.ceil(itemCount / visibleCount)
  );

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from(
      { length: pageCount },
      (_, index) => `
        <span
          data-page="${index}"
          class="${index === 0 ? 'active' : ''}"
        ></span>
      `
    ).join('');
  }

  /* =========================
     CARTES ORIGINALES
  ========================= */

  const originalCards = [
    ...viewport.querySelectorAll('.featured-card')
  ];

  if (originalCards.length <= 1) {
    return;
  }

  /* =========================
     IMPORTANT
  ========================= */

  /*
    Le CSS utilise actuellement :

    scroll-snap-type: x mandatory;

    On le désactive uniquement pour CE
    carrousel afin que le défilement
    automatique reste parfaitement libre.
  */

  viewport.style.scrollSnapType = 'none';

  /*
    On force également le comportement
    de scroll instantané.
    
    Cela évite qu'un éventuel
    scroll-behavior: smooth interfère
    avec notre animation image par image.
  */

  viewport.style.scrollBehavior = 'auto';

  /* =========================
     MESURES
  ========================= */

  function getCardWidth() {
    const card = originalCards[0];

    if (!card) return 0;

    return card.getBoundingClientRect().width;
  }

  function getGap() {
    const style = window.getComputedStyle(viewport);

    const gap =
      parseFloat(style.columnGap) ||
      parseFloat(style.gap);

    return Number.isFinite(gap) ? gap : 18;
  }

  /*
    On mesure la vraie position du premier
    clone au lieu de recalculer la largeur
    avec une formule.

    C'est beaucoup plus fiable entre
    Chrome et Firefox.
  */

  let loopPoint = 0;

  /* =========================
     CLONAGE
  ========================= */

  const firstCloneSet = [];

  originalCards.forEach((card) => {
    const clone = card.cloneNode(true);

    clone.dataset.carouselClone = 'true';

    viewport.appendChild(clone);

    firstCloneSet.push(clone);
  });

  /*
    On ajoute encore plusieurs séries.
    Le viewport aura donc toujours assez
    de contenu devant lui.
  */

  for (let set = 0; set < 3; set++) {
    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);

      clone.dataset.carouselClone = 'true';

      viewport.appendChild(clone);
    });
  }

  /* =========================
     CALCUL DU POINT DE BOUCLE
  ========================= */

  function updateLoopPoint() {
    const firstOriginal = originalCards[0];
    const firstClone = firstCloneSet[0];

    if (!firstOriginal || !firstClone) {
      loopPoint = 0;
      return;
    }

    loopPoint =
      firstClone.offsetLeft -
      firstOriginal.offsetLeft;
  }

  updateLoopPoint();

  /* =========================
     BOUTONS
  ========================= */

  function getCardStep() {
    const width = getCardWidth();
    const gap = getGap();

    if (width <= 0) return 0;

    return width + gap;
  }

  function normalizePosition() {
    if (loopPoint <= 0) return;

    /*
      Si on est arrivé dans la deuxième
      série, on revient exactement à la
      position équivalente de la première.

      La correction est instantanée :
      aucune animation n'est déclenchée.
    */

    while (viewport.scrollLeft >= loopPoint) {
      viewport.scrollLeft -= loopPoint;
    }

    /*
      Sécurité pour les déplacements
      vers la gauche.
    */

    while (viewport.scrollLeft < 0) {
      viewport.scrollLeft += loopPoint;
    }
  }

  function scrollByPage(direction) {
    const step = getCardStep();

    if (step <= 0) return;

    const distance =
      step * visibleCount;

    /*
      On arrête temporairement le déplacement
      automatique pendant le déplacement
      manuel du bouton.
    */

    viewport.scrollBy({
      left: direction * distance,
      behavior: 'smooth'
    });

    /*
      On attend la fin approximative du
      déplacement manuel avant de normaliser.
    */

    setTimeout(() => {
      normalizePosition();
      updateDots();
    }, 450);
  }

  prevBtn?.addEventListener(
    'click',
    () => {
      scrollByPage(-1);
    }
  );

  nextBtn?.addEventListener(
    'click',
    () => {
      scrollByPage(1);
    }
  );

  /* =========================
     DOTS
  ========================= */

  function updateDots() {
    if (!dotsContainer || loopPoint <= 0) {
      return;
    }

    let position =
      viewport.scrollLeft % loopPoint;

    if (position < 0) {
      position += loopPoint;
    }

    const progress =
      position / loopPoint;

    const activeIndex = Math.min(
      pageCount - 1,
      Math.floor(progress * pageCount)
    );

    dotsContainer
      .querySelectorAll('span')
      .forEach((dot, index) => {
        dot.classList.toggle(
          'active',
          index === activeIndex
        );
      });
  }

  viewport.addEventListener(
    'scroll',
    updateDots,
    { passive: true }
  );

  /* =========================
     ANIMATION AUTOMATIQUE
  ========================= */

  let animationFrame = null;
  let lastTime = null;
  let running = true;

  function animate(currentTime) {
    if (!running) return;

    if (lastTime === null) {
      lastTime = currentTime;
    }

    const deltaTime =
      currentTime - lastTime;

    lastTime = currentTime;

    /*
      Si l'onglet a été mis en arrière-plan,
      le navigateur peut suspendre requestAnimationFrame
      puis le relancer avec un énorme deltaTime.

      On limite donc le delta pour éviter
      un gros saut.
    */

    const safeDelta =
      Math.min(deltaTime, 50);

    if (loopPoint <= 0) {
      updateLoopPoint();
    }

    if (loopPoint > 0) {
      const movement =
        AUTO_SPEED *
        (safeDelta / 1000);

      /*
        scrollLeft directement permet
        un mouvement réellement continu.
      */

      viewport.scrollLeft =
        viewport.scrollLeft + movement;

      normalizePosition();

      updateDots();
    }

    animationFrame =
      requestAnimationFrame(animate);
  }

  /*
    On attend que le navigateur ait terminé
    le layout avant de lancer l'animation.
  */

  requestAnimationFrame(() => {
    updateLoopPoint();

    requestAnimationFrame((time) => {
      lastTime = time;
      animationFrame =
        requestAnimationFrame(animate);
    });
  });

  /* =========================
     NETTOYAGE
  ========================= */

  function stopCarousel() {
    running = false;

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  window.addEventListener(
    'beforeunload',
    stopCarousel,
    { once: true }
  );

  document.addEventListener(
    'visibilitychange',
    () => {
      /*
        Quand on revient sur l'onglet,
        on repart avec un nouveau temps de
        référence pour éviter un saut.
      */

      if (!document.hidden) {
        lastTime = null;
      }
    }
  );
}
