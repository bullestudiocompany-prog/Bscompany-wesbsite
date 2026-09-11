import { supabase } from "./supabaseClient.js";

/* =========================================================
   HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "")
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


/* =========================================================
   DOM — AUTH
========================================================= */

const loginSection = $("loginSection");
const adminApp = $("adminApp");

const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginError = $("loginError");

const logoutBtn = $("logoutBtn");


/* =========================================================
   DOM — NAVIGATION
========================================================= */

const navItems = document.querySelectorAll("[data-section]");


/* =========================================================
   DOM — SERIES
========================================================= */

const seriesList = $("seriesList");
const seriesCount = $("seriesCount");

const newSeriesBtn = $("newSeriesBtn");
const newSeriesSection = $("newSeriesSection");
const seriesForm = $("seriesForm");
const seriesStatusMsg = $("seriesStatusMsg");


/* =========================================================
   DOM — CHAPTERS
========================================================= */

const chaptersList = $("chaptersList");
const chaptersCount = $("chaptersCount");

const newChapterBtn = $("newChapterBtn");
const newChapterSection = $("newChapterSection");

const chapterForm = $("chapterForm");

const chapterNumber = $("chapterNumber");
const chapterLabel = $("chapterLabel");
const chapterTitle = $("chapterTitle");
const chapterContent = $("chapterContent");
const chapterImage = $("chapterImage");
const chapterSound = $("chapterSound");

const chapterSubmitBtn = $("chapterSubmitBtn");
const chapterStatusMsg = $("chapterStatusMsg");


/* =========================================================
   DOM — SOUNDS
========================================================= */

const soundsList = $("soundsList");
const soundForm = $("soundForm");
const soundFile = $("soundFile");
const soundName = $("soundName");
const soundStatusMsg = $("soundStatusMsg");


/* =========================================================
   DOM — DASHBOARD
========================================================= */

const dashboardSeriesCount = $("dashboardSeriesCount");
const dashboardChapterCount = $("dashboardChapterCount");
const dashboardViewsCount = $("dashboardViewsCount");
const dashboardLikesCount = $("dashboardLikesCount");


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let selectedSeries = null;

let editingChapterId = null;
let editingChapterImageUrl = null;


/* =========================================================
   NAVIGATION
========================================================= */

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const sectionId = item.dataset.section;

    if (!sectionId) {
      return;
    }

    document
      .querySelectorAll(".admin-section")
      .forEach((section) => {
        section.classList.remove("active");
      });

    const target = $(sectionId);

    if (target) {
      target.classList.add("active");
    }

    navItems.forEach((nav) => {
      nav.classList.remove("active");
    });

    item.classList.add("active");
  });
});


/* =========================================================
   AUTH — AFFICHAGE
========================================================= */

function showLogin() {
  if (loginSection) {
    loginSection.style.display = "";
  }

  if (adminApp) {
    adminApp.style.display = "none";
  }
}

function showAdmin() {
  if (loginSection) {
    loginSection.style.display = "none";
  }

  if (adminApp) {
    adminApp.style.display = "";
  }
}


/* =========================================================
   AUTH — SESSION
========================================================= */

async function checkSession() {
  try {
    const {
      data,
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error(error);
      showLogin();
      return;
    }

    currentUser = data?.session?.user || null;

    if (currentUser) {
      showAdmin();

      await loadDashboard();
      await loadSeries();
      await loadChapters();
      await loadSounds();
      await loadSoundOptions();
    } else {
      showLogin();
    }

  } catch (error) {
    console.error("Erreur session :", error);
    showLogin();
  }
}


/* =========================================================
   AUTH — LOGIN
========================================================= */

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (loginError) {
      loginError.textContent = "";
    }

    const email = loginEmail?.value.trim();
    const password = loginPassword?.value;

    if (!email || !password) {
      if (loginError) {
        loginError.textContent =
          "Veuillez remplir tous les champs.";
      }

      return;
    }

    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      currentUser = data.user;

      showAdmin();

      await loadDashboard();
      await loadSeries();
      await loadChapters();
      await loadSounds();
      await loadSoundOptions();

    } catch (error) {
      console.error(error);

      if (loginError) {
        loginError.textContent =
          error.message ||
          "Identifiants incorrects.";
      }
    }
  });
}


