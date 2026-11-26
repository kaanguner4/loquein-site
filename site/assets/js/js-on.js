// Runs before first paint on the home pages: marks that JS runs, so the reveal and tab styles may hide content
// that the home script will show. Without JS nothing is hidden (no-JS spec).
document.documentElement.classList.add("js");
