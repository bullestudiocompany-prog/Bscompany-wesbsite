import { supabase } from "../config/supabase.js";


// ======================================================
// ÉLÉMENTS HTML
// ======================================================

const loading = document.getElementById("chapterLoading");
const errorBox = document.getElementById("chapterError");
const reader = document.getElementById("chapterReader");

const chapterTitle = document.getElementById("chapterTitle");
const seriesTitle = document.getElementById("seriesTitle");
const chapterType = document.getElementById("chapterType");
const chapterViews = document.getElementById("chapterViews");

const backToSeries = document.getElementById("backToSeries");

const chapterText = document.getElementById("chapterText");
const chapterImages = document.getElementById("chapterImages");

const previousChapter = document.getElementById("previousChapter");
const nextChapter = document.getElementById("nextChapter");


// ======================================================
// ID DU CHAPITRE
// ======================================================

const params = new URLSearchParams(window.location.search);
const chapterId = params.get("id");


// ======================================================
// VARIABLES
// ======================================================

let currentChapter = null;


// ======================================================
// CHARGER LE CHAPITRE
// ======================================================

async function loadChapter() {

  if (!chapterId) {
    showError();
    return;
  }

  const { data, error } = await supabase
    .from("chapters")
    .select(`
      *,
      series (
        id,
        title,
        type,
        cover_url
      )
    `)
    .eq("id", chapterId)
    .single();

  if (error || !data) {
    console.error("Erreur chapitre :", error);
    showError();
    return;
  }

  currentChapter = data;

  renderChapter(data);

  await loadChapterNavigation(data);

  setupAudio(data);

  await registerView(data);

  loading.hidden = true;
  reader.hidden = false;
}


// ======================================================
// AFFICHER LE CHAPITRE
// ======================================================

function renderChapter(chapter) {

  chapterTitle.textContent =
    chapter.title ||
    `Chapitre ${chapter.chapter_number ?? ""}`;

  seriesTitle.textContent =
    chapter.series?.title || "";

  chapterViews.textContent =
    Number(chapter.views || 0);

  const type = chapter.series?.type || "";

  if (type === "novel") {
    chapterType.textContent = "Roman";
  } else if (type === "webcomic" || type === "webtoon") {
    chapterType.textContent = "Webcomic";
  } else {
    chapterType.textContent = type;
  }

  if (chapter.series?.id) {
    backToSeries.href =
      `serie.html?id=${encodeURIComponent(chapter.series.id)}`;
  }


  // ------------------------------------------
  // TEXTE
  // ------------------------------------------

  chapterText.innerHTML = "";

  if (chapter.content) {

    const paragraphs =
      chapter.content
        .split(/\n\s*\n/)
        .filter(paragraph => paragraph.trim());

    paragraphs.forEach(paragraph => {

      const p = document.createElement("p");

      p.textContent = paragraph.trim();

      chapterText.appendChild(p);

    });
  }


  // ------------------------------------------
  // IMAGES
  // ------------------------------------------

  chapterImages.innerHTML = "";

  let images = chapter.image_urls || [];

  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }

  if (!Array.isArray(images)) {
    images = [];
  }

  images.forEach(url => {

    if (!url) return;

    const img = document.createElement("img");

    img.src = url;
    img.alt = chapter.title || "Illustration du chapitre";
    img.loading = "lazy";

    chapterImages.appendChild(img);
  });
}


// ======================================================
// CHAPITRE PRÉCÉDENT / SUIVANT
// ======================================================

async function loadChapterNavigation(chapter) {

  const seriesId = chapter.series_id;

  if (!seriesId) return;


  const { data: chapters, error } = await supabase
    .from("chapters")
    .select("id, chapter_number, title")
    .eq("series_id", seriesId)
    .order("chapter_number", { ascending: true });

  if (error || !chapters) {
    console.error("Navigation chapitres :", error);
    return;
  }


  const currentIndex =
    chapters.findIndex(c => c.id === chapter.id);


  // PRÉCÉDENT

  if (currentIndex > 0) {

    const previous = chapters[currentIndex - 1];

    previousChapter.href =
      `chapter.html?id=${encodeURIComponent(previous.id)}`;

    previousChapter.hidden = false;
  }


  // SUIVANT

  if (
    currentIndex !== -1 &&
    currentIndex < chapters.length - 1
  ) {

    const next = chapters[currentIndex + 1];

    nextChapter.href =
      `chapter.html?id=${encodeURIComponent(next.id)}`;

    nextChapter.hidden = false;
  }
}


// ======================================================
// AUDIO
// ======================================================

function setupAudio(chapter) {

  const audioSection =
    document.getElementById("audioSection");

  const audio =
    document.getElementById("chapterAudio");

  const playButton =
    document.getElementById("audioPlay");

  const progress =
    document.getElementById("audioProgress");

  const muteButton =
    document.getElementById("audioMute");

  const volume =
    document.getElementById("audioVolume");


  /*
   * On essaie d'abord sound_url.
   * Si ton admin utilise une autre colonne,
   * on pourra l'adapter après vérification.
   */

  const soundUrl =
    chapter.sound_url ||
    chapter.sound_id ||
    null;


  if (!soundUrl) {
    audioSection.hidden = true;
    return;
  }


  audio.src = soundUrl;
  audioSection.hidden = false;


  // PLAY / PAUSE

  playButton.addEventListener("click", async () => {

    if (audio.paused) {

      try {
        await audio.play();
        playButton.textContent = "⏸";
      } catch (err) {
        console.error("Lecture audio impossible :", err);
      }

    } else {

      audio.pause();
      playButton.textContent = "▶";

    }
  });


  // PROGRESSION

  audio.addEventListener("timeupdate", () => {

    if (!audio.duration) return;

    progress.value =
      (audio.currentTime / audio.duration) * 100;
  });


  progress.addEventListener("input", () => {

    if (!audio.duration) return;

    audio.currentTime =
      (progress.value / 100) * audio.duration;
  });


  // MUTE

  muteButton.addEventListener("click", () => {

    audio.muted = !audio.muted;

    muteButton.textContent =
      audio.muted ? "🔇" : "🔊";
  });


  // VOLUME

  volume.addEventListener("input", () => {

    audio.volume = Number(volume.value);

    if (audio.volume > 0) {
      audio.muted = false;
      muteButton.textContent = "🔊";
    }
  });


  audio.addEventListener("ended", () => {
    playButton.textContent = "▶";
  });
}


// ======================================================
// VUE
// ======================================================

async function registerView(chapter) {

  const currentViews =
    Number(chapter.views || 0);

  const newViews =
    currentViews + 1;


  const { error } = await supabase
    .from("chapters")
    .update({
      views: newViews
    })
    .eq("id", chapter.id);


  if (error) {
    console.error("Erreur vue :", error);
    return;
  }

  chapterViews.textContent = newViews;
}


// ======================================================
// ERREUR
// ======================================================

function showError() {

  loading.hidden = true;
  reader.hidden = true;
  errorBox.hidden = false;
}


// ======================================================
// MENU MOBILE
// ======================================================

const mobileMenuBtn =
  document.getElementById("mobileMenuBtn");

const navLinks =
  document.getElementById("navLinks");

if (mobileMenuBtn && navLinks) {

  mobileMenuBtn.addEventListener("click", () => {

    const opened =
      navLinks.classList.toggle("mobile-open");

    mobileMenuBtn.setAttribute(
      "aria-expanded",
      opened ? "true" : "false"
    );
  });
}


// ======================================================
// DÉMARRAGE
// ======================================================

loadChapter();
