import { supabase } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);


/* =====================================================
   ELEMENTS
===================================================== */

const loginSection = $("loginSection");
const adminSection = $("adminSection");

const loginForm = $("loginForm");
const loginError = $("loginError");
const logoutBtn = $("logoutBtn");

const seriesList = $("seriesList");

const addSeriesForm = $("addSeriesForm");
const seriesSubmitBtn = $("seriesSubmitBtn");
const seriesStatusMsg = $("seriesStatusMsg");

const chaptersList = $("chaptersList");
const selectedSeriesTitle = $("selectedSeriesTitle");
const newChapterBtn = $("newChapterBtn");

const addChapterForm = $("addChapterForm");
const chapterSubmitBtn = $("chapterSubmitBtn");
const chapterStatusMsg = $("chapterStatusMsg");

const chapterSound = $("chapterSound");

const soundForm = $("soundForm");
const soundSubmitBtn = $("soundSubmitBtn");
const soundStatusMsg = $("soundStatusMsg");
const soundsList = $("soundsList");

const seriesCount = $("seriesCount");
const chaptersCount = $("chaptersCount");
const soundsCount = $("soundsCount");


/* =====================================================
   ETAT
===================================================== */

let currentUser = null;
let selectedSeries = null;


/* =====================================================
   NAVIGATION
===================================================== */

function showPage(pageName) {

  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });

  const page = document.getElementById(
    `page-${pageName}`
  );

  if (page) {
    page.classList.add("active");
  }

  document
    .querySelectorAll(".nav button")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === pageName
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


document.addEventListener("click", (event) => {

  const button = event.target.closest("[data-page]");

  if (!button) return;

  showPage(button.dataset.page);

  if (button.dataset.page === "series") {
    loadSeries();
  }

  if (button.dataset.page === "sounds") {
    loadSounds();
  }

});


/* =====================================================
   AUTHENTIFICATION
===================================================== */

function showAdmin(user) {

  currentUser = user;

  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

  console.log("Connecté :", user.email);

  loadDashboard();
  loadSeries();
  loadSounds();
}


function showLogin() {

  currentUser = null;

  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
}


async function checkSession() {

  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {

    console.error(
      "Erreur session :",
      error
    );

    return;
  }

  if (data.session) {
    showAdmin(data.session.user);
  } else {
    showLogin();
  }
}


/* =====================================================
   LOGIN
===================================================== */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    loginError.className = "info";
    loginError.textContent =
      "⏳ Connexion...";

    const email =
      $("loginEmail").value.trim();

    const password =
      $("loginPassword").value;

    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {

      console.error(error);

      loginError.className = "error";

      loginError.textContent =
        "❌ " + error.message;

      return;
    }

    loginError.className = "success";

    loginError.textContent =
      "✅ Connexion réussie !";

    showAdmin(data.user);
  }
);


/* =====================================================
   LOGOUT
===================================================== */

logoutBtn.addEventListener(
  "click",
  async () => {

    await supabase.auth.signOut();

    showLogin();
  }
);


/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {

  try {

    const seriesResult =
      await supabase
        .from("series")
        .select("id", {
          count: "exact",
          head: true
        });

    const chaptersResult =
      await supabase
        .from("chapters")
        .select("id", {
          count: "exact",
          head: true
        });

    const {
      data: soundFiles,
      error: soundError
    } = await supabase.storage
      .from("sounds")
      .list("", {
        limit: 1000
      });

    if (seriesResult.error)
      throw seriesResult.error;

    if (chaptersResult.error)
      throw chaptersResult.error;

    if (soundError)
      throw soundError;

    seriesCount.textContent =
      seriesResult.count ?? 0;

    chaptersCount.textContent =
      chaptersResult.count ?? 0;

    soundsCount.textContent =
      (soundFiles || []).length;

  } catch (error) {

    console.error(
      "Dashboard :",
      error
    );
  }
}


/* =====================================================
   SERIES — LISTE
===================================================== */

