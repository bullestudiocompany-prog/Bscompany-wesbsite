(() => {
  const host = document.getElementById("bullo-mascot");

  if (!host) {
    console.error("Le conteneur de Bullo est introuvable.");
    return;
  }

  const SVG_URL = "img/bullo.svg";

  const clamp = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
  };

  let showTimer = null;
  let hesitationTimer = null;
  let autoShowTimer = null;
  let isHidden = false;

  // Charger le dessin SVG de Bullo.
  fetch(SVG_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Impossible de charger " + SVG_URL);
      }

      return response.text();
    })
    .then((source) => {
      const parser = new DOMParser();

      const parsed = parser.parseFromString(
        source,
        "image/svg+xml"
      );

      if (parsed.querySelector("parsererror")) {
        throw new Error("Le fichier SVG est invalide.");
      }

      const svg = document.importNode(
        parsed.documentElement,
        true
      );

      host.replaceChildren(svg);

      const leftPupil = svg.querySelector(
        "#bullo-pupil-left"
      );

      const rightPupil = svg.querySelector(
        "#bullo-pupil-right"
      );

      const body = svg.querySelector("#bullo-body");

      if (!leftPupil || !rightPupil || !body) {
        throw new Error(
          "Les éléments animables de Bullo sont introuvables."
        );
      }

      // Déplacer les pupilles sans les faire sortir des yeux.
      function movePupils(x, y) {
        const pupilX = clamp(x, -3.2, 3.2);
        const pupilY = clamp(y, -2.4, 2.4);

        leftPupil.setAttribute(
          "transform",
          `translate(${pupilX} ${pupilY})`
        );

        rightPupil.setAttribute(
          "transform",
          `translate(${pupilX} ${pupilY})`
        );
      }

      // Annuler les temporisateurs en cours.
      function clearTimers() {
        clearTimeout(showTimer);
        clearTimeout(hesitationTimer);
        clearTimeout(autoShowTimer);
      }

      // Faire réapparaître Bullo.
      function showBullo() {
        clearTimers();

        host.classList.remove(
          "is-hiding",
          "is-hesitating"
        );

        host.classList.add("is-visible");

        isHidden = false;
      }

      // Cacher Bullo temporairement.
      function hideBullo() {
        clearTimers();

        host.classList.remove(
          "is-visible",
          "is-hesitating"
        );

        host.classList.add("is-hiding");

        isHidden = true;

        // Sécurité : Bullo revient même si le curseur
        // reste immobile près de sa position.
        autoShowTimer = setTimeout(() => {
          showBullo();
        }, 2500);
      }

      // Calculer la position de référence de Bullo.
      function getBulloPosition() {
        const rect = host.getBoundingClientRect();

        const width = host.offsetWidth || rect.width;
        const height = host.offsetHeight || rect.height;

        const right = window.innerWidth <= 600 ? 10 : 14;
        const bottom = window.innerWidth <= 600 ? 12 : 14;

        return {
          x: window.innerWidth - right - width / 2,
          y: window.innerHeight - bottom - height / 2,
          width: width
        };
      }

      // Suivre le curseur avec les yeux et gérer la disparition.
      document.addEventListener(
        "pointermove",
        (event) => {
          // Sur téléphone, le toucher est géré séparément.
          if (event.pointerType === "touch") {
            return;
          }

          const position = getBulloPosition();

          const dx = event.clientX - position.x;
          const dy = event.clientY - position.y;

          const distance = Math.hypot(dx, dy);

          // Le regard suit le curseur.
          const directionX = distance > 0 ? dx / distance : 0;
          const directionY = distance > 0 ? dy / distance : 0;

          movePupils(
            directionX * Math.min(3.2, Math.abs(dx) / 22),
            directionY * Math.min(2.4, Math.abs(dy) / 24)
          );

          const hideDistance = Math.max(
            position.width * 1.15,
            100
          );

          // Le curseur approche : Bullo se cache.
          if (distance < hideDistance) {
            clearTimeout(showTimer);
            clearTimeout(hesitationTimer);

            if (!isHidden) {
              hideBullo();
            }

            return;
          }

          // Le curseur s'éloigne : Bullo revient.
          if (isHidden) {
            clearTimeout(showTimer);

            showTimer = setTimeout(() => {
              clearTimeout(autoShowTimer);

              host.classList.remove("is-hiding");

              host.classList.add("is-hesitating");

              hesitationTimer = setTimeout(() => {
                showBullo();
              }, 500);
            }, 400);
          }
        },
        { passive: true }
      );

      // Réaction au toucher sur mobile.
      host.addEventListener(
        "pointerdown",
        (event) => {
          if (event.pointerType === "mouse") {
            return;
          }

          clearTimers();

          showBullo();

          host.classList.add("is-tapped");

          movePupils(0, 0);

          setTimeout(() => {
            host.classList.remove("is-tapped");
          }, 500);
        },
        { passive: true }
      );

      // Permettre de masquer ou de montrer Bullo au clavier.
      host.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          if (isHidden) {
            showBullo();
          } else {
            hideBullo();
          }
        }
      });

      // Afficher Bullo au démarrage.
      showBullo();
    })
    .catch((error) => {
      console.error("Erreur de chargement de Bullo :", error);
      host.hidden = false;
      host.textContent = "";
    });
})();
