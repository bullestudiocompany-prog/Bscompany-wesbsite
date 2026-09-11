import { supabase } from "../config/supabase.js";

const loading = document.getElementById("chapterLoading");
const errorBox = document.getElementById("chapterError");
const reader = document.getElementById("chapterReader");
const chapterTitle = document.getElementById("chapterTitle");
const chapterNumber = document.getElementById("chapterNumber");
const paperChapterNumber = document.getElementById("paperChapterNumber");
const seriesTitle = document.getElementById("seriesTitle");
const chapterType = document.getElementById("chapterType");
const chapterViews = document.getElementById("chapterViews");
const chapterImage = document.getElementById("chapterImage");
const chapterBackground = document.getElementById("chapterBackground");
const backToSeries = document.getElementById("backToSeries");
const chapterText = document.getElementById("chapterText");
const chapterImages = document.getElementById("chapterImages");
const previousChapter = document.getElementById("previousChapter");
const nextChapter = document.getElementById("nextChapter");
const readerControls = document.getElementById("readerControls");

const likeButton = document.getElementById("likeButton");
const likeIcon = document.getElementById("likeIcon");
const likeCount = document.getElementById("likeCount");
const commentButton = document.getElementById("commentButton");
const commentCount = document.getElementById("commentCount");

const audioSection = document.getElementById("audioSection");
const audio = document.getElementById("chapterAudio");
const playButton = document.getElementById("audioPlay");
const progress = document.getElementById("audioProgress");
const muteButton = document.getElementById("audioMute");
const volume = document.getElementById("audioVolume");
const audioTime = document.getElementById("audioTime");

const params = new URLSearchParams(window.location.search);
const chapterId = params.get("id");

let currentChapter = null;

async function loadChapter() {
  console.log("🔵 loadChapter démarre");

  if (!chapterId) {
    console.log("🔴 Aucun chapterId");
    showError();
    return;
  }

  console.log("🟢 chapterId =", chapterId);

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

  console.log("🟡 Réponse Supabase :", { data, error });

  if (error || !data) {
    console.error("🔴 Erreur chapitre :", error);
    showError();
    return;
  }

  console.log("🟢 Chapitre récupéré");

  currentChapter = data;

  renderChapter(data);
  console.log("🟢 renderChapter terminé");

  await loadChapterNavigation(data);
  console.log("🟢 navigation terminée");

  setupAudio(data);
  console.log("🟢 audio terminé");

  loading.hidden = true;
  reader.hidden = false;

  if (readerControls) {
    readerControls.hidden = false;
  }

  console.log("✅ LECTEUR AFFICHÉ");

  registerView(data);
}

function renderChapter(chapter) {
  const number = chapter.chapter_number ?? "";

  chapterTitle.textContent = chapter.title || `Chapitre ${number}`;

  if (number !== "") {
    chapterNumber.textContent = `Chapitre ${number}`;
    paperChapterNumber.textContent = `Chapitre ${number}`;
  } else {
    chapterNumber.textContent = "";
    paperChapterNumber.textContent = "";
  }

  seriesTitle.textContent = chapter.series?.title || "";

  const type = chapter.series?.type || "";

  if (type === "novel") {
    chapterType.textContent = "Roman";
  } else if (type === "webcomic" || type === "webtoon") {
    chapterType.textContent = "Webcomic";
  } else {
    chapterType.textContent = type;
  }

  if (chapter.series?.id) {
    backToSeries.href = `serie.html?id=${encodeURIComponent(chapter.series.id)}`;
  }

  const mainImage = chapter.chapter_image_url || null;

  if (mainImage) {
    chapterImage.src = mainImage;
    chapterImage.alt = chapter.title || "Image du chapitre";
    chapterImage.hidden = false;

    chapterBackground.src = mainImage;
    chapterBackground.alt = "";
  } else {
    let fallbackImages = chapter.image_urls || [];

    if (typeof fallbackImages === "string") {
      try {
        fallbackImages = JSON.parse(fallbackImages);
      } catch {
        fallbackImages = [fallbackImages];
      }
    }

    if (Array.isArray(fallbackImages) && fallbackImages.length > 0) {
      chapterImage.src = fallbackImages[0];
      chapterImage.alt = chapter.title || "Image du chapitre";
      chapterImage.hidden = false;

      chapterBackground.src = fallbackImages[0];
      chapterBackground.alt = "";
    } else {
      chapterImage.hidden = true;
      chapterBackground.removeAttribute("src");
    }
  }

  chapterText.innerHTML = "";

  if (chapter.content) {
    const paragraphs = chapter.content
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean);

    paragraphs.forEach(paragraph => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      chapterText.appendChild(p);
    });
  } else {
    const p = document.createElement("p");
    p.textContent = "Ce chapitre ne contient pas encore de texte.";
    chapterText.appendChild(p);
  }

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

  images
    .filter(url => url && url !== chapter.chapter_image_url)
    .forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = chapter.title || "Illustration du chapitre";
      img.loading = "lazy";
      chapterImages.appendChild(img);
    });
}

