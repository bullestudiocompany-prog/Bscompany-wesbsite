import { supabase } from "../config/supabase.js";


// ======================================================
// ÉLÉMENTS HTML
// ======================================================

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

const readerControls =
  document.getElementById("readerControls");


// ======================================================
// LIKE / COMMENTAIRES
// ======================================================

const likeButton =
  document.getElementById("likeButton");

const likeIcon =
  document.getElementById("likeIcon");

const likeCount =
  document.getElementById("likeCount");

const commentButton =
  document.getElementById("commentButton");

const commentCount =
  document.getElementById("commentCount");


// ======================================================
// AUDIO
// ======================================================

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

const audioTime =
  document.getElementById("audioTime");


// ======================================================
// ID DU CHAPITRE
// ======================================================

const params =
  new URLSearchParams(window.location.search);

const chapterId =
  params.get("id");


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


  const {
    data,
    error
  } = await supabase

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

    console.error(
      "Erreur chapitre :",
      error
    );

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

  if (readerControls) {
    readerControls.hidden = false;
  }
}


// ======================================================
// AFFICHER LE CHAPITRE
// ======================================================

function renderChapter(chapter) {

  const number =
    chapter.chapter_number ??
    "";


  // --------------------------------------------------
  // TITRE
  // --------------------------------------------------

  chapterTitle.textContent =
    chapter.title ||
    `Chapitre ${number}`;


  // --------------------------------------------------
  // NUMÉRO
  // --------------------------------------------------

  if (number !== "") {

    chapterNumber.textContent =
      `Chapitre ${number}`;

    paperChapterNumber.textContent =
      `Chapitre ${number}`;

  } else {

    chapterNumber.textContent = "";

    paperChapterNumber.textContent = "";
  }


  // --------------------------------------------------
  // ŒUVRE
  // --------------------------------------------------

  seriesTitle.textContent =
    chapter.series?.title || "";


  // --------------------------------------------------
  // TYPE
  // --------------------------------------------------

  const type =
    chapter.series?.type || "";


  if (type === "novel") {

    chapterType.textContent =
      "Roman";

  } else if (
    type === "webcomic" ||
    type === "webtoon"
  ) {

    chapterType.textContent =
      "Webcomic";

  } else {

    chapterType.textContent =
      type;
  }


  // --------------------------------------------------
  // RETOUR À L'ŒUVRE
  // --------------------------------------------------

  if (chapter.series?.id) {

    backToSeries.href =
      `serie.html?id=${encodeURIComponent(
        chapter.series.id
      )}`;
  }


  // ==================================================
  // IMAGE DU CHAPITRE
  // ==================================================

  const mainImage =
    chapter.chapter_image_url ||
    null;


  if (mainImage) {

    chapterImage.src =
      mainImage;

    chapterImage.alt =
      chapter.title ||
      "Image du chapitre";

    chapterImage.hidden = false;


    // Même image en arrière-plan,
    // avec le blur défini en CSS.

    chapterBackground.src =
      mainImage;

    chapterBackground.alt =
      "";

  } else {

    // Si une ancienne image existe,
    // on la garde en secours.

    let fallbackImages =
      chapter.image_urls || [];


    if (typeof fallbackImages === "string") {

      try {

        fallbackImages =
          JSON.parse(fallbackImages);

      } catch {

        fallbackImages =
          [fallbackImages];
      }
    }


    if (
      Array.isArray(fallbackImages) &&
      fallbackImages.length > 0
    ) {

      chapterImage.src =
        fallbackImages[0];

      chapterImage.alt =
        chapter.title ||
        "Image du chapitre";

      chapterBackground.src =
        fallbackImages[0];

    } else {

      chapterImage.hidden = true;

      chapterBackground.removeAttribute(
        "src"
      );
    }
  }


  // ==================================================
  // TEXTE
  // ==================================================

  chapterText.innerHTML = "";


  if (chapter.content) {

    const paragraphs =
      chapter.content
        .split(/\n\s*\n/)
        .map(
          paragraph =>
            paragraph.trim()
        )
        .filter(Boolean);


    paragraphs.forEach(paragraph => {

      const p =
        document.createElement("p");

      p.textContent =
        paragraph;

      chapterText.appendChild(p);
    });

  } else {

    const p =
      document.createElement("p");

    p.textContent =
      "Ce chapitre ne contient pas encore de texte.";

    chapterText.appendChild(p);
  }


  // ==================================================
  // ANCIENNES IMAGES SUPPLÉMENTAIRES
  // ==================================================

  chapterImages.innerHTML = "";


  let images =
    chapter.image_urls || [];


  if (typeof images === "string") {

    try {

      images =
        JSON.parse(images);

    } catch {

      images =
        [images];
    }
  }


  if (!Array.isArray(images)) {
    images = [];
  }


  // L'image principale ne doit pas être
  // répétée dans cette zone.

  images
    .filter(
      url =>
        url &&
        url !== chapter.chapter_image_url
    )
    .forEach(url => {

      const img =
        document.createElement("img");

      img.src =
        url;

      img.alt =
        chapter.title ||
        "Illustration du chapitre";

      img.loading =
        "lazy";

      chapterImages.appendChild(img);
    });
}


