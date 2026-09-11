import { supabase } from "./supabaseClient.js";

/* =========================
   HELPERS
========================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function createSlug(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatChapterLabel(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const label = String(value).trim();

  if (!label) {
    return "";
  }

  if (
    label.toLowerCase().startsWith("chapitre")
  ) {
    return label;
  }

  return `Chapitre ${label}`;
}


/* =========================
   ELEMENTS
========================= */

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


/* =========================
   ETAT
========================= */

let currentUser = null;
let selectedSeries = null;

/*
 * Etat de modification d'un chapitre.
 *
 * null = création normale
 * id   = modification d'un chapitre existant
 */
let editingChapterId = null;

/*
 * Image actuellement utilisée par le chapitre.
 * Si aucune nouvelle image n'est sélectionnée
 * pendant la modification, elle sera conservée.
 */
let editingChapterImageUrl = null;


/* =========================
   NAVIGATION
========================= */

function showPage(pageName) {
  document
    .querySelectorAll(".page")
    .forEach((page) => {
      page.classList.remove("active");
    });

  const target = $(`page-${pageName}`);

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll("[data-page]")
    .forEach((button) => {
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


document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest("[data-page]");

    if (!button) return;

    const page = button.dataset.page;

    showPage(page);

    if (page === "series") {
      await loadSeries();
    }

    if (page === "sounds") {
      await loadSounds();
    }
  }
);


/* =========================
   AUTH
========================= */

function showAdmin(user) {
  currentUser = user;

  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

  console.log(
    "Connecté :",
    user.email
  );

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

    showLogin();
    return;
  }

  if (data.session) {
    showAdmin(data.session.user);
  } else {
    showLogin();
  }
}


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

    if (!email || !password) {
      loginError.className = "error";
      loginError.textContent =
        "❌ Remplis tous les champs.";
      return;
    }

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


logoutBtn.addEventListener(
  "click",
  async () => {
    await supabase.auth.signOut();

    selectedSeries = null;

    editingChapterId = null;
    editingChapterImageUrl = null;

    showLogin();
  }
);


/* =========================
   DASHBOARD
========================= */

async function loadDashboard() {
  try {
    const [
      seriesResult,
      chaptersResult,
      soundsResult
    ] = await Promise.all([
      supabase
        .from("series")
        .select("id", {
          count: "exact",
          head: true
        }),

      supabase
        .from("chapters")
        .select("id", {
          count: "exact",
          head: true
        }),

      supabase.storage
        .from("sounds")
        .list("", {
          limit: 1000
        })
    ]);

    if (seriesCount) {
      seriesCount.textContent =
        seriesResult.count ?? 0;
    }

    if (chaptersCount) {
      chaptersCount.textContent =
        chaptersResult.count ?? 0;
    }

    if (soundsCount) {
      if (soundsResult.error) {
        soundsCount.textContent = "0";
      } else {
        soundsCount.textContent =
          soundsResult.data?.length ?? 0;
      }
    }
  } catch (error) {
    console.error(
      "Erreur dashboard :",
      error
    );
  }
}


/* =========================
   SERIES
========================= */

