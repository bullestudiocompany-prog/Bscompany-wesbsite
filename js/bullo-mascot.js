/* Bullo : mascotte interactive de BSCompany */
(() => {
    if (document.getElementById("bullo-mascot")) return;

    const bullo = document.createElement("img");

    bullo.id = "bullo-mascot";
    bullo.src = "img/bullo-peek.png";
    bullo.alt = "Bullo, la mascotte de BSCompany";
    bullo.title = "Clique pour faire réagir Bullo";

    bullo.setAttribute("role", "button");
    bullo.setAttribute("tabindex", "0");
    bullo.setAttribute("aria-label", "Faire réagir Bullo");
    bullo.setAttribute("aria-pressed", "false");

    document.body.appendChild(bullo);

    let cache = false;
    let minuterie;

    function reagir() {
        cache = !cache;

        bullo.classList.toggle("is-hidden", cache);
        bullo.classList.toggle("is-peeking", !cache);

        bullo.setAttribute("aria-pressed", String(cache));

        bullo.title = cache
            ? "Bullo se cache..."
            : "Bullo est de retour !";

        clearTimeout(minuterie);

        if (!cache) {
            minuterie = setTimeout(() => {
                bullo.classList.remove("is-peeking");
            }, 1800);
        }
    }

    bullo.addEventListener("click", reagir);

    bullo.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            reagir();
        }
    });

    // Bullo se montre au chargement, puis se fait discret.
    requestAnimationFrame(() => {
        bullo.classList.add("is-peeking");

        minuterie = setTimeout(() => {
            bullo.classList.remove("is-peeking");
        }, 2200);
    });
})();