// ======================================================
// NAVIGATION PRÉCÉDENT / SUIVANT
// ======================================================

async function loadChapterNavigation(chapter) {

  const seriesId =
    chapter.series_id;


  if (!seriesId) {
    return;
  }


  const {
    data: chapters,
    error
  } = await supabase

    .from("chapters")

    .select(`
      id,
      chapter_number,
      title
    `)

    .eq(
      "series_id",
      seriesId
    )

    .order(
      "chapter_number",
      {
        ascending: true
      }
    );


  if (error || !chapters) {

    console.error(
      "Navigation chapitres :",
      error
    );

    return;
  }


  const currentIndex =
    chapters.findIndex(
      chapterItem =>
        chapterItem.id === chapter.id
    );


  // --------------------------------------------------
  // PRÉCÉDENT
  // --------------------------------------------------

  if (currentIndex > 0) {

    const previous =
      chapters[currentIndex - 1];


    previousChapter.href =
      `chapter.html?id=${encodeURIComponent(
        previous.id
      )}`;


    previousChapter.hidden =
      false;

  } else {

    previousChapter.hidden =
      true;
  }


  // --------------------------------------------------
  // SUIVANT
  // --------------------------------------------------

  if (
    currentIndex !== -1 &&
    currentIndex < chapters.length - 1
  ) {

    const next =
      chapters[currentIndex + 1];


    nextChapter.href =
      `chapter.html?id=${encodeURIComponent(
        next.id
      )}`;


    nextChapter.hidden =
      false;

  } else {

    nextChapter.hidden =
      true;
  }
}


// ======================================================
// AUDIO
// ======================================================

function setupAudio(chapter) {

  if (
    !audio ||
    !audioSection ||
    !playButton
  ) {
    return;
  }


  const soundUrl =
    chapter.sound_url ||
    chapter.sound_id ||
    null;


  // Aucun son

  if (!soundUrl) {

    audioSection.hidden =
      true;

    return;
  }


  audio.src =
    soundUrl;

  audio.loop =
    true;

  audio.volume =
    Number(volume?.value || 1);

  audioSection.hidden =
    false;


  // --------------------------------------------------
  // PLAY / PAUSE
  // --------------------------------------------------

  playButton.addEventListener(
    "click",
    async () => {

      if (audio.paused) {

        try {

          await audio.play();

          updatePlayButton();

        } catch (error) {

          console.warn(
            "Lecture audio impossible :",
            error
          );
        }

      } else {

        audio.pause();

        updatePlayButton();
      }
    }
  );


  // --------------------------------------------------
  // AUTOPLAY
  // --------------------------------------------------

  audio.addEventListener(
    "canplay",
    attemptAutoplay,
    {
      once: true
    }
  );


  // --------------------------------------------------
  // PROGRESSION
  // --------------------------------------------------

  audio.addEventListener(
    "timeupdate",
    updateAudioProgress
  );


  audio.addEventListener(
    "loadedmetadata",
    updateAudioProgress
  );


  progress?.addEventListener(
    "input",
    () => {

      if (!audio.duration) {
        return;
      }


      audio.currentTime =
        (
          Number(progress.value) /
          100
        ) *
        audio.duration;
    }
  );


  // --------------------------------------------------
  // MUTE
  // --------------------------------------------------

  muteButton?.addEventListener(
    "click",
    () => {

      audio.muted =
        !audio.muted;

      updateMuteButton();
    }
  );


  // --------------------------------------------------
  // VOLUME
  // --------------------------------------------------

  volume?.addEventListener(
    "input",
    () => {

      audio.volume =
        Number(volume.value);


      if (audio.volume > 0) {

        audio.muted =
          false;
      }


      updateMuteButton();
    }
  );


  // --------------------------------------------------
  // ÉVÉNEMENTS
  // --------------------------------------------------

  audio.addEventListener(
    "play",
    updatePlayButton
  );

  audio.addEventListener(
    "pause",
    updatePlayButton
  );

  audio.addEventListener(
    "ended",
    updatePlayButton
  );


  updatePlayButton();

  updateMuteButton();
}