async function loadSeries() {
  if (!seriesList) return;

  seriesList.innerHTML =
    "Chargement...";

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
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {
    console.error(error);

    seriesList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur : ${escapeHTML(error.message)}
        </p>
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {
    seriesList.innerHTML = `
      <div class="item">
        Aucune œuvre pour le moment.
      </div>
    `;

    return;
  }

  seriesList.innerHTML =
    data
      .map((series) => {
        return `
          <div class="item">

            <div class="item-main">

              ${
                series.cover_url
                  ? `
                    <img
                      class="cover"
                      src="${escapeAttribute(
                        series.cover_url
                      )}"
                      alt="${escapeAttribute(
                        series.title
                      )}"
                    >
                  `
                  : `
                    <div class="cover"></div>
                  `
              }

              <div class="item-info">

                <div class="item-title">
                  ${escapeHTML(
                    series.title
                  )}
                </div>

                <div class="item-meta">
                  Type :
                  ${escapeHTML(
                    series.type || "—"
                  )}
                  <br>

                  Statut :
                  ${escapeHTML(
                    series.status || "—"
                  )}
                  <br>

                  Slug :
                  ${escapeHTML(
                    series.slug || "—"
                  )}
                </div>

              </div>

            </div>

            <div class="item-actions">

              <button
                type="button"
                data-open-series="${escapeAttribute(
                  series.id
                )}"
              >
                📖 Chapitres
              </button>

              <button
                type="button"
                class="danger"
                data-delete-series="${escapeAttribute(
                  series.id
                )}"
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}


/* =========================
   OUVRIR UNE OEUVRE
========================= */

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
    console.error(error);

    alert(
      "Impossible de charger l'œuvre : " +
      error.message
    );

    return;
  }

  selectedSeries = data;

  selectedSeriesTitle.textContent =
    data.title || "—";

  const description =
    $("chapterSeriesDescription");

  if (description) {
    description.textContent =
      data.description ||
      "Gestion des chapitres.";
  }

  const newChapterSeriesTitle =
    $("newChapterSeriesTitle");

  if (newChapterSeriesTitle) {
    newChapterSeriesTitle.textContent =
      data.title || "—";
  }

  showPage("chapters");

  await loadChapters();
}


document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-open-series]"
      );

    if (!button) return;

    await openSeries(
      button.dataset.openSeries
    );
  }
);


/* =========================
   SUPPRIMER UNE OEUVRE
========================= */

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

    if (
      !confirm(
        "Supprimer définitivement cette œuvre ?"
      )
    ) {
      return;
    }

    const {
      error
    } = await supabase
      .from("series")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);

      alert(
        "Erreur : " +
        error.message
      );

      return;
    }

    if (
      selectedSeries &&
      selectedSeries.id === id
    ) {
      selectedSeries = null;
    }

    await loadSeries();
    await loadDashboard();
  }
);


/* =========================
   CREER UNE OEUVRE
========================= */

addSeriesForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!currentUser) {
      alert(
        "Tu dois être connecté."
      );
      return;
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
      $("seriesDescription").value.trim();

    const coverFile =
      $("seriesCover").files[0];

    if (
      !title ||
      !description ||
      !coverFile
    ) {
      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Remplis tous les champs obligatoires.";

      return;
    }

    seriesSubmitBtn.disabled = true;

    seriesStatusMsg.className =
      "status info";

    seriesStatusMsg.textContent =
      "⏳ Envoi de la couverture...";

    try {
      const extension =
        coverFile.name
          .split(".")
          .pop();

      const slug =
        createSlug(title);

      const filePath =
        `${slug}-${Date.now()}.${extension}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from("Cover series")
        .upload(
          filePath,
          coverFile,
          {
            upsert: false
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData
      } = supabase.storage
        .from("Cover series")
        .getPublicUrl(filePath);

      const coverUrl =
        publicUrlData.publicUrl;

      seriesStatusMsg.textContent =
        "⏳ Création de l'œuvre...";

      const {
        error: insertError
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
          genre
        });

      if (insertError) {
        throw insertError;
      }

      seriesStatusMsg.className =
        "status success";

      seriesStatusMsg.textContent =
        "✅ Œuvre publiée avec succès !";

      addSeriesForm.reset();

      await loadSeries();
      await loadDashboard();

    } catch (error) {
      console.error(error);

      seriesStatusMsg.className =
        "status error";

      seriesStatusMsg.textContent =
        "❌ Erreur : " +
        error.message;
    }

    seriesSubmitBtn.disabled = false;
  }
);


/* =========================
   CHAPITRES
========================= */

