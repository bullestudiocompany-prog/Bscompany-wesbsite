import { supabase } from "../config/supabase.js";

/* =========================================================
   ÉLÉMENTS DOM
========================================================= */

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

/* Likes */
const likeButton = document.getElementById("likeButton");
const likeIcon = document.getElementById("likeIcon");
const likeCount = document.getElementById("likeCount");

/* Comments */
const commentButton = document.getElementById("commentButton");
const commentCount = document.getElementById("commentCount");

/* Audio */
const audioSection = document.getElementById("audioSection");
const audio = document.getElementById("chapterAudio");
const playButton = document.getElementById("audioPlay");
const progress = document.getElementById("audioProgress");
const muteButton = document.getElementById("audioMute");
const volume = document.getElementById("audioVolume");
const audioTime = document.getElementById("audioTime");


/* =========================================================
   PARAMÈTRES
========================================================= */

const params = new URLSearchParams(window.location.search);
const chapterId = params.get("id");


/* =========================================================
   ÉTAT
========================================================= */

let currentChapter = null;
let currentPages = [];
let mangaPageIndex = 0;

let mangaTouchStartX = null;
let mangaTouchStartY = null;


/* =========================================================
   OUTILS
========================================================= */

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}


function truncateText(value, maxLength = 160) {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}…`;
}


function setMetaName(name, content) {
  if (!content) return;

  let meta = document.querySelector(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}


function setMetaProperty(property, content) {
  if (!content) return;

  let meta = document.querySelector(`meta[property="${property}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}


function setCanonical(url) {
  if (!url) return;

  let canonical = document.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", url);
}


/* =========================================================
   SEO
========================================================= */

function setChapterSEO(chapter) {
  const series = chapter?.series || {};

  const seriesName = cleanText(series.title);
  const currentTitle = cleanText(chapter.title);

  const number =
    chapter.chapter_label ??
    chapter.chapter_number ??
    "";

  const label = cleanText(number);

  const fullTitle = [
    seriesName,
    label ? `Chapitre ${label}` : "",
    currentTitle
  ]
    .filter(Boolean)
    .join(" — ");

  let description = cleanText(chapter.content);

  if (!description) {
    description = cleanText(series.description);
  }

  if (!description) {
    description = `Découvrez ${fullTitle} sur BSCompany.`;
  }

  description = truncateText(description, 160);

  const image =
    chapter.chapter_image_url ||
    (Array.isArray(chapter.image_urls) && chapter.image_urls.length
      ? chapter.image_urls[0]
      : "") ||
    series.cover_url ||
    "";

  const canonical = window.location.href;

  document.title = fullTitle
    ? `${fullTitle} | BSCompany`
    : "BSCompany";

  setMetaName("description", description);

  setMetaProperty("og:title", fullTitle || "BSCompany");
  setMetaProperty("og:description", description);
  setMetaProperty("og:type", "article");
  setMetaProperty("og:url", canonical);

  if (image) {
    setMetaProperty("og:image", image);
  }

  setMetaName("twitter:card", image ? "summary_large_image" : "summary");
  setMetaName("twitter:title", fullTitle || "BSCompany");
  setMetaName("twitter:description", description);

  if (image) {
    setMetaName("twitter:image", image);
  }

  setCanonical(canonical);
}


/* =========================================================
   UTILITAIRES WEBCOMIC
========================================================= */

function isWebcomic(chapter = currentChapter) {
  return chapter?.series?.type === "webcomic";
}


function isManga(chapter = currentChapter) {
  return (
    isWebcomic(chapter) &&
    chapter?.series?.format === "manga"
  );
}


function isWebtoon(chapter = currentChapter) {
  return (
    isWebcomic(chapter) &&
    chapter?.series?.format === "webtoon"
  );
}


function getLegacyImages(chapter) {
  if (!Array.isArray(chapter?.image_urls)) {
    return [];
  }

  return chapter.image_urls
    .filter(Boolean)
    .map((url, index) => ({
      id: `legacy-${index + 1}`,
      page_number: index + 1,
      image_url: url
    }));
}


/* =========================================================
   CHARGEMENT DES PAGES WEB-COMIC
========================================================= */

async function loadChapterPages(chapter) {
  if (!isWebcomic(chapter)) {
    return [];
  }

  const { data, error } = await supabase
    .from("chapter_pages")
    .select("id, page_number, image_url")
    .eq("chapter_id", chapter.id)
    .order("page_number", { ascending: true });

  if (error) {
    console.warn(
      "Impossible de charger chapter_pages. Utilisation de image_urls.",
      error
    );

    return getLegacyImages(chapter);
  }

  if (Array.isArray(data) && data.length > 0) {
    return data.filter(page => page?.image_url);
  }

  return getLegacyImages(chapter);
}


/* =========================================================
   IMAGE PRINCIPALE
========================================================= */

function getHeroImage(chapter) {
  const pages = currentPages || [];

  return (
    chapter?.chapter_image_url ||
    pages[0]?.image_url ||
    (Array.isArray(chapter?.image_urls)
      ? chapter.image_urls[0]
      : "") ||
    chapter?.series?.cover_url ||
    ""
  );
}


/* =========================================================
   RENDU DU CHAPITRE
========================================================= */

function renderChapter(chapter) {
  const series = chapter.series || {};

  const label =
    chapter.chapter_label ??
    chapter.chapter_number ??
    "";

  const heroImage = getHeroImage(chapter);

  /* ---------------------------------------------------------
     Informations générales
  --------------------------------------------------------- */

  chapterTitle.textContent = chapter.title || "Sans titre";

  chapterNumber.textContent = label !== ""
    ? `Chapitre ${label}`
    : "";

  paperChapterNumber.textContent =
    label !== ""
      ? `Chapitre ${label}`
      : "";

  seriesTitle.textContent = series.title || "";

  if (series.type === "novel") {
    chapterType.textContent = "Roman";
  } else if (series.type === "webcomic") {
    chapterType.textContent = "Webcomic";
  } else {
    chapterType.textContent = "";
  }


  /* ---------------------------------------------------------
     Retour vers l'œuvre
  --------------------------------------------------------- */

  if (series.id) {
    backToSeries.href = `./serie.html?id=${encodeURIComponent(series.id)}`;
  }


  /* ---------------------------------------------------------
     Image principale / couverture du chapitre
  --------------------------------------------------------- */

  if (heroImage) {
    chapterImage.src = heroImage;
    chapterImage.alt = chapter.title
      ? `Illustration de ${chapter.title}`
      : "Illustration du chapitre";

    chapterImage.hidden = false;

    chapterBackground.src = heroImage;
    chapterBackground.alt = "";
  } else {
    chapterImage.removeAttribute("src");
    chapterImage.alt = "";
    chapterImage.hidden = true;

    chapterBackground.removeAttribute("src");
  }


  /* ---------------------------------------------------------
     ROMAN
  --------------------------------------------------------- */

  if (series.type === "novel") {
    renderNovelChapter(chapter);
    return;
  }


  /* ---------------------------------------------------------
     WEBCOMIC
  --------------------------------------------------------- */

  if (series.type === "webcomic") {
    renderWebcomicChapter(chapter);
    return;
  }


  /* ---------------------------------------------------------
     TYPE INCONNU
  --------------------------------------------------------- */

  chapterText.hidden = false;
  chapterImages.hidden = true;

  chapterText.innerHTML = `
    <p>Ce chapitre ne peut pas être affiché.</p>
  `;
}


/* =========================================================
   RENDU ROMAN
========================================================= */

function renderNovelChapter(chapter) {
  chapterText.hidden = false;
  chapterImages.hidden = true;

  chapterText.innerHTML = "";

  const content = String(chapter.content || "").trim();

  if (!content) {
    chapterText.innerHTML = `
      <p>Ce chapitre ne contient pas encore de texte.</p>
    `;

    return;
  }

  const paragraphs = content
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  paragraphs.forEach(paragraph => {
    const p = document.createElement("p");

    const parts = paragraph.split(
      /(https?:\/\/[^\s]+)/gi
    );

    parts.forEach(part => {
      if (/^https?:\/\//i.test(part)) {
        const link = document.createElement("a");

        link.href = part;
        link.textContent = part;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        p.appendChild(link);
      } else {
        p.appendChild(
          document.createTextNode(part)
        );
      }
    });

    chapterText.appendChild(p);
  });

  chapterImages.innerHTML = "";
}


/* =========================================================
   RENDU WEBCOMIC
========================================================= */

function renderWebcomicChapter(chapter) {
  chapterText.hidden = true;
  chapterImages.hidden = false;

  chapterText.innerHTML = "";
  chapterImages.innerHTML = "";

  if (!currentPages.length) {
    chapterImages.innerHTML = `
      <p>Les pages de ce chapitre ne sont pas encore disponibles.</p>
    `;

    return;
  }

  mangaPageIndex = 0;

  if (isManga(chapter)) {
    renderMangaPage();
    return;
  }

  if (isWebtoon(chapter)) {
    renderWebtoonPages();
    return;
  }

  /*
   * Si un ancien webcomic n'a pas encore de format,
   * on garde un comportement vertical par défaut.
   */
  renderWebtoonPages();
}


/* =========================================================
   LECTEUR MANGA
   Une seule page affichée à la fois
========================================================= */

function renderMangaPage() {
  if (!currentPages.length) {
    return;
  }

  if (
    mangaPageIndex < 0 ||
    mangaPageIndex >= currentPages.length
  ) {
    return;
  }

  chapterImages.innerHTML = "";

  const page = currentPages[mangaPageIndex];

  const image = document.createElement("img");

  image.src = page.image_url;
  image.alt = `Page ${page.page_number}`;
  image.loading = "eager";
  image.decoding = "async";
  image.draggable = false;

  chapterImages.appendChild(image);
}


/* =========================================================
   NAVIGATION ENTRE PAGES MANGA
========================================================= */

function nextMangaPage() {
  if (!isManga()) {
    return;
  }

  if (
    mangaPageIndex >= currentPages.length - 1
  ) {
    return;
  }

  mangaPageIndex += 1;

  renderMangaPage();

  updateMangaPageAccessibility();
}


function previousMangaPage() {
  if (!isManga()) {
    return;
  }

  if (mangaPageIndex <= 0) {
    return;
  }

  mangaPageIndex -= 1;

  renderMangaPage();

  updateMangaPageAccessibility();
}


function updateMangaPageAccessibility() {
  if (!isManga()) {
    return;
  }

  const total = currentPages.length;

  if (!total) {
    return;
  }

  chapterImages.setAttribute(
    "aria-label",
    `Page ${mangaPageIndex + 1} sur ${total}`
  );
}


/* =========================================================
   TOUCH MANGA
========================================================= */

function setupMangaTouchNavigation() {
  chapterImages.addEventListener(
    "touchstart",
    event => {
      if (!isManga()) {
        return;
      }

      const touch = event.changedTouches[0];

      mangaTouchStartX = touch.clientX;
      mangaTouchStartY = touch.clientY;
    },
    { passive: true }
  );


  chapterImages.addEventListener(
    "touchend",
    event => {
      if (!isManga()) {
        return;
      }

      if (mangaTouchStartX === null) {
        return;
      }

      const touch = event.changedTouches[0];

      const deltaX =
        touch.clientX - mangaTouchStartX;

      const deltaY =
        touch.clientY - mangaTouchStartY;

      mangaTouchStartX = null;
      mangaTouchStartY = null;

      /*
       * On ignore les mouvements essentiellement verticaux.
       */
      if (Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      /*
       * Seuil minimum pour éviter les changements
       * accidentels.
       */
      if (Math.abs(deltaX) < 50) {
        return;
      }

      /*
       * Swipe gauche = page suivante
       * Swipe droite = page précédente
       */
      if (deltaX < 0) {
        nextMangaPage();
      } else {
        previousMangaPage();
      }
    },
    { passive: true }
  );
}


/* =========================================================
   CLAVIER MANGA
========================================================= */

function setupMangaKeyboardNavigation() {
  document.addEventListener("keydown", event => {
    if (!isManga()) {
      return;
    }

    /*
     * On évite de perturber les champs de formulaire
     * s'il y en avait sur la page.
     */
    const target = event.target;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextMangaPage();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousMangaPage();
    }
  });
}


/* =========================================================
   LECTEUR WEBTOON
   Toutes les pages verticalement
========================================================= */

function renderWebtoonPages() {
  chapterImages.innerHTML = "";

  currentPages.forEach((page, index) => {
    if (!page?.image_url) {
      return;
    }

    const image = document.createElement("img");

    image.src = page.image_url;
    image.alt = `Page ${page.page_number || index + 1}`;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    image.draggable = false;

    chapterImages.appendChild(image);
  });
}


/* =========================================================
   NAVIGATION ENTRE CHAPITRES
========================================================= */

async function loadChapterNavigation() {
  if (!currentChapter?.series_id) {
    return;
  }

  const { data, error } = await supabase
    .from("chapters")
    .select(`
      id,
      series_id,
      chapter_number,
      chapter_label,
      title
    `)
    .eq("series_id", currentChapter.series_id)
    .order("chapter_number", {
      ascending: true
    });

  if (error) {
    console.error(
      "Erreur navigation chapitres :",
      error
    );

    return;
  }

  const chapters = Array.isArray(data)
    ? data
    : [];

  const currentIndex = chapters.findIndex(
    chapter => chapter.id === currentChapter.id
  );


  /* ---------------------------------------------------------
     Chapitre précédent
  --------------------------------------------------------- */

  if (
    currentIndex > 0 &&
    chapters[currentIndex - 1]
  ) {
    const previous = chapters[currentIndex - 1];

    previousChapter.href =
      `./chapter.html?id=${encodeURIComponent(previous.id)}`;

    previousChapter.hidden = false;
  } else {
    previousChapter.hidden = true;
  }


  /* ---------------------------------------------------------
     Chapitre suivant
  --------------------------------------------------------- */

  if (
    currentIndex !== -1 &&
    currentIndex < chapters.length - 1 &&
    chapters[currentIndex + 1]
  ) {
    const next = chapters[currentIndex + 1];

    nextChapter.href =
      `./chapter.html?id=${encodeURIComponent(next.id)}`;

    nextChapter.hidden = false;
  } else {
    nextChapter.hidden = true;
  }
}


/* =========================================================
   AUDIO
========================================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}


function setupAudio(chapter) {
  if (!audio || !audioSection) {
    return;
  }

  const soundUrl =
    chapter.sound_url ||
    chapter.sound_id ||
    "";

  if (!soundUrl) {
    audioSection.hidden = true;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    return;
  }

  audioSection.hidden = false;

  audio.src = soundUrl;
  audio.loop = true;
  audio.preload = "metadata";

  if (volume) {
    audio.volume = Number(volume.value || 1);
  }

  audio.load();


  /* ---------------------------------------------------------
     Lecture / pause
  --------------------------------------------------------- */

  if (playButton) {
    playButton.onclick = async () => {
      try {
        if (audio.paused) {
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (error) {
        console.warn(
          "Lecture audio impossible :",
          error
        );
      }
    };
  }


  /* ---------------------------------------------------------
     Icône lecture / pause
  --------------------------------------------------------- */

  audio.onplay = () => {
    playButton?.classList.add("playing");
  };

  audio.onpause = () => {
    playButton?.classList.remove("playing");
  };


  /* ---------------------------------------------------------
     Autoplay lorsque le navigateur l'autorise
  --------------------------------------------------------- */

  audio.oncanplay = async () => {
    try {
      await audio.play();
    } catch {
      /*
       * Les navigateurs peuvent bloquer l'autoplay.
       * Rien à faire dans ce cas : l'utilisateur peut
       * lancer la lecture manuellement.
       */
    }
  };


  /* ---------------------------------------------------------
     Progression
  --------------------------------------------------------- */

  audio.ontimeupdate = () => {
    if (!progress) {
      return;
    }

    if (audio.duration) {
      progress.value =
        (audio.currentTime / audio.duration) * 100;
    }

    if (audioTime) {
      audioTime.textContent =
        `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
  };


  /* ---------------------------------------------------------
     Barre de progression
  --------------------------------------------------------- */

  if (progress) {
    progress.oninput = () => {
      if (!audio.duration) {
        return;
      }

      audio.currentTime =
        (Number(progress.value) / 100) *
        audio.duration;
    };
  }


  /* ---------------------------------------------------------
     Muet
  --------------------------------------------------------- */

  if (muteButton) {
    muteButton.onclick = () => {
      audio.muted = !audio.muted;

      muteButton.classList.toggle(
        "muted",
        audio.muted
      );
    };
  }


  /* ---------------------------------------------------------
     Volume
  --------------------------------------------------------- */

  if (volume) {
    volume.oninput = () => {
      audio.volume = Number(volume.value);
      audio.muted = audio.volume === 0;

      muteButton?.classList.toggle(
        "muted",
        audio.muted
      );
    };
  }


  /* ---------------------------------------------------------
     Durée
  --------------------------------------------------------- */

  audio.onloadedmetadata = () => {
    if (audioTime) {
      audioTime.textContent =
        `0:00 / ${formatTime(audio.duration)}`;
    }
  };
}


/* =========================================================
   VISITES
========================================================= */

function getVisitorId() {
  let visitorId =
    localStorage.getItem(
      "bscompany_visitor_id"
    );

  if (!visitorId) {
    visitorId = crypto.randomUUID();

    localStorage.setItem(
      "bscompany_visitor_id",
      visitorId
    );
  }

  return visitorId;
}


async function registerView() {
  if (!currentChapter?.id) {
    return;
  }

  try {
    const visitorId = getVisitorId();

    const { error } = await supabase
      .from("chapter_views")
      .upsert(
        {
          chapter_id: currentChapter.id,
          visitor_id: visitorId
        },
        {
          onConflict: "chapter_id,visitor_id"
        }
      );

    if (error) {
      console.error(
        "Erreur enregistrement vue :",
        error
      );
    }

    const { count, error: countError } =
      await supabase
        .from("chapter_views")
        .select("*", {
          count: "exact",
          head: true
        })
        .eq(
          "chapter_id",
          currentChapter.id
        );

    if (!countError && chapterViews) {
      chapterViews.textContent =
        String(count || 0);
    }

  } catch (error) {
    console.error(
      "Erreur views :",
      error
    );
  }
}


/* =========================================================
   LIKES
================================================