// ======================================================
// AUTOPLAY
// ======================================================

async function attemptAutoplay() {

  try {

    await audio.play();

    updatePlayButton();

  } catch {

    // Le navigateur peut bloquer
    // l'autoplay avec son.
    // Le bouton reste disponible.
    updatePlayButton();
  }
}


// ======================================================
// BOUTON PLAY
// ======================================================

function updatePlayButton() {

  if (!playButton) {
    return;
  }


  playButton.textContent =
    audio.paused
      ? "▶"
      : "Ⅱ";


  playButton.setAttribute(
    "aria-label",
    audio.paused
      ? "Lire"
      : "Mettre en pause"
  );
}


// ======================================================
// BOUTON MUTE
// ======================================================

function updateMuteButton() {

  if (!muteButton) {
    return;
  }


  muteButton.textContent =
    audio.muted ||
    audio.volume === 0
      ? "🔇"
      : "🔊";
}


// ======================================================
// PROGRESSION AUDIO
// ======================================================

function updateAudioProgress() {

  if (!audio || !progress) {
    return;
  }


  if (
    audio.duration &&
    Number.isFinite(audio.duration)
  ) {

    progress.value =
      (
        audio.currentTime /
        audio.duration
      ) *
      100;

  } else {

    progress.value =
      0;
  }


  if (audioTime) {

    audioTime.textContent =
      formatTime(
        audio.currentTime
      );
  }
}


// ======================================================
// FORMAT TEMPS
// ======================================================

function formatTime(seconds) {

  if (
    !seconds ||
    !Number.isFinite(seconds)
  ) {
    return "0:00";
  }


  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");


  return `${minutes}:${remaining}`;
}


// ======================================================
// IDENTIFIANT DU NAVIGATEUR
// ======================================================

function getVisitorId() {

  const STORAGE_KEY =
    "bscompany_visitor_id";


  let visitorId =
    localStorage.getItem(
      STORAGE_KEY
    );


  if (!visitorId) {

    visitorId =
      crypto.randomUUID();

    localStorage.setItem(
      STORAGE_KEY,
      visitorId
    );
  }


  return visitorId;
}


// ======================================================
// VUE DU CHAPITRE
// ======================================================

async function registerView(chapter) {

  try {

    const visitorId =
      getVisitorId();


    // Enregistrer le navigateur pour ce chapitre

    const {
      error: insertError
    } = await supabase

      .from("chapter_views")

      .upsert(
        {
          chapter_id: chapter.id,
          visitor_id: visitorId
        },
        {
          onConflict:
            "chapter_id,visitor_id",
          ignoreDuplicates:
            true
        }
      );


    if (insertError) {

      console.error(
        "Erreur enregistrement vue :",
        insertError
      );

      return;
    }


    // Compter les visiteurs uniques de ce chapitre

    const {
      count,
      error: countError
    } = await supabase

      .from("chapter_views")

      .select("id", {
        count: "exact",
        head: true
      })

      .eq(
        "chapter_id",
        chapter.id
      );


    if (countError) {

      console.error(
        "Erreur comptage vues :",
        countError
      );

      return;
    }


    chapterViews.textContent =
      count ?? 0;


  } catch (error) {

    console.error(
      "Erreur système des vues :",
      error
    );
  }
}