async function loadChapters() {
  if (!selectedSeries) {
    chaptersList.innerHTML = `
      <div class="item">
        Aucune œuvre sélectionnée.
      </div>
    `;

    return;
  }

  chaptersList.innerHTML =
    "Chargement...";

  const {
    data,
    error
  } = await supabase
    .from("chapters")
    .select(`
      id,
      series_id,
      chapter_number,
      chapter_label,
      title,
      content,
      chapter_image_url,
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

    chaptersList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur : ${escapeHTML(
            error.message
          )}
        </p>
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {
    chaptersList.innerHTML = `
      <div class="item">
        Aucun chapitre pour cette œuvre.
      </div>
    `;

    return;
  }

  chaptersList.innerHTML =
    data
      .map((chapter) => {
        const displayLabel =
          formatChapterLabel(
            chapter.chapter_label ??
            chapter.chapter_number
          );

        const published =
          chapter.published_at
            ? new Date(
                chapter.published_at
              ).toLocaleString(
                "fr-FR"
              )
            : "Non publié";

        return `
          <div class="item">

            <div class="item-main">

              ${
                chapter.chapter_image_url
                  ? `
                    <img
                      class="cover"
                      src="${escapeAttribute(
                        chapter.chapter_image_url
                      )}"
                      alt="${escapeAttribute(
                        chapter.title ||
                        displayLabel
                      )}"
                    >
                  `
                  : `
                    <div class="cover"></div>
                  `
              }

              <div class="item-info">

                <div class="item-title">

                  ${escapeHTML(
                    displayLabel
                  )}

                  ${
                    chapter.title
                      ? `
                        — ${escapeHTML(
                          chapter.title
                        )}
                      `
                      : ""
                  }

                </div>

                <div class="item-meta">

                  Numéro interne :
                  ${escapeHTML(
                    chapter.chapter_number
                  )}
                  <br>

                  Publication :
                  ${escapeHTML(
                    published
                  )}
                  <br>

                  Vues :
                  ${escapeHTML(
                    chapter.views ?? 0
                  )}
                  <br>

                  ${
                    chapter.sound_url
                      ? "🎵 Son associé"
                      : "🔇 Aucun son"
                  }

                </div>

              </div>

            </div>

            <div class="item-actions">

              <button
                type="button"
                class="secondary"
                data-edit-chapter="${escapeAttribute(
                  chapter.id
                )}"
              >
                ✏️ Modifier
              </button>

              <button
                type="button"
                class="danger"
                data-delete-chapter="${escapeAttribute(
                  chapter.id
                )}"
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}


/* =========================
   NOUVEAU CHAPITRE
========================= */

newChapterBtn.addEventListener(
  "click",
  async () => {

    /*
     * Si une modification est en cours,
     * le bouton sert à annuler.
     */
    if (editingChapterId) {
      editingChapterId = null;
      editingChapterImageUrl = null;

      addChapterForm.reset();

      $("chapterImage").required =
        true;

      chapterSubmitBtn.textContent =
        "Publier le chapitre";

      newChapterBtn.textContent =
        "➕ Nouveau chapitre";

      chapterStatusMsg.className =
        "status";

      chapterStatusMsg.textContent =
        "";

      if (selectedSeries) {
        $("newChapterSeriesTitle")
          .textContent =
          selectedSeries.title;
      }

      showPage("chapters");

      return;
    }

    if (!selectedSeries) {
      alert(
        "Sélectionne d'abord une œuvre."
      );

      return;
    }

    editingChapterId = null;
    editingChapterImageUrl = null;

    addChapterForm.reset();

    $("chapterImage").required =
      true;

    chapterSubmitBtn.textContent =
      "Publier le chapitre";

    newChapterBtn.textContent =
      "➕ Nouveau chapitre";

    chapterStatusMsg.className =
      "status";

    chapterStatusMsg.textContent =
      "";

    $("newChapterSeriesTitle")
      .textContent =
      selectedSeries.title;

    await loadSoundOptions();

    showPage("new-chapter");
  }
);


