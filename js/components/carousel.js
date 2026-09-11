export function initCarousel({ viewport, prevBtn, nextBtn, dotsContainer, itemCount, visibleCount = 4 }) {
  if (!viewport || itemCount === 0) return;

  const pageCount = Math.max(1, Math.ceil(itemCount / visibleCount));

  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from({ length: pageCount })
      .map((_, i) => `<span data-page="${i}" class="${i === 0 ? 'active' : ''}"></span>`)
      .join('');
  }

  function scrollByPage(direction) {
    const card = viewport.querySelector('.featured-card');
    if (!card) return;
    const cardWidth = card.getBoundingClientRect().width;
    const gap = 18;
    viewport.scrollBy({ left: direction * (cardWidth + gap) * visibleCount, behavior: 'smooth' });
  }

  prevBtn?.addEventListener('click', () => scrollByPage(-1));
  nextBtn?.addEventListener('click', () => scrollByPage(1));

  if (dotsContainer) {
    let scrollTimeout;
    viewport.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const maxScroll = viewport.scrollWidth - viewport.clientWidth;
        const progress = maxScroll > 0 ? viewport.scrollLeft / maxScroll : 0;
        const activeIndex = Math.round(progress * (pageCount - 1));
        dotsContainer.querySelectorAll('span').forEach((dot, i) => {
          dot.classList.toggle('active', i === activeIndex);
        });
      }, 80);
    });
  }

      // =================================================
// ANI// =================================================
// ANIMATION AUTOMATIQUE
// =================================================

let autoScrollTimer;
let autoScrollAnimation;

function startAutoScroll() {

  clearInterval(autoScrollTimer);
  cancelAnimationFrame(autoScrollAnimation);

  const cards = [...viewport.querySelectorAll('.featured-card')];

  if (cards.length === 0) return;

  const initialMaxScroll =
    viewport.scrollWidth - viewport.clientWidth;

  // Si toutes les cartes tiennent dans le viewport,
  // on crée plusieurs copies pour permettre un défilement continu.
  let loopDistance = null;

  if (initialMaxScroll <= 0) {

    const gap =
      parseFloat(getComputedStyle(viewport).gap) || 0;

    const cardsWidth = cards.reduce(
      (total, card) =>
        total + card.getBoundingClientRect().width,
      0
    );

    // Distance entre le début d'une série
    // et le début de la série suivante.
    loopDistance =
      cardsWidth + gap * cards.length;

    // On ajoute suffisamment de copies pour
    // avoir toujours du contenu devant le viewport.
    while (
      viewport.scrollWidth - viewport.clientWidth <
      loopDistance
    ) {

      cards.forEach(card => {
        viewport.appendChild(card.cloneNode(true));
      });
    }
  }

  function animate() {

    if (loopDistance !== null) {

      // Défilement réellement continu
      viewport.scrollLeft += 0.5;

      // Retour invisible au début de la série suivante
      if (viewport.scrollLeft >= loopDistance) {
        viewport.scrollLeft -= loopDistance;
      }

    } else {

      const maxScroll =
        viewport.scrollWidth - viewport.clientWidth;

      if (maxScroll > 0) {

        // Défilement continu
        viewport.scrollLeft += 0.5;

        // Retour au début lorsqu'on arrive à la fin
        if (viewport.scrollLeft >= maxScroll) {
          viewport.scrollLeft = 0;
        }
      }
    }

    autoScrollAnimation =
      requestAnimationFrame(animate);
  }

  autoScrollAnimation =
    requestAnimationFrame(animate);
}

startAutoScroll();}