// ======================================================
// LIKE
// ======================================================

async function setupLikeButton(chapter) {

  if (
    !likeButton ||
    !likeCount
  ) {
    return;
  }


  // --------------------------------------------------
  // CHARGER LA SESSION
  // --------------------------------------------------

  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();


  // --------------------------------------------------
  // CHARGER LE NOMBRE TOTAL DE LIKES
  // --------------------------------------------------

  const {
    count,
    error: countError
  } = await supabase

    .from("likes")

    .select("*", {
      count: "exact",
      head: true
    })

    .eq(
      "chapter_id",
      chapter.id
    );


  if (countError) {

    console.error(
      "Erreur chargement likes :",
      countError
    );

    likeCount.textContent =
      "0";

  } else {

    likeCount.textContent =
      count ?? 0;
  }


  // --------------------------------------------------
  // VÉRIFIER SI L'UTILISATEUR A DÉJÀ LIKÉ
  // --------------------------------------------------

  let userLiked =
    false;


  if (user) {

    const {
      data: existingLike,
      error: existingLikeError
    } = await supabase

      .from("likes")

      .select("chapter_id")

      .eq(
        "chapter_id",
        chapter.id
      )

      .eq(
        "user_id",
        user.id
      )

      .maybeSingle();


    if (existingLikeError) {

      console.error(
        "Erreur vérification like :",
        existingLikeError
      );

    } else {

      userLiked =
        !!existingLike;
    }
  }


  updateLikeButton(
    userLiked
  );


  // --------------------------------------------------
  // CLIQUER SUR LIKE
  // --------------------------------------------------

  likeButton.onclick =
    async () => {

      // Pas connecté

      if (!user) {

        alert(
          "Connectez-vous ou créez un compte pour aimer ce chapitre."
        );

        return;
      }


      likeButton.disabled =
        true;


      try {

        // ----------------------------------------------
        // DÉJÀ LIKÉ → SUPPRIMER LE LIKE
        // ----------------------------------------------

        if (userLiked) {

          const {
            error
          } = await supabase

            .from("likes")

            .delete()

            .eq(
              "chapter_id",
              chapter.id
            )

            .eq(
              "user_id",
              user.id
            );


          if (error) {
            throw error;
          }


          userLiked =
            false;

        }


        // ----------------------------------------------
        // PAS ENCORE LIKÉ → AJOUTER LE LIKE
        // ----------------------------------------------

        else {

          const {
            error
          } = await supabase

            .from("likes")

            .insert({
              user_id:
                user.id,

              chapter_id:
                chapter.id,

              profil_id:
                null,

              series_id:
                chapter.series_id
            });


          if (error) {
            throw error;
          }


          userLiked =
            true;
        }


        // ----------------------------------------------
        // METTRE À JOUR LE COMPTEUR
        // ----------------------------------------------

        const {
          count,
          error: refreshError
        } = await supabase

          .from("likes")

          .select("*", {
            count: "exact",
            head: true
          })

          .eq(
            "chapter_id",
            chapter.id
          );


        if (refreshError) {
          throw refreshError;
        }


        likeCount.textContent =
          count ?? 0;


        updateLikeButton(
          userLiked
        );


      } catch (error) {

        console.error(
          "Erreur Like :",
          error
        );

        alert(
          "Impossible de modifier le Like pour le moment."
        );

      } finally {

        likeButton.disabled =
          false;
      }
    };
}


// ======================================================
// AFFICHER L'ÉTAT DU LIKE
// ======================================================

function updateLikeButton(isLiked) {

  if (
    !likeButton ||
    !likeIcon
  ) {
    return;
  }


  if (isLiked) {

    likeIcon.textContent =
      "♥";

    likeButton.classList.add(
      "liked"
    );

    likeButton.setAttribute(
      "aria-pressed",
      "true"
    );

    likeButton.setAttribute(
      "aria-label",
      "Retirer le Like"
    );

  } else {

    likeIcon.textContent =
      "♡";

    likeButton.classList.remove(
      "liked"
    );

    likeButton.setAttribute(
      "aria-pressed",
      "false"
    );

    likeButton.setAttribute(
      "aria-label",
      "Aimer ce chapitre"
    );
  }
}


