import { supabase } from '../config/supabase.js';
import { createCard } from '../components/card.js';

async function loadHomePage() {
  const recentContainer = document.getElementById('recent-grid');
  
  // Requête vers ta table Supabase (remplace 'works' par le nom exact de ta table)
  const { data: works, error } = await supabase
    .from('works')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur Supabase:', error);
    recentContainer.innerHTML = '<p>Erreur lors du chargement des histoires.</p>';
    return;
  }

  if (works && works.length > 0) {
    recentContainer.innerHTML = works.map(item => createCard(item)).join('');
  } else {
    recentContainer.innerHTML = '<p>Aucune histoire disponible pour le moment.</p>';
  }
}

loadHomePage();
