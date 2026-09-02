import { createCard } from '../components/card.js';

// Données de test (en attendant la connexion directe à ta base Supabase)
const testData = [
  { title: "Maitwenu", type: "WEBNOVEL", cover_url: "https://via.placeholder.com/80x110", rating: "4.9" },
  { title: "Autochtones", type: "ROMAN", cover_url: "https://via.placeholder.com/80x110", rating: "4.8" },
  { title: "KIS!", type: "WEBCOMIC", cover_url: "https://via.placeholder.com/80x110", rating: "4.6" }
];

const container = document.getElementById('recent-grid');

if (container) {
  container.innerHTML = testData.map(item => createCard(item)).join('');
}