async function loadSeries() {

  seriesList.innerHTML =
    `<div class="box">⏳ Chargement...</div>`;

  const {
    data,
    error
  } = await supabase
    .from("series")
    .select(`
      id,
      title,
      slug,
      type,
      description,
      cover_url,
      status,
      author_id,
      created_at
    `)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(error);

    seriesList.innerHTML =
      `<div class="box error">
        ❌ ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  if (!data || data.length === 0) {

    seriesList.innerHTML =
      `<div class="box">
        Aucune œuvre pour le moment.
      </div>`;

    return;
  }

  seriesList.innerHTML =
    data.map(series => {

      const cover =
        series.cover_url ||
        "";

      return `
        <div class="item">

          <div class="item-main">

            ${
              cover
                ? `<img
                    class="cover"
                    src="${escapeAttribute(cover)}"
                    alt=""
                  >`
                : `<div class="cover"></div>`
            }

            <div class="item-info">

              <div class="item-title">
                ${escapeHTML(series.title || "Sans titre")}
              </div>

              <div class="item-meta">
                ${escapeHTML(series.type || "")}
                •
                ${escapeHTML(series.status || "")}
              </div>

              <div class="item-meta">
                ${escapeHTML(
                  series.description || ""
                ).slice(0, 150)}
              </div>

            </div>

          </div>

          <div class="item-actions">

            <button
              data-open-series="${series.id}"
            >
              📖 Chapitres
            </button>

            <button
              class="danger"
              data-delete-series="${series.id}"
            >
              🗑 Supprimer
            </button>

          </div>

        </div>
      `;

    }).join("");
}


/* =====================================================
   OUVRIR UNE SERIE
===================================================== */

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-open-series]"
      );

    if (!button) return;

    const seriesId =
      button.dataset.openSeries;

    await openSeries(seriesId);
  }
);


async function openSeries(seriesId) {

  const {
    data,
    error
  } = await supabase
    .from("series")
    .select("*")
    .eq("id", seriesId)
    .single();

  if (error) {

    alert(
      "Impossible de charger l'œuvre : " +
      error.message
    );

    return;
  }

  selectedSeries = data;

  selectedSeriesTitle.textContent =
    data.title;

  $("newChapterSeriesTitle").textContent =
    data.title;

  showPage("chapters");

  await loadChapters();
}


/* =====================================================
   SUPPRIMER UNE SERIE
===================================================== */

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-delete-series]"
      );

    if (!button) return;

    const id =
      button.dataset.deleteSeries;

    const confirmed =
      confirm(
        "Supprimer cette œuvre ?\n\n" +
        "Ses chapitres associés seront également supprimés."
      );

    if (!confirmed) return;

    const {
      error
    } = await supabase
      .from("series")
      .delete()
      .eq("id", id);

    if (error) {

      alert(
        "Erreur : " +
        error.message
      );

      return;
    }

    await loadSeries();
    await loadDashboard();

  }
);


/* =====================================================
   CREER UNE SERIE
===================================================== */

addSeriesForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    seriesSubmitBtn.disabled = true;

    seriesSubmitBtn.textContent =
      "Publication...";

    seriesStatusMsg.className =
      "status info";

    seriesStatusMsg.textContent =
      "⏳ Préparation...";

    try {

      if (!currentUser) {
        throw new Error(
          "Tu dois être connecté."
        );
      }

      const title =
        $("seriesTitle").value.trim();

      const type =
        $("seriesType").value;

      const genre =
        $("seriesGenre").value.trim();

      const status =
        $("seriesStatus").value;

      const description =
        $("seriesDescription")
          .value
          .trim();

      const coverFile =
        $("seriesCover").files[0];

      if (!title)
        throw new Error(
          "Le titre est obligatoire."
        );

      if (!description)
        throw new Error(
          "La description est obligatoire."
        );

      if (!coverFile)
        throw new Error(
          "Sélectionne une couverture."
        );


      /* =========================
         COUVERTURE
      ========================= */

      seriesStatusMsg.textContent =
        "⏳ Upload de la couverture...";

      const extension =
        coverFile.name
          .split(".")
          .pop()
          .toLowerCase();

      const fileName =
        `${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from("covers")
        .upload(
          fileName,
          coverFile,
          {
            cacheControl: "3600",
            upsert: false
          }
        );

      if (uploadError)
        throw uploadError;


      /* =========================
         URL
      ========================= */

      const {
        data: urlData
      } = supabase.storage
        .from("covers")
        .getPublicUrl(fileName);

      const coverUrl =
        urlData.publicUrl;


      /* =========================
         SLUG
      ========================= */

      const slug =
        createSlug(title) +
        "-" +
        crypto
          .randomUUID()
          .slice(0, 8);


      /* =========================
         BASE DE DONNEES
      ========================= */

      seriesStatusMsg.textContent =
        "⏳ Création de l'œuvre...";

      const {
        error: dbError
      } = await supabase
        .from("series")
        .insert({

          title,
          slug,
          type,
          description,
          cover_url: coverUrl,
          status,
          author_id: currentUser.id,

          // Colonne ajoutée précédemment.
          genre: genre || null

        });

      if (dbError)
        throw dbError;


      /* =========================
         SUCCES
      ========================= */

      seriesStatusMsg.className =
        "status success";

      seriesStatusMsg.textContent =
        "✅ Œuvre publiée avec succès !";

      addSeriesForm.reset();

      await loadSeries();
      await loadDashboard();

      setTimeout(() => {
        showPage("series");
      }, 700);

    } catch (error) {

      console.error(error);

      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ " + error.message;

    } finally {

      seriesSubmitBtn.disabled = false;

      seriesSubmitBtn.textContent =
        "Publier l'œuvre";
    }
  }
);


