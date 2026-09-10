import { supabase } from '../config/supabase.js';
import { createCard, createFeaturedCard } from '../components/card.js';
import { initCarousel } from '../components/carousel.js';

const featuredContainer = document.getElementById('featuredCarousel');
const recentContainer = document.getElementById('recent-grid');

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Délai dépassé en contactant Supabase')),
        ms
      )
    )
  ]);
}

/**
 * Calcule le nombre total de vues de chaque œuvre
 * en additionnant les vues de tous ses chapitres.
 *
 * Exemple :
 * Œuvre A
 * ├── Chapitre 1 → 2 vues
 * ├── Chapitre 2 → 5 vues
 * └── Chapitre 3 → 3 vues
 *
 * Total → 10 vues
 */
async function attachSeriesViews(series) {
  if (!series || series.length === 0) {
    return series;
  }

  const seriesIds = series.map(seriesItem => seriesItem.id);

  // 1. Récupérer les chapitres de toutes les œuvres
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, series_id')
    .in('series_id', seriesIds);

  if (chaptersError) {
    console.error(
      'Erreur récupération des chapitres pour les vues :',
      chaptersError
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      views: 0
    }));
  }

  if (!chapters || chapters.length === 0) {
    return series.map(seriesItem => ({
      ...seriesItem,
      views: 0
    }));
  }

  const chapterIds = chapters.map(chapter => chapter.id);

  // 2. Récupérer toutes les vues de ces chapitres
  const { data: views, error: viewsError } = await supabase
    .from('chapter_views')
    .select('chapter_id')
    .in('chapter_id', chapterIds);

  if (viewsError) {
    console.error(
      'Erreur récupération des vues :',
      viewsError
    );

    return series.map(seriesItem => ({
      ...seriesItem,
      views: 0
    }));
  }

  // 3. Compter les vues par chapitre
  const viewsByChapter = {};

  for (const view of views || []) {
    viewsByChapter[view.chapter_id] =
      (viewsByChapter[view.chapter_id] || 0) + 1;
  }

  // 4. Additionner les vues des chapitres par œuvre
  const viewsBySeries = {};

  for (const chapter of chapters) {
    const chapterViews =
      viewsByChapter[chapter.id] || 0;

    viewsBySeries[chapter.series_id] =
      (viewsBySeries[chapter.series_id] || 0) + chapterViews;
  }

  // 5. Ajouter le total à chaque œuvre
  return series.map(seriesItem => ({
    ...seriesItem,
    views: viewsBySeries[seriesItem.id] || 0
  }));
}

async function loadHomePage() {
  const { data: rawSeries, error } = await withTimeout(
    supabase
      .from('series')
      .select('*')
  );

  if (error) {
    console.error(
      'Erreur Supabase (series):',
      error
    );

    if (recentContainer) {
      recentContainer.innerHTML =
        '<p class="error-state">Erreur lors du chargement des histoires.</p>';
    }

    return;
  }

  if (!rawSeries || rawSeries.length === 0) {
    if (recentContainer) {
      recentContainer.innerHTML =
        '<p class="empty-state">Aucune histoire disponible pour le moment.</p>';
    }

    return;
  }

  // ==========================================
  // CALCUL DES VUES RÉELLES
  // ==========================================

  const series = await attachSeriesViews(rawSeries);

  // ==========================================
  // CARROUSEL "À LA UNE"
  // Les œuvres les plus vues
  // ==========================================

  const featured = [...series]
    .sort(
      (a, b) =>
        (Number(b.views) || 0) -
        (Number(a.views) || 0)
    )
    .slice(0, 6);

  if (featuredContainer) {
    featuredContainer.innerHTML =
      featured
        .map(createFeaturedCard)
        .join('');

    initCarousel({
      viewport: featuredContainer,
      prevBtn: document.getElementById('featuredPrev'),
      nextBtn: document.getElementById('featuredNext'),
      dotsContainer: document.getElementById('featuredDots'),
      itemCount: featured.length,
      visibleCount: 4
    });
  }

  // ==========================================
  // "SORTIES RÉCENTES"
  // ==========================================

  const recent = [...series]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .slice(0, 8);

  if (recentContainer) {
    recentContainer.innerHTML =
      recent
        .map(item => createCard(item))
        .join('');
  }
}

loadHomePage().catch(err => {
  console.error(
    'Erreur inattendue au chargement de la page:',
    err
  );

  if (recentContainer) {
    recentContainer.innerHTML =
      `<p class="error-state">
        Impossible de contacter la base de données.
        Vérifie ta connexion et réessaie.
        (${err.message || err})
      </p>`;
  }
});

// =========================
// MENU MOBILE
// =========================

const mobileMenuBtn =
  document.getElementById('mobileMenuBtn');

const navLinks =
  document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen =
      navLinks.classList.toggle('mobile-open');

    mobileMenuBtn.setAttribute(
      'aria-expanded',
      String(isOpen)
    );

    mobileMenuBtn.setAttribute(
      'aria-label',
      isOpen
        ? 'Fermer le menu'
        : 'Ouvrir le menu'
    );

    mobileMenuBtn.textContent =
      isOpen ? '✕' : '☰';
  });

  navLinks
    .querySelectorAll('a')
    .forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove(
          'mobile-open'
        );

        mobileMenuBtn.setAttribute(
          'aria-expanded',
          'false'
        );

        mobileMenuBtn.setAttribute(
          'aria-label',
          'Ouvrir le menu'
        );

        mobileMenuBtn.textContent = '☰';
      });
    });
      }