/* =========================
   MODIFIER UN CHAPITRE
========================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "[data-edit-chapter]"
      );

    if (!button) return;

    const chapterId =
      button.dataset.editChapter;

    if (!selectedSeries) {
      alert(
        "Aucune œuvre sélectionnée."
      );

      return;
    }

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "⏳ Chargement du chapitre...";

    const {
      data: chapter,
      error
    } = await supabase
      .from("chapters")
      .select(`
        id,
        series_id,
        chapter_number,
        chapter_label,
        title,
        content,
        chapter_image_url,
        sound_url,
        published_at,
        views
      `)
      .eq("id", chapterId)
      .single();

    if (error) {
      console.error(error);

      alert(
        "Impossible de charger le chapitre : " +
        error.message
      );

      return;
    }

    editingChapterId =
      chapter.id;

    editingChapterImageUrl =
      chapter.chapter_image_url ||
      null;

    $("chapterNumber").value =
      chapter.chapter_number ?? "";

    $("chapterLabel").value =
      chapter.chapter_label ?? "";

    $("chapterTitle").value =
      chapter.title ?? "";

    $("chapterContent").value =
      chapter.content ?? "";

    /*
     * On recharge les sons avant
     * de sélectionner celui du chapitre.
     */
    await loadSoundOptions();

    $("chapterSound").value =
      chapter.sound_url || "";

    /*
     * L'image devient facultative
     * pendant une modification.
     */
    $("chapterImage").required =
      false;

    chapterSubmitBtn.textContent =
      "Enregistrer les modifications";

    newChapterBtn.textContent =
      "↩️ Annuler la modification";

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "✏️ Modification du chapitre.";

    $("newChapterSeriesTitle")
      .textContent =
      selectedSeries.title;

    showPage("new-chapter");
  }
);