/* =====================================================
   CHAPITRES
===================================================== */

async function loadChapters() {

  if (!selectedSeries) return;

  chaptersList.innerHTML =
    `<div class="box">⏳ Chargement...</div>`;

  const {
    data,
    error
  } = await supabase
    .from("chapters")
    .select(`
      id,
      series_id,
      chapter_number,
      title,
      content,
      published_at,
      views,
      sound_url,
      created_at
    `)
    .eq(
      "series_id",
      selectedSeries.id
    )
    .order(
      "chapter_number",
      {
        ascending: true
      }
    );

  if (error) {

    console.error(error);

    chaptersList.innerHTML =
      `<div class="box error">
        ❌ ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  if (!data || data.length === 0) {

    chaptersList.innerHTML =
      `<div class="box">
        Aucun chapitre pour cette œuvre.
      </div>`;

    return;
  }

  chaptersList.innerHTML =
    data.map(chapter => {

      return `
        <div class="item">

          <div class="item-title">
            Chapitre ${escapeHTML(
              String(chapter.chapter_number)
            )}
            — ${escapeHTML(
              chapter.title || "Sans titre"
            )}
          </div>

          <div class="item-meta">

            ${
              chapter.published_at
                ? "Publié"
                : "Non publié"
            }

            ${
              chapter.views != null
                ? ` • ${chapter.views} vues`
                : ""
            }

          </div>

          ${
            chapter.sound_url
              ? `
                <div class="item-meta">
                  🎵 Son associé
                </div>
              `
              : ""
          }

          <div class="item-actions">

            <button
              class="danger"
              data-delete-chapter="${chapter.id}"
            >
              🗑 Supprimer
            </button>

          </div>

        </div>
      `;

    }).join("");
}


/* =====================================================
   NOUVEAU CHAPITRE
===================================================== */

newChapterBtn.addEventListener(
  "click",
  async () => {

    if (!selectedSeries) {

      alert(
        "Sélectionne d'abord une œuvre."
      );

      return;
    }

    $("newChapterSeriesTitle")
      .textContent =
      selectedSeries.title;

    await loadSoundOptions();

    showPage("new-chapter");
  }
);


/* =====================================================
   CREER CHAPITRE
===================================================== */

addChapterForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!selectedSeries) {

      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Aucune œuvre sélectionnée.";

      return;
    }

    chapterSubmitBtn.disabled = true;

    chapterSubmitBtn.textContent =
      "Publication...";

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "⏳ Publication du chapitre...";

    try {

      const chapterNumber =
        Number(
          $("chapterNumber").value
        );

      const title =
        $("chapterTitle")
          .value
          .trim();

      const content =
        $("chapterContent")
          .value
          .trim();

      const soundUrl =
        chapterSound.value || null;


      if (!chapterNumber || chapterNumber < 1)
        throw new Error(
          "Le numéro du chapitre est invalide."
        );

      if (!title)
        throw new Error(
          "Le titre du chapitre est obligatoire."
        );

      if (!content)
        throw new Error(
          "Le contenu du chapitre est obligatoire."
        );


      const {
        error
      } = await supabase
        .from("chapters")
        .insert({

          series_id:
            selectedSeries.id,

          chapter_number:
            chapterNumber,

          title,

          content,

          sound_url:
            soundUrl,

          published_at:
            new Date().toISOString(),

          views: 0

        });


      if (error)
        throw error;


      chapterStatusMsg.className =
        "status success";

      chapterStatusMsg.textContent =
        "✅ Chapitre publié avec succès !";

      addChapterForm.reset();

      await loadDashboard();

      setTimeout(async () => {

        showPage("chapters");

        await loadChapters();

      }, 700);


    } catch (error) {

      console.error(error);

      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ " + error.message;

    } finally {

      chapterSubmitBtn.disabled = false;

      chapterSubmitBtn.textContent =
        "Publier le chapitre";
    }

  }
);


/* =====================================================
   SUPPRIMER CHAPITRE
===================================================== */

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-delete-chapter]"
      );

    if (!button) return;

    const id =
      button.dataset.deleteChapter;

    if (
      !confirm(
        "Supprimer définitivement ce chapitre ?"
      )
    ) {
      return;
    }

    const {
      error
    } = await supabase
      .from("chapters")
      .delete()
      .eq("id", id);

    if (error) {

      alert(
        "Erreur : " +
        error.message
      );

      return;
    }

    await loadChapters();
    await loadDashboard();

  }
);


/* =====================================================
   SONS — CHARGEMENT
===================================================== */

async function loadSounds() {

  soundsList.innerHTML =
    `<div class="box">⏳ Chargement...</div>`;

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list("", {
      limit: 1000,
      sortBy: {
        column: "created_at",
        order: "desc"
      }
    });

  if (error) {

    console.error(error);

    soundsList.innerHTML =
      `<div class="box error">
        ❌ ${escapeHTML(error.message)}
      </div>`;

    return;
  }

  const files =
    (data || [])
      .filter(file => file.name);

  if (files.length === 0) {

    soundsList.innerHTML =
      `<div class="box">
        Aucun son pour le moment.
      </div>`;

    return;
  }

  soundsList.innerHTML =
    files.map(file => {

      const {
        data: urlData
      } = supabase.storage
        .from("sounds")
        .getPublicUrl(file.name);

      const url =
        urlData.publicUrl;

      return `
        <div class="item">

          <div class="sound-row">

            <div class="sound-name">
              🎵 ${escapeHTML(file.name)}
            </div>

            <audio
              controls
              preload="none"
              src="${escapeAttribute(url)}"
            ></audio>

          </div>

          <div class="item-actions">

            <button
              class="danger"
              data-delete-sound="${escapeAttribute(file.name)}"
            >
              🗑 Supprimer
            </button>

          </div>

        </div>
      `;

    }).join("");
}


/* =====================================================
   UPLOAD SON
===================================================== */

soundForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const file =
      $("soundFile").files[0];

    if (!file) {

      soundStatusMsg.className =
        "status error";

      soundStatusMsg.textContent =
        "❌ Sélectionne un fichier audio.";

      return;
    }

    soundSubmitBtn.disabled = true;

    soundSubmitBtn.textContent =
      "Upload...";

    soundStatusMsg.className =
      "status info";

    soundStatusMsg.textContent =
      "⏳ Upload du son...";

    try {

      const extension =
        file.name
          .split(".")
          .pop()
          .toLowerCase();

      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

      const fileName =
        `${Date.now()}_${crypto.randomUUID().slice(0, 8)}_${safeName}`;

      const {
        error
      } = await supabase.storage
        .from("sounds")
        .upload(
          fileName,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              file.type ||
              `audio/${extension}`
          }
        );

      if (error)
        throw error;

      soundStatusMsg.className =
        "status success";

      soundStatusMsg.textContent =
        "✅ Son ajouté !";

      soundForm.reset();

      await loadSounds();
      await loadSoundOptions();
      await loadDashboard();

    } catch (error) {

      console.error(error);

      soundStatusMsg.className =
        "status error";

      soundStatusMsg.textContent =
        "❌ " + error.message;

    } finally {

      soundSubmitBtn.disabled = false;

      soundSubmitBtn.textContent =
        "Ajouter le son";
    }
  }
);


/* =====================================================
   SUPPRIMER SON
===================================================== */

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-delete-sound]"
      );

    if (!button) return;

    const fileName =
      button.dataset.deleteSound;

    if (
      !confirm(
        "Supprimer ce son du bucket ?"
      )
    ) {
      return;
    }

    const {
      error
    } = await supabase.storage
      .from("sounds")
      .remove([
        fileName
      ]);

    if (error) {

      alert(
        "Erreur : " +
        error.message
      );

      return;
    }

    await loadSounds();
    await loadSoundOptions();
    await loadDashboard();

  }
);


/* =====================================================
   OPTIONS DES SONS POUR CHAPITRE
===================================================== */

async function loadSoundOptions() {

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list("", {
      limit: 1000
    });

  if (error) {

    console.error(
      "Sons :",
      error
    );

    return;
  }

  const files =
    (data || [])
      .filter(file => file.name);

  chapterSound.innerHTML =
    `<option value="">
      Aucun son
    </option>`;

  files.forEach(file => {

    const {
      data: urlData
    } = supabase.storage
      .from("sounds")
      .getPublicUrl(file.name);

    const option =
      document.createElement("option");

    option.value =
      urlData.publicUrl;

    option.textContent =
      file.name;

    chapterSound.appendChild(
      option
    );

  });
}


/* =====================================================
   UTILITAIRES
===================================================== */

function createSlug(text) {

  return text
    .toString()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


function escapeAttribute(value) {

  return escapeHTML(value);
}


/* =====================================================
   AUTH STATE
===================================================== */

supabase.auth.onAuthStateChange(
  (event, session) => {

    console.log(
      "Auth :",
      event
    );

    if (session) {
      showAdmin(session.user);
    } else {
      showLogin();
    }
  }
);


/* =====================================================
   DEMARRAGE
===================================================== */

checkSession();
