import { supabase } from '../config/supabase.js';
import { createCard, createFeaturedCard, normalizeSeries, timeAgo } from '../components/card.js';
import { initCarousel } from '../components/carousel.js';

const featuredContainer = document.getElementById('featuredCarousel');
const recentContainer = document.getElementById('recent-grid');

// Le dernier numéro de chapitre par série (gère les colonnes fr/en en double)
function buildLatestChapterMap(chapters) {
  const map = {};
  for (const c of chapters || []) {
    const seriesId = c.series_id;
    const number = c.chapter_number ?? c.numero ?? null;
    const publishedAt = c.published_at || c.created_at || null;
    if (!seriesId) continue;
    const current = map[seriesId];
    if (!current || (number ?? 0) > (current.number ?? 0)) {
      map[seriesId] = { number, publishedAt };
    }
  }
  return map;
}

async function loadHomePage() {
  const [{ data: series, error: seriesError }, { data: chapters, error: chaptersError }] = await Promise.all([
    supabase.from('series').select('*'),
    supabase.from('chapters').select('series_id, chapter_number, numero, published_at, created_at')
  ]);

  if (seriesError) {
    console.error('Erreur Supabase (series):', seriesError);
    recentContainer.innerHTML = '<p class="error-state">Erreur lors du chargement des histoires.</p>';
    return;
  }
  if (chaptersError) {
    console.error('Erreur Supabase (chapters):', chaptersError);
  }

  const latestChapterMap = buildLatestChapterMap(chapters);

  if (!series || series.length === 0) {
    recentContainer.innerHTML = '<p class="empty-state">Aucune histoire disponible pour le moment.</p>';
    return;
  }

  const normalized = series.map(normalizeSeries);

  // --- Carrousel "À la une" : les plus vues ---
  const featured = [...normalized].sort((a, b) => b.views - a.views).slice(0, 6);
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