/* =========================
   CREER / MODIFIER CHAPITRE
========================= */

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

    const chapterNumber =
      Number(
        $("chapterNumber").value
      );

    const chapterLabel =
      $("chapterLabel").value.trim();

    const title =
      $("chapterTitle").value.trim();

    const content =
      $("chapterContent").value.trim();

    const imageFile =
      $("chapterImage").files[0];

    const soundUrl =
      $("chapterSound").value;

    /* =========================
       VALIDATION
    ========================= */

    if (
      !chapterNumber ||
      chapterNumber < 1
    ) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le numéro interne est invalide.";

      return;
    }

    if (!chapterLabel) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le numéro / libellé affiché est obligatoire.";

      return;
    }

    if (!title) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le titre est obligatoire.";

      return;
    }

    if (!content) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Le contenu est obligatoire.";

      return;
    }

    /*
     * En création : image obligatoire.
     * En modification : image facultative.
     */
    if (
      !editingChapterId &&
      !imageFile
    ) {
      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ L'image du chapitre est obligatoire.";

      return;
    }

    if (imageFile) {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (
        !allowedTypes.includes(
          imageFile.type
        )
      ) {
        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ Format d'image non autorisé.";

        return;
      }

      if (
        imageFile.size >
        10 * 1024 * 1024
      ) {
        chapterStatusMsg.className =
          "status error";

        chapterStatusMsg.textContent =
          "❌ L'image ne doit pas dépasser 10 Mo.";

        return;
      }
    }

    chapterSubmitBtn.disabled =
      true;

    chapterStatusMsg.className =
      "status info";

    chapterStatusMsg.textContent =
      "⏳ Enregistrement...";


    try {

      /* =========================
         MODIFICATION
      ========================= */

      if (editingChapterId) {

        let chapterImageUrl =
          editingChapterImageUrl;

        /*
         * Une nouvelle image n'est uploadée
         * que si l'utilisateur en sélectionne une.
         */
        if (imageFile) {

          const extension =
            imageFile.name
              .split(".")
              .pop();

          const filePath =
            `${selectedSeries.id}/${editingChapterId}-${Date.now()}.${extension}`;

          chapterStatusMsg.textContent =
            "⏳ Envoi de la nouvelle image...";

          const {
            error: uploadError
          } = await supabase.storage
            .from("chapter-images")
            .upload(
              filePath,
              imageFile,
              {
                upsert: false
              }
            );

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: publicUrlData
          } = supabase.storage
            .from("chapter-images")
            .getPublicUrl(
              filePath
            );

          chapterImageUrl =
            publicUrlData.publicUrl;
        }

        chapterStatusMsg.textContent =
          "⏳ Mise à jour du chapitre...";

        /*
         * IMPORTANT :
         *
         * published_at n'est PAS modifié.
         * views n'est PAS modifié.
         *
         * On modifie uniquement
         * les informations éditoriales.
         */
        const {
          data: updatedChapter,
          error: updateError
        } = await supabase
          .from("chapters")
          .update({
            chapter_number:
              chapterNumber,

            chapter_label:
              chapterLabel,

            title,

            content,

            chapter_image_url:
              chapterImageUrl,

            sound_url:
              soundUrl || null
          })
          .eq(
            "id",
            editingChapterId
          )
          .select("id");

        if (updateError) {
          throw updateError;
        }

        if (
          !updatedChapter ||
          updatedChapter.length === 0
        ) {
          throw new Error(
            "Le chapitre n'a pas été modifié. Supabase n'a modifié aucune ligne."
          );
        }

        chapterStatusMsg.className =
          "status success";

        chapterStatusMsg.textContent =
          "✅ Chapitre modifié avec succès !";

        editingChapterId = null;
        editingChapterImageUrl = null;

        addChapterForm.reset();

        $("chapterImage").required =
          true;

        chapterSubmitBtn.textContent =
          "Publier le chapitre";

        newChapterBtn.textContent =
          "➕ Nouveau chapitre";

        await loadChapters();
        await loadDashboard();

        chapterSubmitBtn.disabled =
          false;

        showPage("chapters");

        return;
      }


      /* =========================
         CREATION
      ========================= */

      let chapterImageUrl =
        null;

      if (imageFile) {

        const extension =
          imageFile.name
            .split(".")
            .pop();

        const filePath =
          `${selectedSeries.id}/${Date.now()}-${createSlug(
            title
          )}.${extension}`;

        chapterStatusMsg.textContent =
          "⏳ Envoi de l'image...";

        const {
          error: uploadError
        } = await supabase.storage
          .from("chapter-images")
          .upload(
            filePath,
            imageFile,
            {
              upsert: false
            }
          );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicUrlData
        } = supabase.storage
          .from("chapter-images")
          .getPublicUrl(
            filePath
          );

        chapterImageUrl =
          publicUrlData.publicUrl;
      }

      chapterStatusMsg.textContent =
        "⏳ Publication du chapitre...";

      const {
        error: insertError
      } = await supabase
        .from("chapters")
        .insert({
          series_id:
            selectedSeries.id,

          chapter_number:
            chapterNumber,

          chapter_label:
            chapterLabel,

          title,

          content,

          chapter_image_url:
            chapterImageUrl,

          sound_url:
            soundUrl || null,

          published_at:
            new Date().toISOString(),

          views: 0
        });

      if (insertError) {
        throw insertError;
      }

      chapterStatusMsg.className =
        "status success";

      chapterStatusMsg.textContent =
        "✅ Chapitre publié avec succès !";

      addChapterForm.reset();

      editingChapterId = null;
      editingChapterImageUrl = null;

      $("chapterImage").required =
        true;

      chapterSubmitBtn.textContent =
        "Publier le chapitre";

      newChapterBtn.textContent =
        "➕ Nouveau chapitre";

      await loadChapters();
      await loadDashboard();

      chapterSubmitBtn.disabled =
        false;

      showPage("chapters");

    } catch (error) {

      console.error(error);

      chapterStatusMsg.className =
        "status error";

      chapterStatusMsg.textContent =
        "❌ Erreur : " +
        error.message;

      chapterSubmitBtn.disabled =
        false;
    }
  }
);


/* =========================
   SUPPRIMER UN CHAPITRE
========================= */

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
      data: deletedChapter,
      error
    } = await supabase
      .from("chapters")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error(error);

      alert(
        "Erreur lors de la suppression : " +
        error.message
      );

      return;
    }

    if (
      !deletedChapter ||
      deletedChapter.length === 0
    ) {
      alert(
        "❌ Le chapitre n'a pas été supprimé. Supabase n'a supprimé aucune ligne."
      );

      return;
    }

    /*
     * On recharge uniquement
     * les données nécessaires.
     */
    await loadChapters();
    await loadDashboard();
  }
);