/* =========================================================
   AUTH — LOGOUT
========================================================= */

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await supabase.auth.signOut();

      currentUser = null;
      selectedSeries = null;

      showLogin();

    } catch (error) {
      console.error("Erreur déconnexion :", error);
    }
  });
}


/* =========================================================
   AUTH STATE
========================================================= */

supabase.auth.onAuthStateChange(
  async (_event, session) => {
    currentUser = session?.user || null;

    if (currentUser) {
      showAdmin();
    } else {
      showLogin();
    }
  }
);


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  try {
    const [
      seriesResult,
      chaptersResult,
      viewsResult,
      likesResult
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

      supabase
        .from("chapters")
        .select("views"),

      supabase
        .from("likes")
        .select("id", {
          count: "exact",
          head: true
        })
    ]);

    if (seriesResult.error) {
      console.error(
        "Erreur compteur séries :",
        seriesResult.error
      );
    }

    if (chaptersResult.error) {
      console.error(
        "Erreur compteur chapitres :",
        chaptersResult.error
      );
    }

    if (viewsResult.error) {
      console.error(
        "Erreur compteur vues :",
        viewsResult.error
      );
    }

    if (likesResult.error) {
      console.error(
        "Erreur compteur likes :",
        likesResult.error
      );
    }

    const totalViews =
      (viewsResult.data || []).reduce(
        (total, chapter) =>
          total + (Number(chapter.views) || 0),
        0
      );

    if (dashboardSeriesCount) {
      dashboardSeriesCount.textContent =
        seriesResult.count ?? 0;
    }

    if (dashboardChapterCount) {
      dashboardChapterCount.textContent =
        chaptersResult.count ?? 0;
    }

    if (dashboardViewsCount) {
      dashboardViewsCount.textContent =
        totalViews;
    }

    if (dashboardLikesCount) {
      dashboardLikesCount.textContent =
        likesResult.count ?? 0;
    }

  } catch (error) {
    console.error(
      "Erreur dashboard :",
      error
    );
  }
}


/* =========================================================
   SERIES — LOAD
========================================================= */

async function loadSeries() {
  if (!seriesList) {
    return;
  }

  seriesList.innerHTML =
    "<p>Chargement...</p>";

  try {
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
        genre,
        description,
        cover_url,
        status,
        created_at
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    const series = data || [];

    if (seriesCount) {
      seriesCount.textContent =
        series.length;
    }

    if (!series.length) {
      seriesList.innerHTML =
        "<p>Aucune œuvre.</p>";
      return;
    }

    seriesList.innerHTML =
      series
        .map((item) => {
          return `
            <div
              class="admin-item"
              data-series-id="${escapeAttribute(item.id)}"
            >
              <div class="item-main">

                <div class="item-cover">
                  ${
                    item.cover_url
                      ? `
                        <img
                          src="${escapeAttribute(
                            item.cover_url
                          )}"
                          alt="${escapeAttribute(
                            item.title
                          )}"
                        >
                      `
                      : ""
                  }
                </div>

                <div class="item-info">

                  <h3>
                    ${escapeHTML(
                      item.title
                    )}
                  </h3>

                  <p>
                    ${escapeHTML(
                      item.type || ""
                    )}
                  </p>

                  <small>
                    ${escapeHTML(
                      item.status || ""
                    )}
                  </small>

                </div>

              </div>

              <div class="item-actions">

                <button
                  type="button"
                  class="btn-view-series"
                  data-id="${escapeAttribute(
                    item.id
                  )}"
                >
                  Chapitres
                </button>

                <button
                  type="button"
                  class="btn-delete-series"
                  data-id="${escapeAttribute(
                    item.id
                  )}"
                >
                  Supprimer
                </button>

              </div>
            </div>
          `;
        })
        .join("");

  } catch (error) {
    console.error(
      "Erreur chargement séries :",
      error
    );

    seriesList.innerHTML =
      `<p>Erreur : ${escapeHTML(
        error.message
      )}</p>`;
  }
}


