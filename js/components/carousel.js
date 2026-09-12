export function initCarousel({
  viewport,
  prevBtn,
  nextBtn,
  dotsContainer,
  itemCount,
  visibleCount = 4
}) {
  if (!viewport || itemCount === 0) return;

  if (viewport.dataset.carouselInitialized === 'true') return;
  viewport.dataset.carouselInitialized = 'true';

  const AUTO_SPEED = 35;

  const pageCount = Math.max(
    1,
    Math.ceil(itemCount / visibleCount)
  );

  /* =========================
     DOTS
  ========================= */

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from(
      { length: pageCount },
      (_, i) =>
        `<span data-page="${i}" class="${
          i === 0 ? 'active' : ''
        }"></span>`
    ).join('');
  }

  /* =========================
     CARTES ORIGINALES
  ========================= */

  const originalCards = [
    ...viewport.querySelectorAll('.featured-card')
  ];

  if (originalCards.length === 0) return;

  /* =========================
     MESURE D'UN ENSEMBLE
  ========================= */

  function getSetWidth() {
    const firstOriginal = originalCards[0];

    const firstClone = viewport.querySelector(
      '[data-carousel-clone="true"]'
    );

    if (!firstOriginal || !firstClone) {
      return 0;
    }

    return (
      firstClone.offsetLeft -
      firstOriginal.offsetLeft
    );
  }

  /* =========================
     PREMIER ENSEMBLE DE COPIES
  ========================= */

  originalCards.forEach((card) => {
    const clone = card.cloneNode(true);

    clone.dataset.carouselClone = 'true';

    viewport.appendChild(clone);
  });

  let setWidth = getSetWidth();

  if (setWidth <= 0) return;

  /* =========================
     AJOUT DE COPIES SI BESOIN
     
     Cela évite que le carrousel
     arrive au bout avant d'avoir
     atteint une boucle complète.
  ========================= */

  while (
    viewport.scrollWidth <
    setWidth + viewport.clientWidth + 2
  ) {
    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);

      clone.dataset.carouselClone = 'true';

      viewport.appendChild(clone);
    });
  }

  /* =========================
     BOUTONS
  ========================= */

  function getCardStep() {
    const card = originalCards[0];

    if (!card) return 0;

    const cardWidth =
      card.getBoundingClientRect().width;

    const style =
      window.getComputedStyle(viewport);

    const gap =
      parseFloat(
        style.columnGap ||
        style.gap ||
        '18'
      ) || 18;

    return cardWidth + gap;
  }

  function scrollByPage(direction) {
    const step = getCardStep();

    if (step <= 0) return;

    const distance =
      step * visibleCount;

    /*
      Si on revient avant le début,
      on se replace sur une copie
      identique plus loin.
    */

    if (
      direction < 0 &&
      viewport.scrollLeft <= 0
    ) {
      setWidth = getSetWidth();

      if (setWidth > 0) {
        viewport.scrollLeft = setWidth;
      }
    }

    viewport.scrollBy({
      left: direction * distance,
      behavior: 'smooth'
    });
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
    if (!dotsContainer) return;

    setWidth = getSetWidth();

    if (setWidth <= 0) return;

    let position =
      viewport.scrollLeft % setWidth;

    if (position < 0) {
      position += setWidth;
    }

    const progress =
      position / setWidth;

    const activeIndex = Math.min(
      pageCount - 1,
      Math.floor(
        progress * pageCount
      )
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
     DÉFILEMENT AUTOMATIQUE
  ========================= */

  let animationFrame = null;
  let lastTime = null;

  function animate(currentTime) {
    if (lastTime === null) {
      lastTime = currentTime;
    }

    const deltaTime =
      currentTime - lastTime;

    lastTime = currentTime;

    setWidth = getSetWidth();

    if (setWidth > 0) {
      const movement =
        AUTO_SPEED *
        (deltaTime / 1000);

      viewport.scrollLeft += movement;

      /*
        On a parcouru exactement
        une série de cartes.

        On revient au même contenu
        visuel, mais sur la copie
        suivante.

        Résultat :
        boucle continue sans saut
        visible.
      */

      if (
        viewport.scrollLeft >=
        setWidth
      ) {
        viewport.scrollLeft -= setWidth;
      }

      updateDots();
    }

    animationFrame =
      requestAnimationFrame(animate);
  }

  animationFrame =
    requestAnimationFrame(animate);

  /* =========================
     NETTOYAGE
  ========================= */

  window.addEventListener(
    'beforeunload',
    () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame
        );
      }
    },
    { once: true }
  );
  }
