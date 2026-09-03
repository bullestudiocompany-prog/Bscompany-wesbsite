import { supabase } from '../config/supabase.js';
import { createCard, createFeaturedCard } from '../components/card.js';
import { initCarousel } from '../components/carousel.js';

const featuredContainer = document.getElementById('featuredCarousel');
const recentContainer = document.getElementById('recent-grid');

async function loadHomePage() {
  const { data: series, error } = await supabase.from('series').select('*');

  if (error) {
    console.error('Erreur Supabase (series):', error);
    recentContainer.innerHTML = '<p class="error-state">Erreur lors du chargement des histoires.</p>';
    return;
  }

  if (!series || series.length === 0) {
    recentContainer.innerHTML = '<p class="empty-state">Aucune histoire disponible pour le moment.</p>';
    return;
  }

  // --- Carrousel "À la une" : les plus vues ---
  const featured = [...series]
    .sort((a, b) => (b.vues ?? b.views ?? 0) - (a.vues ?? a.views ?? 0))
    .slice(0, 6);

  if (featuredContainer) {
    featuredContainer.innerHTML = featured.map(createFeaturedCard).join('');
    initCarousel({
      viewport: featuredContainer,
      prevBtn: document.getElementById('featuredPrev'),
      nextBtn: document.getElementById('featuredNext'),
      dotsContainer: document.getElementById('featuredDots'),
      itemCount: featured.length,
      visibleCount: 4
    });
  }

  // --- Grille "Sorties récentes" : les plus récentes d'abord ---
  const recent = [...series]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8);

  recentContainer.innerHTML = recent.map(item => createCard(item)).join('');
}

loadHomePage();

  // La table chapters est optionnelle : si elle échoue (permissions, colonnes...),
  // le reste de la page s'affiche quand même, juste sans les badges "Chapitre X".
  let chapters = [];
  try {
    const { data, error: chaptersError } = await supabase
      .from('chapters')
      .select('series_id, chapter_number, numero, published_at, created_at');
    if (chaptersError) {
      console.error('Erreur Supabase (chapters):', chaptersError);
    } else {
      chapters = data || [];
    }
  } catch (err) {
    console.error('Exception sur la requête chapters:', err);
  }

  const latestChapterMap = buildLatestChapterMap(chapters);

  // --- Carrousel "À la une" : les plus vues ---
  const featured = [...series]
    .sort((a, b) => (b.vues ?? b.views ?? 0) - (a.vues ?? a.views ?? 0))
    .slice(0, 6);
  if (featuredContainer) {
    featuredContainer.innerHTML = featured.map(createFeaturedCard).join('');
  }
  initCarousel({
    viewport: featuredContainer,
    prevBtn: document.getElementById('featuredPrev'),
    nextBtn: document.getElementById('featuredNext'),
    dotsContainer: document.getElementById('featuredDots'),
    itemCount: featured.length,
    visibleCount: 4
  });

  // --- Grille "Sorties récentes" : les plus récemment mises à jour ---
  const recent = [...series].sort((a, b) => {
    const aDate = latestChapterMap[a.id]?.publishedAt || a.created_at || 0;
    const bDate = latestChapterMap[b.id]?.publishedAt || b.created_at || 0;
    return new Date(bDate) - new Date(aDate);
  }).slice(0, 8);

  recentContainer.innerHTML = recent.map(item => {
    const chapterInfo = latestChapterMap[item.id];
    return createCard(item, {
      latestChapter: chapterInfo?.number,
      timeAgoLabel: chapterInfo?.publishedAt ? timeAgo(chapterInfo.publishedAt) : timeAgo(item.created_at)
    });
  }).join('');
}

loadHomePage();
  }

  const latestChapterMap = buildLatestChapterMap(chapters);

  if (!series || series.length === 0) {
    recentContainer.innerHTML = '<p class="empty-state">Aucune histoire disponible pour le moment.</p>';
    return;
  }

  // --- Carrousel "À la une" : les plus vues ---
  const featured = [...series]
    .sort((a, b) => (b.vues ?? b.views ?? 0) - (a.vues ?? a.views ?? 0))
    .slice(0, 6);
  if (featuredContainer) {
    featuredContainer.innerHTML = featured.map(createFeaturedCard).join('');
  }
  initCarousel({
    viewport: featuredContainer,
    prevBtn: document.getElementById('featuredPrev'),
    nextBtn: document.getElementById('featuredNext'),
    dotsContainer: document.getElementById('featuredDots'),
    itemCount: featured.length,
    visibleCount: 4
  });

  // --- Grille "Sorties récentes" : les plus récemment mises à jour ---
  const recent = [...series].sort((a, b) => {
    const aDate = latestChapterMap[a.id]?.publishedAt || a.created_at || 0;
    const bDate = latestChapterMap[b.id]?.publishedAt || b.created_at || 0;
    return new Date(bDate) - new Date(aDate);
  }).slice(0, 8);

  recentContainer.innerHTML = recent.map(item => {
    const chapterInfo = latestChapterMap[item.id];
    return createCard(item, {
      latestChapter: chapterInfo?.number,
      timeAgoLabel: chapterInfo?.publishedAt ? timeAgo(chapterInfo.publishedAt) : timeAgo(item.created_at)
    });
  }).join('');
}

loadHomePage();

  recentContainer.innerHTML = recent.map(item => {
    const chapterInfo = latestChapterMap[item.id];
    return createCard(item, {
      latestChapter: chapterInfo?.number,
      timeAgoLabel: chapterInfo?.publishedAt ? timeAgo(chapterInfo.publishedAt) : timeAgo(item.created_at)
    });
  }).join('');
}

loadHomePage();