/* =========================================================
   SERIES — OPEN CHAPTERS
========================================================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".btn-view-series"
      );

    if (!button) {
      return;
    }

    const seriesId =
      button.dataset.id;

    if (!seriesId) {
      return;
    }

    selectedSeries = seriesId;

    await loadChapters();

    const chaptersSection =
      $("chaptersSection");

    if (chaptersSection) {
      document
        .querySelectorAll(
          ".admin-section"
        )
        .forEach((section) => {
          section.classList.remove(
            "active"
          );
        });

      chaptersSection.classList.add(
        "active"
      );
    }
  }
);


/* =========================================================
   SERIES — DELETE
========================================================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".btn-delete-series"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset.id;

    if (!id) {
      return;
    }

    const confirmed =
      confirm(
        "Voulez-vous vraiment supprimer cette œuvre ?\n\nLes chapitres associés peuvent également être concernés."
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        data: deletedRows,
        error
      } = await supabase
        .from("series")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) {
        throw error;
      }

      if (
        !deletedRows ||
        deletedRows.length === 0
      ) {
        alert(
          "❌ L'œuvre n'a pas été supprimée.\n\n" +
          "Aucune ligne n'a été supprimée. " +
          "Vérifie les permissions RLS et ton rôle admin."
        );

        return;
      }

      alert(
        "✅ Œuvre supprimée avec succès."
      );

      if (selectedSeries === id) {
        selectedSeries = null;
      }

      await loadSeries();
      await loadChapters();
      await loadDashboard();

    } catch (error) {
      console.error(
        "Erreur suppression série :",
        error
      );

      alert(
        "Erreur : " +
        (error.message ||
          "Impossible de supprimer l'œuvre.")
      );
    }
  }
);


/* =========================================================
   SERIES — NEW SERIES
========================================================= */

if (newSeriesBtn) {
  newSeriesBtn.addEventListener(
    "click",
    () => {
      if (!newSeriesSection) {
        return;
      }

      newSeriesSection.style.display =
        "";

      newSeriesSection.scrollIntoView({
        behavior: "smooth"
      });
    }
  );
}


/* =========================================================
   SERIES — CREATE
========================================================= */

if (seriesForm) {
  seriesForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (seriesStatusMsg) {
        seriesStatusMsg.textContent =
          "Création en cours...";
      }

      try {
        const formData =
          new FormData(
            seriesForm
          );

        const title =
          formData.get("title")?.trim();

        const type =
          formData.get("type")?.trim();

        const genre =
          formData.get("genre")?.trim();

        const description =
          formData
            .get("description")
            ?.trim();

        const status =
          formData
            .get("status")
            ?.trim() ||
          "ongoing";

        const coverFile =
          formData.get("cover");

        if (!title) {
          throw new Error(
            "Le titre est obligatoire."
          );
        }

        let coverUrl = "";

        /* -----------------------------------------
           UPLOAD COVER
        ----------------------------------------- */

        if (
          coverFile &&
          coverFile instanceof File &&
          coverFile.size > 0
        ) {
          const extension =
            coverFile.name
              .split(".")
              .pop();

          const fileName =
            `${crypto.randomUUID()}.${extension}`;

          const filePath =
            fileName;

          const {
            error:
              uploadError
          } =
            await supabase.storage
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
            data:
              publicUrlData
          } =
            supabase.storage
              .from("Cover series")
              .getPublicUrl(
                filePath
              );

          coverUrl =
            publicUrlData.publicUrl;
        }

        /* -----------------------------------------
           INSERT SERIES
        ----------------------------------------- */

        const {
          data:
            insertedRows,
          error
        } =
          await supabase
            .from("series")
            .insert({
              title,
              slug: createSlug(
                title
              ),
              type:
                type || null,
              genre:
                genre || null,
              description:
                description || null,
              cover_url:
                coverUrl || null,
              status
            })
            .select("id");

        if (error) {
          throw error;
        }

        if (
          !insertedRows ||
          insertedRows.length === 0
        ) {
          throw new Error(
            "La série n'a pas été créée."
          );
        }

        if (seriesStatusMsg) {
          seriesStatusMsg.textContent =
            "✅ Œuvre créée avec succès.";
        }

        seriesForm.reset();

        await loadSeries();
        await loadDashboard();

      } catch (error) {
        console.error(
          "Erreur création série :",
          error
        );

        if (seriesStatusMsg) {
          seriesStatusMsg.textContent =
            "❌ " +
            (
              error.message ||
              "Erreur lors de la création."
            );
        }
      }
    }
  );
}


/* =========================================================
   CHAPTERS — LOAD
========================================================= */