// ======================================================
// COMMENTAIRES
// ======================================================

function setupComments() {

  if (!commentButton) {
    return;
  }


  /*
   * L'espace commentaires sera branché
   * à la table comments lorsque nous
   * définirons précisément son fonctionnement.
   */

  commentButton.addEventListener(
    "click",
    () => {

      const commentsSection =
        document.getElementById(
          "commentsSection"
        );


      if (commentsSection) {

        commentsSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  );
}


// ======================================================
// ERREUR
// ======================================================

function showError() {

  loading.hidden =
    true;

  reader.hidden =
    true;

  if (readerControls) {

    readerControls.hidden =
      true;
  }

  errorBox.hidden =
    false;
}


// ======================================================
// MENU MOBILE
// ======================================================

const mobileMenuBtn =
  document.getElementById(
    "mobileMenuBtn"
  );

const navLinks =
  document.getElementById(
    "navLinks"
  );


if (
  mobileMenuBtn &&
  navLinks
) {

  mobileMenuBtn.addEventListener(
    "click",
    () => {

      const opened =
        navLinks.classList.toggle(
          "mobile-open"
        );


      mobileMenuBtn.setAttribute(
        "aria-expanded",
        opened
          ? "true"
          : "false"
      );
    }
  );
}


// ======================================================
// DÉMARRAGE
// ======================================================

async function startReader() {

  await loadChapter();


  if (currentChapter) {

    setupLikeButton(
      currentChapter
    );

    setupComments();
  }
}


startReader();    audio.duration &&
    Number.isFinite(audio.duration)
  ) {

    progress.value =
      (
        audio.currentTime /
        audio.duration
      ) *
      100;

  } else {

    progress.value =
      0;
  }


  if (audioTime) {

    audioTime.textContent =
      formatTime(
        audio.currentTime
      );
  }
}


// ======================================================
// FORMAT TEMPS
// ======================================================

function formatTime(seconds) {

  if (
    !seconds ||
    !Number.isFinite(seconds)
  ) {
    return "0:00";
  }


  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");


  return `${minutes}:${remaining}`;
}

// ======================================================
// IDENTIFIANT DU NAVIGATEUR
// ======================================================

function getVisitorId() {
  const STORAGE_KEY = "bscompany_visitor_id";

  let visitorId = localStorage.getItem(STORAGE_KEY);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }

  return visitorId;
}

// ======================================================
// VUE DU CHAPITRE
// ======================================================

async function registerView(chapter) {
  try {
    const visitorId = getVisitorId();

    // Enregistrer le navigateur pour ce chapitre
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

    // Compter les visiteurs uniques de ce chapitre
    const { count, error: countError } = await supabase
      .from("chapter_views")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("chapter_id", chapter.id);

    if (countError) {
      console.error("Erreur comptage vues :", countError);
      return;
    }

    chapterViews.textContent = count ?? 0;

  } catch (error) {
    console.error("Erreur système des vues :", error);
  }
      }

// ======================================================
// LIKE
// ======================================================

