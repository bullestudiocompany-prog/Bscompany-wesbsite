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

loadHomePage().catch(err => {
  // Filet de sécurité : si le module supabase.js (ou le CDN dont il dépend)
  // échoue à se charger, ce message s'affiche au lieu d'une page blanche.
  console.error('Erreur inattendue au chargement de la page:', err);
  if (recentContainer) {
    recentContainer.innerHTML = `<p class="error-state">Impossible de contacter la base de données. Vérifie ta connexion et réessaie. (${err.message || err})</p>`;
  }
});