async function loadChapters() {
  if (!chaptersList) {
    return;
  }

  chaptersList.innerHTML =
    "<p>Chargement...</p>";

  try {
    let query =
      supabase
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
          views,
          series (
            id,
            title
          )
        `)
        .order(
          "chapter_number",
          {
            ascending: false
          }
        );

    if (selectedSeries) {
      query =
        query.eq(
          "series_id",
          selectedSeries
        );
    }

    const {
      data,
      error
    } = await query;

    if (error) {
      throw error;
    }

    const chapters =
      data || [];

    if (chaptersCount) {
      chaptersCount.textContent =
        chapters.length;
    }

    if (!chapters.length) {
      chaptersList.innerHTML =
        "<p>Aucun chapitre.</p>";

      return;
    }

    chaptersList.innerHTML =
      chapters
        .map((chapter) => {
          const seriesTitle =
            chapter.series?.title ||
            "Œuvre inconnue";

          const displayLabel =
            formatChapterLabel(
              chapter.chapter_label ??
                chapter.chapter_number
            );

          return `
            <div
              class="admin-item chapter-item"
              data-chapter-id="${escapeAttribute(
                chapter.id
              )}"
            >

              <div class="item-main">

                <div class="item-cover">

                  ${
                    chapter.chapter_image_url
                      ? `
                        <img
                          src="${escapeAttribute(
                            chapter.chapter_image_url
                          )}"
                          alt="${escapeAttribute(
                            chapter.title ||
                              displayLabel
                          )}"
                        >
                      `
                      : ""
                  }

                </div>

                <div class="item-info">

                  <h3>
                    ${escapeHTML(
                      seriesTitle
                    )}
                  </h3>

                  <strong>
                    ${escapeHTML(
                      displayLabel
                    )}
                  </strong>

                  ${
                    chapter.title
                      ? `
                        <p>
                          ${escapeHTML(
                            chapter.title
                          )}
                        </p>
                      `
                      : ""
                  }

                  <small>
                    Vues :
                    ${
                      Number(
                        chapter.views
                      ) || 0
                    }
                  </small>

                </div>

              </div>

              <div class="item-actions">

                <button
                  type="button"
                  class="btn-edit-chapter"
                  data-id="${escapeAttribute(
                    chapter.id
                  )}"
                >
                  Modifier
                </button>

                <button
                  type="button"
                  class="btn-delete-chapter"
                  data-id="${escapeAttribute(
                    chapter.id
                  )}"
                >
                  Supprimer
                </button>

              </div>

            </div>
          `;
        })
        .join("");

  } catch (error) {
    console.error(
      "Erreur chargement chapitres :",
      error
    );

    chaptersList.innerHTML =
      `<p>Erreur : ${escapeHTML(
        error.message
      )}</p>`;
  }
}


/* =========================================================
   CHAPTERS — NEW
========================================================= */

if (newChapterBtn) {
  newChapterBtn.addEventListener(
    "click",
    () => {
      editingChapterId = null;
      editingChapterImageUrl = null;

      if (chapterForm) {
        chapterForm.reset();
      }

      if (chapterSubmitBtn) {
        chapterSubmitBtn.textContent =
          "Publier le chapitre";
      }

      if (chapterStatusMsg) {
        chapterStatusMsg.textContent =
          "";
      }

      if (newChapterSection) {
        newChapterSection.style.display =
          "";

        newChapterSection.scrollIntoView({
          behavior: "smooth"
        });
      }
    }
  );
}


/* =========================================================
   CHAPTERS — EDIT CLICK
========================================================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".btn-edit-chapter"
      );

    if (!button) {
      return;
    }

    const chapterId =
      button.dataset.id;

    if (!chapterId) {
      return;
    }

    try {
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
        .eq(
          "id",
          chapterId
        )
        .single();

      if (error) {
        throw error;
      }

      if (!chapter) {
        throw new Error(
          "Chapitre introuvable."
        );
      }

      editingChapterId =
        chapter.id;

      editingChapterImageUrl =
        chapter.chapter_image_url ||
        null;

      selectedSeries =
        chapter.series_id;

      /* -----------------------------------------
         REMPLISSAGE FORMULAIRE
      ----------------------------------------- */

      if (chapterNumber) {
        chapterNumber.value =
          chapter.chapter_number ??
          "";
      }

      if (chapterLabel) {
        chapterLabel.value =
          chapter.chapter_label ??
          "";
      }

      if (chapterTitle) {
        chapterTitle.value =
          chapter.title ??
          "";
      }

      if (chapterContent) {
        chapterContent.value =
          chapter.content ??
          "";
      }

      if (chapterSound) {
        chapterSound.value =
          chapter.sound_url ??
          "";
      }

      if (chapterSubmitBtn) {
        chapterSubmitBtn.textContent =
          "Enregistrer les modifications";
      }

      if (chapterStatusMsg) {
        chapterStatusMsg.textContent =
          "Mode modification.";
      }

      if (newChapterSection) {
        newChapterSection.style.display =
          "";

        newChapterSection.scrollIntoView({
          behavior: "smooth"
        });
      }

    } catch (error) {
      console.error(
        "Erreur chargement chapitre :",
        error
      );

      alert(
        "Erreur : " +
        (
          error.message ||
          "Impossible de charger le chapitre."
        )
      );
    }
  }
);


/* =========================================================
   CHAPTERS — CREATE / UPDATE
========================================================= */

if (chapterForm) {
  chapterForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (chapterStatusMsg) {
        chapterStatusMsg.textContent =
          "Traitement en cours...";
      }

      try {
        const numberValue =
          Number(
            chapterNumber?.value
          );

        const label =
          chapterLabel?.value.trim();

        const title =
          chapterTitle?.value.trim();

        const content =
          chapterContent?.value.trim();

        const soundUrl =
          chapterSound?.value.trim();

        if (
          !Number.isFinite(
            numberValue
          ) ||
          numberValue < 1
        ) {
          throw new Error(
            "Le numéro interne du chapitre est invalide."
          );
        }

        if (!label) {
          throw new Error(
            "Le label du chapitre est obligatoire."
          );
        }

        if (!content) {
          throw new Error(
            "Le contenu du chapitre est obligatoire."
          );
        }

        if (!selectedSeries) {
          throw new Error(
            "Aucune œuvre n'est sélectionnée."
          );
        }


        /* =================================================
           MODE MODIFICATION
        ================================================= */

        if (editingChapterId) {

          let chapterImageUrl =
            editingChapterImageUrl;


          /* -----------------------------------------------
             NOUVELLE IMAGE ÉVENTUELLE
          ----------------------------------------------- */

          const imageFile =
            chapterImage?.files?.[0];

          if (
            imageFile &&
            imageFile instanceof File &&
            imageFile.size > 0
          ) {
            const extension =
              imageFile.name
                .split(".")
                .pop();

            const fileName =
              `${crypto.randomUUID()}.${extension}`;

            const {
              error:
                uploadError
            } =
              await supabase.storage
                .from("chapter-images")
                .upload(
                  fileName,
                  imageFile,
                  {
                    upsert: false
                  }
                );

            if (uploadError) {
              throw uploadError;
            }

            const {
              data:
                publicUrlData
            } =
              supabase.storage
                .from("chapter-images")
                .getPublicUrl(
                  fileName
                );

            chapterImageUrl =
              publicUrlData.publicUrl;
          }


          /* -----------------------------------------------
             UPDATE
          ----------------------------------------------- */

          const {
            data:
              updatedRows,
            error:
              updateError
          } =
            await supabase
              .from("chapters")
              .update({
                chapter_number:
                  numberValue,

                chapter_label:
                  label,

                title:
                  title || null,

                content:
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


          /* -----------------------------------------------
             IMPORTANT :
             RLS peut parfois retourner 0 ligne
             sans erreur.
          ----------------------------------------------- */

          if (
            !updatedRows ||
            updatedRows.length === 0
          ) {
            throw new Error(
              "Aucune ligne n'a été modifiée. Vérifie les permissions RLS et le rôle admin."
            );
          }


          /* -----------------------------------------------
             SUCCÈS
          ----------------------------------------------- */

          if (chapterStatusMsg) {
            chapterStatusMsg.textContent =
              "✅ Chapitre modifié avec succès.";
          }

          alert(
            "✅ Chapitre modifié avec succès."
          );

          editingChapterId =
            null;

          editingChapterImageUrl =
            null;

          if (chapterSubmitBtn) {
            chapterSubmitBtn.textContent =
              "Publier le chapitre";
          }

          chapterForm.reset();

          await loadChapters();
          await loadDashboard();

          return;
        }


        /* =================================================
           MODE CRÉATION
        ================================================= */

        const imageFile =
          chapterImage?.files?.[0];

        if (
          !imageFile ||
          !(imageFile instanceof File) ||
          imageFile.size === 0
        ) {
          throw new Error(
            "L'image du chapitre est obligatoire."
          );
        }


        /* -----------------------------------------------
           UPLOAD IMAGE
        ----------------------------------------------- */

        const extension =
          imageFile.name
            .split(".")
            .pop();

        const fileName =
          `${crypto.randomUUID()}.${extension}`;

        const {
          error:
            uploadError
        } =
          await supabase.storage
            .from("chapter-images")
            .upload(
              fileName,
              imageFile,
              {
                upsert: false
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data:
            publicUrlData
        } =
          supabase.storage
            .from("chapter-images")
            .getPublicUrl(
              fileName
            );

        const chapterImageUrl =
          publicUrlData.publicUrl;


        /* -----------------------------------------------
           INSERT CHAPTER
        ----------------------------------------------- */

        const {
          data:
            insertedRows,
          error
        } =
          await supabase
            .from("chapters")
            .insert({
              series_id:
                selectedSeries,

              chapter_number:
                numberValue,

              chapter_label:
                label,

              title:
                title || null,

              content:
                content,

              chapter_image_url:
                chapterImageUrl,

              sound_url:
                soundUrl || null,

              published_at:
                new Date().toISOString(),

              views:
                0
            })
            .select("id");


        if (error) {
          throw error;
        }


        if (
          !insertedRows ||
          insertedRows.length === 0
        ) {
          throw new Error(
            "Le chapitre n'a pas été créé."
          );
        }


        /* -----------------------------------------------
           SUCCÈS
        ----------------------------------------------- */

        if (chapterStatusMsg) {
          chapterStatusMsg.textContent =
            "✅ Chapitre publié avec succès.";
        }

        alert(
          "✅ Chapitre publié avec succès."
        );

        chapterForm.reset();

        await loadChapters();
        await loadDashboard();

      } catch (error) {
        console.error(
          "Erreur chapitre :",
          error
        );

        if (chapterStatusMsg) {
          chapterStatusMsg.textContent =
            "❌ " +
            (
              error.message ||
              "Une erreur est survenue."
            );
        }

        alert(
          "❌ Erreur :\n\n" +
          (
            error.message ||
            "Une erreur est survenue."
          )
        );
      }
    }
  );
}


/* =========================================================
   CHAPTERS — DELETE
========================================================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".btn-delete-chapter"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset.id;

    if (!id) {
      return;
    }

    const confirmed =
      confirm(
        "Voulez-vous vraiment supprimer ce chapitre ?\n\nCette action est irréversible."
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        data:
          deletedRows,
        error
      } =
        await supabase
          .from("chapters")
          .delete()
          .eq("id", id)
          .select("id");


      if (error) {
        console.error(error);

        alert(
          "Erreur : " +
          error.message
        );

        return;
      }


      /* -----------------------------------------------
         IMPORTANT :
         Vérifie que Supabase a réellement supprimé
         une ligne.
      ----------------------------------------------- */

      if (
        !deletedRows ||
        deletedRows.length === 0
      ) {
        alert(
          "❌ Le chapitre n'a pas été supprimé.\n\n" +
          "Aucune ligne n'a été supprimée.\n\n" +
          "Cela indique probablement un problème de permission RLS ou de rôle admin."
        );

        return;
      }


      /* -----------------------------------------------
         SUCCÈS
      ----------------------------------------------- */

      alert(
        "✅ Chapitre supprimé avec succès."
      );

      await loadChapters();
      await loadDashboard();

    } catch (error) {
      console.error(
        "Erreur suppression chapitre :",
        error
      );

      alert(
        "Erreur : " +
        (
          error.message ||
          "Impossible de supprimer le chapitre."
        )
      );
    }
  }
);


/* =========================================================
   SOUNDS — LOAD
========================================================= */

async function loadSounds() {
  if (!soundsList) {
    return;
  }

  soundsList.innerHTML =
    "<p>Chargement...</p>";

  try {
    const {
      data,
      error
    } =
      await supabase.storage
        .from("sounds")
        .list("", {
          limit: 100,
          sortBy: {
            column: "name",
            order: "asc"
          }
        });

    if (error) {
      throw error;
    }

    const sounds =
      data || [];

    if (!sounds.length) {
      soundsList.innerHTML =
        "<p>Aucun son.</p>";

      return;
    }

    soundsList.innerHTML =
      sounds
        .map((sound) => {
          return `
            <div
              class="admin-item"
            >

              <div class="item-main">

                <div class="item-info">

                  <h3>
                    ${escapeHTML(
                      sound.name
                    )}
                  </h3>

                </div>

              </div>

              <div class="item-actions">

                <button
                  type="button"
                  class="btn-delete-sound"
                  data-name="${escapeAttribute(
                    sound.name
                  )}"
                >
                  Supprimer
                </button>

              </div>

            </div>
          `;
        })
        .join("");

  } catch (error) {
    console.error(
      "Erreur chargement sons :",
      error
    );

    soundsList.innerHTML =
      `<p>Erreur : ${escapeHTML(
        error.message
      )}</p>`;
  }
}


/* =========================================================
   SOUNDS — OPTIONS CHAPTER
========================================================= */

async function loadSoundOptions() {
  if (!chapterSound) {
    return;
  }

  try {
    const {
      data,
      error
    } =
      await supabase.storage
        .from("sounds")
        .list("", {
          limit: 100
        });

    if (error) {
      throw error;
    }

    const sounds =
      data || [];

    chapterSound.innerHTML =
      `
        <option value="">
          Aucun son
        </option>
      `;

    sounds.forEach((sound) => {
      if (!sound.name) {
        return;
      }

      const {
        data:
          publicUrlData
      } =
        supabase.storage
          .from("sounds")
          .getPublicUrl(
            sound.name
          );

      const option =
        document.createElement(
          "option"
        );

      option.value =
        publicUrlData.publicUrl;

      option.textContent =
        sound.name;

      chapterSound.appendChild(
        option
      );
    });

  } catch (error) {
    console.error(
      "Erreur options sons :",
      error
    );
  }
}


/* =========================================================
   SOUNDS — ADD
========================================================= */

if (soundForm) {
  soundForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (soundStatusMsg) {
        soundStatusMsg.textContent =
          "Upload en cours...";
      }

      try {
        const file =
          soundFile?.files?.[0];

        if (
          !file ||
          !(file instanceof File) ||
          file.size === 0
        ) {
          throw new Error(
            "Sélectionne un fichier audio."
          );
        }

        let finalName =
          soundName?.value.trim();

        if (!finalName) {
          finalName =
            file.name;
        }

        const extension =
          file.name
            .split(".")
            .pop();

        if (
          !finalName
            .toLowerCase()
            .endsWith(
              `.${extension.toLowerCase()}`
            )
        ) {
          finalName +=
            `.${extension}`;
        }

        const {
          error
        } =
          await supabase.storage
            .from("sounds")
            .upload(
              finalName,
              file,
              {
                upsert: false
              }
            );

        if (error) {
          throw error;
        }

        if (soundStatusMsg) {
          soundStatusMsg.textContent =
            "✅ Son ajouté avec succès.";
        }

        soundForm.reset();

        await loadSounds();
        await loadSoundOptions();

      } catch (error) {
        console.error(
          "Erreur ajout son :",
          error
        );

        if (soundStatusMsg) {
          soundStatusMsg.textContent =
            "❌ " +
            (
              error.message ||
              "Erreur lors de l'ajout."
            );
        }
      }
    }
  );
}


/* =========================================================
   SOUNDS — DELETE
========================================================= */

document.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        ".btn-delete-sound"
      );

    if (!button) {
      return;
    }

    const name =
      button.dataset.name;

    if (!name) {
      return;
    }

    const confirmed =
      confirm(
        `Supprimer le son "${name}" ?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error
      } =
        await supabase.storage
          .from("sounds")
          .remove([
            name
          ]);

      if (error) {
        throw error;
      }

      alert(
        "✅ Son supprimé."
      );

      await loadSounds();
      await loadSoundOptions();

    } catch (error) {
      console.error(
        "Erreur suppression son :",
        error
      );

      alert(
        "Erreur : " +
        (
          error.message ||
          "Impossible de supprimer le son."
        )
      );
    }
  }
);


/* =========================================================
   START
========================================================= */

checkSession();        error
      );

      alert(
        "Erreur : " +
        (
          error.message ||
          "Impossible de supprimer le son."
        )
      );
    }
  }
);


/* =========================================================
   START
========================================================= */

checkSession();
