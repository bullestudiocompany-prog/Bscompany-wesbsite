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

  /* =========================================================
     PETIT CARROUSEL ŒUVRES
     ---------------------------------------------------------
     Ce bloc ne concerne QUE #featuredCarousel.

     Il transforme les œuvres en présentation artistique
     façon éventail japonais :
       - 3 œuvres maximum
       - pas d'auto-scroll
       - pas de clones
       - pas de déplacement
       - pas de points
       - pas de flèches
     ========================================================= */

  if (viewport.id === 'featuredCarousel') {
    viewport.classList.add('featured-showcase');

    const cards = [
      ...viewport.querySelectorAll('.featured-card')
    ];

    /* On garde uniquement les trois premières œuvres
       pour la composition visuelle. */

    cards.forEach((card, index) => {
      if (index >= 3) {
        card.classList.add('featured-hidden');
        return;
      }

      if (index === 0) {
        card.classList.add('fan-left');
      }

      if (index === 1) {
        card.classList.add('fan-center');
      }

      if (index === 2) {
        card.classList.add('fan-right');
      }
    });

    /*
      Les boutons et les points appartiennent encore
      au HTML actuel, mais cette présentation n'en
      a plus besoin.

      On les masque uniquement pour ce petit bloc.
    */

    if (prevBtn) {
      prevBtn.classList.add('featured-control-hidden');
    }

    if (nextBtn) {
      nextBtn.classList.add('featured-control-hidden');
    }

    if (dotsContainer) {
      dotsContainer.classList.add('featured-control-hidden');
    }

    return;
  }

  /* =========================================================
     CARROUSEL CLASSIQUE
     ---------------------------------------------------------
     Tout ce qui suit reste le fonctionnement précédent.
     ========================================================= */

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

  viewport.style.scrollSnapType = 'none';
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

    while (viewport.scrollLeft >= loopPoint) {
      viewport.scrollLeft -= loopPoint;
    }

    while (viewport.scrollLeft < 0) {
      viewport.scrollLeft += loopPoint;
    }
  }

  function scrollByPage(direction) {
    const step = getCardStep();

    if (step <= 0) return;

    const distance =
      step * visibleCount;

    viewport.scrollBy({
      left: direction * distance,
      behavior: 'smooth'
    });

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

    const safeDelta =
      Math.min(deltaTime, 50);

    if (loopPoint <= 0) {
      updateLoopPoint();
    }

    if (loopPoint > 0) {
      const movement =
        AUTO_SPEED *
        (safeDelta / 1000);

      viewport.scrollLeft =
        viewport.scrollLeft + movement;

      normalizePosition();

      updateDots();
    }

    animationFrame =
      requestAnimationFrame(animate);
  }

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
      if (!document.hidden) {
        lastTime = null;
      }
    }
  );
    }