/* =========================
   SONS
========================= */

async function loadSounds() {
  if (!soundsList) return;

  soundsList.innerHTML =
    "Chargement...";

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list("", {
      limit: 1000,
      sortBy: {
        column: "name",
        order: "asc"
      }
    });

  if (error) {
    console.error(error);

    soundsList.innerHTML = `
      <div class="item">
        <p class="error">
          Erreur : ${escapeHTML(
            error.message
          )}
        </p>
      </div>
    `;

    return;
  }

  const files =
    (data || []).filter(
      (file) => file.name
    );

  if (files.length === 0) {
    soundsList.innerHTML = `
      <div class="item">
        Aucun son pour le moment.
      </div>
    `;

    return;
  }

  soundsList.innerHTML =
    files
      .map((file) => {

        const {
          data: publicUrlData
        } = supabase.storage
          .from("sounds")
          .getPublicUrl(
            file.name
          );

        const url =
          publicUrlData.publicUrl;

        return `
          <div class="item">

            <div class="sound-row">

              <div class="sound-name">
                <strong>
                  ${escapeHTML(
                    file.name
                  )}
                </strong>
              </div>

              <audio
                controls
                src="${escapeAttribute(
                  url
                )}"
              ></audio>

              <button
                type="button"
                class="danger"
                data-delete-sound="${escapeAttribute(
                  file.name
                )}"
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}


async function loadSoundOptions() {
  if (!chapterSound) return;

  const currentValue =
    chapterSound.value;

  const {
    data,
    error
  } = await supabase.storage
    .from("sounds")
    .list("", {
      limit: 1000,
      sortBy: {
        column: "name",
        order: "asc"
      }
    });

  if (error) {
    console.error(error);
    return;
  }

  const files =
    (data || []).filter(
      (file) => file.name
    );

  chapterSound.innerHTML = `
    <option value="">
      Aucun son
    </option>
  `;

  files.forEach((file) => {

    const {
      data: publicUrlData
    } = supabase.storage
      .from("sounds")
      .getPublicUrl(
        file.name
      );

    const option =
      document.createElement(
        "option"
      );

    option.value =
      publicUrlData.publicUrl;

    option.textContent =
      file.name;

    chapterSound.appendChild(
      option
    );
  });

  /*
   * Lors d'une modification,
   * on restaure le son actuel.
   */
  if (currentValue) {
    chapterSound.value =
      currentValue;
  }
}


/* =========================
   AJOUTER UN SON
========================= */

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

    soundSubmitBtn.disabled =
      true;

    soundStatusMsg.className =
      "status info";

    soundStatusMsg.textContent =
      "⏳ Envoi du son...";

    try {

      const extension =
        file.name
          .split(".")
          .pop();

      const baseName =
        file.name
          .replace(
            /\.[^/.]+$/,
            ""
          );

      const fileName =
        `${createSlug(
          baseName
        )}-${Date.now()}.${extension}`;

      const {
        error
      } = await supabase.storage
        .from("sounds")
        .upload(
          fileName,
          file,
          {
            upsert: false
          }
        );

      if (error) {
        throw error;
      }

      soundStatusMsg.className =
        "status success";

      soundStatusMsg.textContent =
        "✅ Son ajouté avec succès !";

      soundForm.reset();

      await loadSounds();
      await loadSoundOptions();
      await loadDashboard();

    } catch (error) {

      console.error(error);

      soundStatusMsg.className =
        "status error";

      soundStatusMsg.textContent =
        "❌ Erreur : " +
        error.message;

    } finally {
      soundSubmitBtn.disabled =
        false;
    }
  }
);


/* =========================
   SUPPRIMER UN SON
========================= */

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
        "Supprimer définitivement ce son ?"
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
      console.error(error);

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


/* =========================
   AUTH STATE
========================= */

supabase.auth.onAuthStateChange(
  (event, session) => {

    console.log(
      "Auth :",
      event
    );

    if (session) {
      showAdmin(
        session.user
      );
    } else {
      showLogin();
    }
  }
);


/* =========================
   DEMARRAGE
========================= */

checkSession();
