export function initCarousel({ viewport, prevBtn, nextBtn, dotsContainer, itemCount, visibleCount = 4 }) { if (!viewport || itemCount === 0) return; // ========================================================= // CONFIGURATION // ========================================================= const gap = parseFloat(getComputedStyle(viewport).gap) || 18; let autoScrollAnimation = null; let autoScrollPaused = false; let loopDistance = null; // ========================================================= // CARTES ORIGINALES // ========================================================= const originalCards = [ ...viewport.querySelectorAll('.featured-card') ]; if (originalCards.length === 0) return; // ========================================================= // CALCUL DU NOMBRE DE PAGES // ========================================================= const pageCount = Math.max( 1, Math.ceil(itemCount / visibleCount) ); // ========================================================= // DOTS // ========================================================= if (dotsContainer) { dotsContainer.innerHTML = Array.from( { length: pageCount }, (_, i) => `<span data-page="${i}" class="${ i === 0 ? 'active' : '' }"></span>` ).join(''); // Cliquer sur un point dotsContainer.querySelectorAll('span').forEach(dot => { dot.addEventListener('click', () => { const page = Number(dot.dataset.page); const card = viewport.querySelector('.featured-card'); if (!card) return; const cardWidth = card.getBoundingClientRect().width; const position = page * (cardWidth + gap) * visibleCount; pauseAutoScroll(); viewport.scrollTo({ left: position, behavior: 'smooth' }); updateDots(page); resumeAutoScroll(); }); }); } // ========================================================= // MISE À JOUR DES DOTS // ========================================================= function updateDots(index = null) { if (!dotsContainer) return; const dots = dotsContainer.querySelectorAll('span'); if (dots.length === 0) return; if (index === null) { const maxScroll = viewport.scrollWidth - viewport.clientWidth; if (maxScroll <= 0) { index = 0; } else { const progress = viewport.scrollLeft / maxScroll; index = Math.round( progress * (pageCount - 1) ); } } index = Math.max( 0, Math.min(index, dots.length - 1) ); dots.forEach((dot, i) => { dot.classList.toggle( 'active', i === index ); }); } // ========================================================= // NAVIGATION MANUELLE // ========================================================= function scrollByPage(direction) { const card = viewport.querySelector('.featured-card'); if (!card) return; const cardWidth = card.getBoundingClientRect().width; const distance = (cardWidth + gap) * visibleCount; pauseAutoScroll(); viewport.scrollBy({ left: direction * distance, behavior: 'smooth' }); // Reprise après le mouvement setTimeout(() => { resumeAutoScroll(); }, 900); } prevBtn?.addEventListener('click', () => { scrollByPage(-1); }); nextBtn?.addEventListener('click', () => { scrollByPage(1); }); // ========================================================= // DÉTECTION DU SCROLL // ========================================================= let scrollTimeout; viewport.addEventListener('scroll', () => { clearTimeout(scrollTimeout); scrollTimeout = setTimeout(() => { updateDots(); }, 80); }); // ========================================================= // CONSTRUCTION DE LA BOUCLE // ========================================================= function prepareInfiniteLoop() { const maxScroll = viewport.scrollWidth - viewport.clientWidth; // Si le contenu dépasse déjà le viewport, // on crée une copie complète à la suite. if (maxScroll > 0) { const firstSetWidth = viewport.scrollWidth; originalCards.forEach(card => { viewport.appendChild( card.cloneNode(true) ); }); loopDistance = firstSetWidth + gap; return; } // Si toutes les cartes tiennent dans le viewport, // on doit créer plusieurs copies pour obtenir // suffisamment de contenu pour défiler. let safety = 0; while ( viewport.scrollWidth <= viewport.clientWidth * 2 && safety < 10 ) { originalCards.forEach(card => { viewport.appendChild( card.cloneNode(true) ); }); safety++; } const firstSetCards = originalCards.length; const firstSet = [...viewport.children].slice( 0, firstSetCards ); const width = firstSet.reduce( (total, card) => total + card.getBoundingClientRect().width, 0 ); loopDistance = width + gap * (firstSetCards - 1); } // ========================================================= // PAUSE / REPRISE // ========================================================= function pauseAutoScroll() { autoScrollPaused = true; } function resumeAutoScroll() { clearTimeout(resumeAutoScroll.timeout); resumeAutoScroll.timeout = setTimeout(() => { autoScrollPaused = false; }, 900); } // ========================================================= // AUTO-SCROLL // ========================================================= function startAutoScroll() { cancelAnimationFrame( autoScrollAnimation ); function animate() { if (!autoScrollPaused && loopDistance !== null) { viewport.scrollLeft += 0.5; // Lorsque la première série est dépassée, // on revient exactement à son début. if ( viewport.scrollLeft >= loopDistance ) { viewport.scrollLeft -= loopDistance; } } autoScrollAnimation = requestAnimationFrame(animate); } autoScrollAnimation = requestAnimationFrame(animate); } // ========================================================= // PAUSE AU SURVOL / TOUCH // ========================================================= viewport.addEventListener('mouseenter', () => { pauseAutoScroll(); }); viewport.addEventListener('mouseleave', () => { resumeAutoScroll(); }); viewport.addEventListener( 'touchstart', () => { pauseAutoScroll(); }, { passive: true } ); viewport.addEventListener( 'touchend', () => { resumeAutoScroll(); }, { passive: true } ); // ========================================================= // INITIALISATION // ========================================================= prepareInfiniteLoop(); updateDots(0); startAutoScroll(); }       0
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