async function loadChapterNavigation(chapter) {
  const seriesId = chapter.series_id;

  if (!seriesId) {
    return;
  }

  const { data: chapters, error } = await supabase
    .from("chapters")
    .select(`
      id,
      chapter_number,
      title
    `)
    .eq("series_id", seriesId)
    .order("chapter_number", { ascending: true });

  if (error || !chapters) {
    console.error("Navigation chapitres :", error);
    return;
  }

  const currentIndex = chapters.findIndex(
    chapterItem => chapterItem.id === chapter.id
  );

  if (currentIndex > 0) {
    const previous = chapters[currentIndex - 1];

    previousChapter.href =
      `chapter.html?id=${encodeURIComponent(previous.id)}`;

    previousChapter.hidden = false;
  } else {
    previousChapter.hidden = true;
  }

  if (currentIndex !== -1 && currentIndex < chapters.length - 1) {
    const next = chapters[currentIndex + 1];

    nextChapter.href =
      `chapter.html?id=${encodeURIComponent(next.id)}`;

    nextChapter.hidden = false;
  } else {
    nextChapter.hidden = true;
  }
}

function setupAudio(chapter) {
  if (!audio || !audioSection || !playButton) {
    return;
  }

  const soundUrl = chapter.sound_url || chapter.sound_id || null;

  if (!soundUrl) {
    audioSection.hidden = true;
    return;
  }

  audio.src = soundUrl;
  audio.loop = true;
  audio.volume = Number(volume?.value || 1);

  audioSection.hidden = false;

  playButton.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        updatePlayButton();
      } catch (error) {
        console.warn("Lecture audio impossible :", error);
      }
    } else {
      audio.pause();
      updatePlayButton();
    }
  });

  audio.addEventListener("canplay", attemptAutoplay, { once: true });
  audio.addEventListener("timeupdate", updateAudioProgress);
  audio.addEventListener("loadedmetadata", updateAudioProgress);

  progress?.addEventListener("input", () => {
    if (!audio.duration) {
      return;
    }

    audio.currentTime =
      (Number(progress.value) / 100) * audio.duration;
  });

  muteButton?.addEventListener("click", () => {
    audio.muted = !audio.muted;
    updateMuteButton();
  });

  volume?.addEventListener("input", () => {
    audio.volume = Number(volume.value);

    if (audio.volume > 0) {
      audio.muted = false;
    }

    updateMuteButton();
  });

  audio.addEventListener("play", updatePlayButton);
  audio.addEventListener("pause", updatePlayButton);
  audio.addEventListener("ended", updatePlayButton);

  updatePlayButton();
  updateMuteButton();
}

async function attemptAutoplay() {
  try {
    await audio.play();
    updatePlayButton();
  } catch {
    updatePlayButton();
  }
}

function updatePlayButton() {
  if (!playButton) {
    return;
  }

  const playIcon = playButton.querySelector(".play-icon");
  const pauseIcon = playButton.querySelector(".pause-icon");

  if (audio.paused) {
    if (playIcon) {
      playIcon.style.display = "block";
    }

    if (pauseIcon) {
      pauseIcon.style.display = "none";
    }

    playButton.setAttribute("aria-label", "Lire");
  } else {
    if (playIcon) {
      playIcon.style.display = "none";
    }

    if (pauseIcon) {
      pauseIcon.style.display = "block";
    }

    playButton.setAttribute("aria-label", "Mettre en pause");
  }
}

function updateMuteButton() {
  if (!muteButton) {
    return;
  }

  const svg = muteButton.querySelector("svg");

  if (!svg) {
    return;
  }

  if (audio.muted || audio.volume === 0) {
    svg.innerHTML = `
      <path d="M5 9v6h4l5 4V5L9 9H5Z"/>
      <path d="m18 9-5 6M13 9l5 6"/>
    `;

    muteButton.setAttribute("aria-label", "Activer le son");
  } else {
    svg.innerHTML = `
      <path d="M5 9v6h4l5 4V5L9 9H5Z"/>
      <path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10"/>
    `;

    muteButton.setAttribute("aria-label", "Couper le son");
  }
}

