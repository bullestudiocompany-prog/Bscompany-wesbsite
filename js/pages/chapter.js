/* =========================================================
   LIKES ANONYMES
========================================================= */

async function setupLikeButton(chapter) {
  if (
    !likeButton ||
    !likeCount ||
    !likeIcon ||
    !chapter?.id
  ) {
    return;
  }

  const visitorId =
    getVisitorId();

  /*
   * État actuel du like de ce visiteur.
   */
  let isLiked = false;

  /*
   * Nombre actuellement affiché.
   *
   * On récupère d'abord ce qui est déjà présent
   * dans le HTML pour éviter de remplacer inutilement
   * une valeur correcte par 0.
   */
  let displayedCount =
    Number.parseInt(
      likeCount.textContent,
      10
    );

  if (
    !Number.isFinite(displayedCount) ||
    displayedCount < 0
  ) {
    displayedCount = 0;
  }


  /* =======================================================
     ÉTAT DU LIKE DU VISITEUR
  ======================================================= */

  async function loadInitialLikeState() {
    const { data, error } =
      await supabase
        .from("likes")
        .select("id")
        .eq(
          "chapter_id",
          chapter.id
        )
        .eq(
          "visitor_id",
          visitorId
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "Erreur vérification like initial :",
        error
      );

      return false;
    }

    return Boolean(data);
  }


  /* =======================================================
     COMPTEUR DES LIKES
  ======================================================= */

  async function loadLikeCount() {

    /*
     * On récupère les lignes de likes elles-mêmes
     * au lieu d'utiliser head:true.
     *
     * Cela permet de compter directement les likes
     * réellement accessibles depuis Supabase.
     */
    const { data, count, error } =
      await supabase
        .from("likes")
        .select(
          "id",
          {
            count: "exact"
          }
        )
        .eq(
          "chapter_id",
          chapter.id
        );

    if (error) {
      console.error(
        "Erreur comptage likes :",
        error
      );

      /*
       * Très important :
       * on ne remet surtout pas le compteur à 0.
       */
      return null;
    }

    let realCount = null;

    /*
     * Supabase peut fournir directement le count.
     */
    if (
      typeof count === "number" &&
      count >= 0
    ) {
      realCount = count;
    }

    /*
     * Si count n'est pas disponible,
     * on compte les lignes reçues.
     */
    else if (
      Array.isArray(data)
    ) {
      realCount =
        data.length;
    }

    /*
     * Si on a obtenu un vrai compteur,
     * on l'affiche.
     */
    if (
      typeof realCount === "number" &&
      realCount >= 0
    ) {
      displayedCount =
        realCount;

      likeCount.textContent =
        String(displayedCount);

      return displayedCount;
    }

    /*
     * Aucun compteur exploitable :
     * on conserve l'ancien nombre.
     */
    return null;
  }


  /* =======================================================
     INITIALISATION
  ======================================================= */

  try {

    /*
     * Vérifie si le visiteur a déjà aimé ce chapitre.
     */
    isLiked =
      await loadInitialLikeState();

    updateLikeButton(
      isLiked
    );


    /*
     * Charge le nombre TOTAL de likes existants.
     *
     * Exemple :
     * 7 likes en base → bouton = 7
     */
    await loadLikeCount();


    /* =====================================================
       CLIC SUR LE BOUTON
    ===================================================== */

    likeButton.onclick =
      async () => {

        if (
          likeButton.disabled
        ) {
          return;
        }

        likeButton.disabled =
          true;


        /*
         * Nouvel état souhaité.
         */
        const nextState =
          !isLiked;


        /*
         * Sauvegarde de l'ancien état
         * au cas où Supabase refuse l'opération.
         */
        const previousState =
          isLiked;

        const previousCount =
          displayedCount;


        /*
         * Mise à jour immédiate de l'interface.
         *
         * Exemple :
         * 5 → 6
         *
         * ou :
         * 6 → 5
         */
        if (nextState) {

          displayedCount += 1;

        } else {

          displayedCount =
            Math.max(
              0,
              displayedCount - 1
            );
        }

        isLiked =
          nextState;

        likeCount.textContent =
          String(displayedCount);

        updateLikeButton(
          isLiked
        );


        try {

          /* =================================================
             AJOUT DU LIKE
          ================================================= */

          if (nextState) {

            const { error } =
              await supabase
                .from("likes")
                .insert({
                  visitor_id:
                    visitorId,

                  chapter_id:
                    chapter.id,

                  series_id:
                    chapter.series_id
                });

            if (error) {
              throw error;
            }

          }

          /* =================================================
             RETRAIT DU LIKE
          ================================================= */

          else {

            const { error } =
              await supabase
                .from("likes")
                .delete()
                .eq(
                  "chapter_id",
                  chapter.id
                )
                .eq(
                  "visitor_id",
                  visitorId
                );

            if (error) {
              throw error;
            }
          }


          /*
           * L'ajout ou la suppression a réussi.
           *
           * On essaie de resynchroniser avec Supabase.
           *
           * Si cette lecture échoue, on CONSERVE quand même
           * le compteur local qui vient d'être correctement
           * modifié.
           */
          const refreshedCount =
            await loadLikeCount();

          if (
            refreshedCount === null
          ) {
            displayedCount =
              nextState
                ? previousCount + 1
                : Math.max(
                    0,
                    previousCount - 1
                  );

            likeCount.textContent =
              String(displayedCount);
          }

        } catch (error) {

          console.error(
            "Erreur like :",
            error
          );


          /*
           * L'opération Supabase elle-même a échoué.
           *
           * On revient donc à l'état précédent.
           */
          isLiked =
            previousState;

          displayedCount =
            previousCount;

          likeCount.textContent =
            String(displayedCount);

          updateLikeButton(
            isLiked
          );

          alert(
            "Impossible de modifier le like pour le moment."
          );

        } finally {

          likeButton.disabled =
            false;
        }
      };

  } catch (error) {

    console.error(
      "Erreur initialisation like :",
      error
    );
  }
}


function updateLikeButton(isLiked) {
  if (
    !likeButton ||
    !likeIcon
  ) {
    return;
  }

  likeButton.classList.toggle(
    "liked",
    isLiked
  );

  likeButton.setAttribute(
    "aria-pressed",
    String(isLiked)
  );

  likeButton.setAttribute(
    "aria-label",
    isLiked
      ? "Retirer le like"
      : "Aimer ce chapitre"
  );

  const outline =
    likeIcon.querySelector(
      ".heart-outline"
    );

  const filled =
    likeIcon.querySelector(
      ".heart-filled"
    );

  if (outline) {
    outline.hidden =
      isLiked;
  }

  if (filled) {
    filled.hidden =
      !isLiked;
  }
}