async function setupLikeButton(chapter) {
  if (!likeButton || !likeCount) {
    return;
  }

  // --------------------------------------------------
  // CHARGER LA SESSION
  // --------------------------------------------------

  const {
    data: { user }
  } = await supabase.auth.getUser();


  // --------------------------------------------------
  // CHARGER LE NOMBRE TOTAL DE LIKES
  // --------------------------------------------------

  const {
    count,
    error: countError
  } = await supabase
    .from("likes")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("chapter_id", chapter.id);


  if (countError) {
    console.error(
      "Erreur chargement likes :",
      countError
    );

    likeCount.textContent = "0";

  } else {

    likeCount.textContent =
      count ?? 0;
  }


  // --------------------------------------------------
  // VÉRIFIER SI L'UTILISATEUR A DÉJÀ LIKÉ
  // --------------------------------------------------

  let userLiked = false;


  if (user) {

    const {
      data: existingLike,
      error: existingLikeError
    } = await supabase
      .from("likes")
      .select("chapter_id")
      .eq("chapter_id", chapter.id)
      .eq("user_id", user.id)
      .maybeSingle();


    if (existingLikeError) {

      console.error(
        "Erreur vérification like :",
        existingLikeError
      );

    } else {

      userLiked = !!existingLike;
    }
  }


  updateLikeButton(userLiked);


  // --------------------------------------------------
  // CLIQUER SUR LIKE
  // --------------------------------------------------

  likeButton.onclick = async () => {

    // Pas connecté
    if (!user) {

      alert(
        "Connectez-vous ou créez un compte pour aimer ce chapitre."
      );

      return;
    }


    likeButton.disabled = true;


    try {

      // ----------------------------------------------
      // DÉJÀ LIKÉ → SUPPRIMER LE LIKE
      // ----------------------------------------------

      if (userLiked) {

        const {
          error
        } = await supabase
          .from("likes")
          .delete()
          .eq("chapter_id", chapter.id)
          .eq("user_id", user.id);


        if (error) {
          throw error;
        }


        userLiked = false;

      }

      // ----------------------------------------------
      // PAS ENCORE LIKÉ → AJOUTER LE LIKE
      // ----------------------------------------------

      else {

        const {
          error
        } = await supabase
          .from("likes")
          .insert({
            user_id: user.id,
            chapter_id: chapter.id,
            profil_id: null,
            series_id: chapter.series_id
          });


        if (error) {
          throw error;
        }


        userLiked = true;
      }


      // ----------------------------------------------
      // METTRE À JOUR LE COMPTEUR
      // ----------------------------------------------

      const {
        count,
        error: refreshError
      } = await supabase
        .from("likes")
        .select("*", {
          count: "exact",
          head: true
        })
        .eq("chapter_id", chapter.id);


      if (refreshError) {
        throw refreshError;
      }


      likeCount.textContent =
        count ?? 0;


      updateLikeButton(userLiked);


    } catch (error) {

      console.error(
        "Erreur Like :",
        error
      );

      alert(
        "Impossible de modifier le Like pour le moment."
      );

    } finally {

      likeButton.disabled = false;
    }
  };
    }
function updateLikeButton(isLiked) {

  if (!likeButton || !likeIcon) {
    return;
  }


  /*
   * La table likes n'est pas encore branchée
   * à l'interface utilisateur.
   *
   * On prépare donc simplement le bouton
   * sans inventer de logique Supabase.
   */

  


// ======================================================
// COMMENTAIRES
// ======================================================

function setupComments() {

  if (!commentButton) {
    return;
  }


  /*
   * L'espace commentaires sera branché
   * à la table comments lorsque nous
   * définirons précisément son fonctionnement.
   */

  commentButton.addEventListener(
    "click",
    () => {

      const commentsSection =
        document.getElementById(
          "commentsSection"
        );


      if (commentsSection) {

        commentsSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  );
}


// ======================================================
// ERREUR
// ======================================================

function showError() {

  loading.hidden =
    true;

  reader.hidden =
    true;

  if (readerControls) {
    readerControls.hidden =
      true;
  }

  errorBox.hidden =
    false;
}


// ======================================================
// MENU MOBILE
// ======================================================

const mobileMenuBtn =
  document.getElementById(
    "mobileMenuBtn"
  );

const navLinks =
  document.getElementById(
    "navLinks"
  );


if (
  mobileMenuBtn &&
  navLinks
) {

  mobileMenuBtn.addEventListener(
    "click",
    () => {

      const opened =
        navLinks.classList.toggle(
          "mobile-open"
        );


      mobileMenuBtn.setAttribute(
        "aria-expanded",
        opened
          ? "true"
          : "false"
      );
    }
  );
}


// ======================================================
// DÉMARRAGE
// ======================================================

async function startReader() {

  await loadChapter();


  if (currentChapter) {

    setupLikeButton(
      currentChapter
    );

    setupComments();
  }
}


startReader();