function updateAudioProgress() {
  if (!audio || !progress) {
    return;
  }

  if (audio.duration && Number.isFinite(audio.duration)) {
    progress.value =
      (audio.currentTime / audio.duration) * 100;
  } else {
    progress.value = 0;
  }

  if (audioTime) {
    audioTime.textContent = formatTime(audio.currentTime);
  }
}

function formatTime(seconds) {
  if (!seconds || !Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remaining}`;
}

function getVisitorId() {
  const STORAGE_KEY = "bscompany_visitor_id";

  let visitorId = localStorage.getItem(STORAGE_KEY);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }

  return visitorId;
}

async function registerView(chapter) {
  try {
    console.log("👁️ Enregistrement de la vue...");

    const visitorId = getVisitorId();

    const { error: insertError } = await supabase
      .from("chapter_views")
      .upsert(
        {
          chapter_id: chapter.id,
          visitor_id: visitorId
        },
        {
          onConflict: "chapter_id,visitor_id",
          ignoreDuplicates: true
        }
      );

    if (insertError) {
      console.error("Erreur enregistrement vue :", insertError);
      return;
    }

    const { count, error: countError } = await supabase
      .from("chapter_views")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", chapter.id);

    if (countError) {
      console.error("Erreur comptage vues :", countError);
      return;
    }

    if (chapterViews) {
      chapterViews.textContent = count ?? 0;
    }

    console.log("✅ Vue enregistrée");
  } catch (error) {
    console.error("Erreur système des vues :", error);
  }
}

async function setupLikeButton(chapter) {
  if (!likeButton || !likeCount) {
    return;
  }

  const visitorId = getVisitorId();

  const { count, error: countError } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapter.id);

  if (countError) {
    console.error("Erreur chargement likes :", countError);
    likeCount.textContent = "0";
  } else {
    likeCount.textContent = count ?? 0;
  }

  let visitorLiked = false;

  const { data: existingLike, error: existingLikeError } = await supabase
    .from("likes")
    .select("chapter_id")
    .eq("chapter_id", chapter.id)
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (existingLikeError) {
    console.error(
      "Erreur vérification like visiteur :",
      existingLikeError
    );
  } else {
    visitorLiked = !!existingLike;
  }

  updateLikeButton(visitorLiked);

  likeButton.onclick = async () => {
    likeButton.disabled = true;

    try {
      if (visitorLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("chapter_id", chapter.id)
          .eq("visitor_id", visitorId);

        if (error) {
          throw error;
        }

        visitorLiked = false;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({
            user_id: null,
            visitor_id: visitorId,
            chapter_id: chapter.id,
            profil_id: null,
            series_id: chapter.series_id
          });

        if (error) {
          throw error;
        }

        visitorLiked = true;
      }

      const { count: newCount, error: refreshError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("chapter_id", chapter.id);

      if (refreshError) {
        throw refreshError;
      }

      likeCount.textContent = newCount ?? 0;
      updateLikeButton(visitorLiked);
    } catch (error) {
      console.error("Erreur Like :", error);
      alert("Impossible de modifier le Like pour le moment.");
    } finally {
      likeButton.disabled = false;
    }
  };
}

function updateLikeButton(isLiked) {
  if (!likeButton || !likeIcon) {
    return;
  }

  if (isLiked) {
    likeIcon.textContent = "♥";
    likeButton.classList.add("liked");
    likeButton.setAttribute("aria-pressed", "true");
    likeButton.setAttribute("aria-label", "Retirer le Like");
  } else {
    likeIcon.textContent = "♡";
    likeButton.classList.remove("liked");
    likeButton.setAttribute("aria-pressed", "false");
    likeButton.setAttribute("aria-label", "Aimer ce chapitre");
  }
}

function setupComments() {
  if (!commentButton) {
    return;
  }

  commentButton.addEventListener("click", () => {
    const commentsSection = document.getElementById("commentsSection");

    if (commentsSection) {
      commentsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}

function showError() {
  loading.hidden = true;
  reader.hidden = true;

  if (readerControls) {
    readerControls.hidden = true;
  }

  errorBox.hidden = false;
}

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const navLinks = document.getElementById("navLinks");

if (mobileMenuBtn && navLinks) {
  mobileMenuBtn.addEventListener("click", () => {
    const opened = navLinks.classList.toggle("mobile-open");

    mobileMenuBtn.setAttribute(
      "aria-expanded",
      opened ? "true" : "false"
    );
  });
}

async function startReader() {
  console.log("🚀 Démarrage du lecteur");

  await loadChapter();

  console.log("🏁 loadChapter terminé");

  if (currentChapter) {
    setupLikeButton(currentChapter);
    setupComments();
  }
}

startReader();
