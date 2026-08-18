const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.querySelector("[data-year]");
const portfolioRail = document.querySelector(".portfolio-grid");
const portfolioButtons = document.querySelectorAll("[data-portfolio-direction]");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

if (portfolioRail && portfolioButtons.length) {
  const updatePortfolioControls = () => {
    const maximumScroll = portfolioRail.scrollWidth - portfolioRail.clientWidth;

    portfolioButtons.forEach((button) => {
      const direction = Number(button.dataset.portfolioDirection);
      button.disabled = direction < 0
        ? portfolioRail.scrollLeft <= 1
        : portfolioRail.scrollLeft >= maximumScroll - 1;
    });
  };

  portfolioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const firstCard = portfolioRail.querySelector(".product-card");
      const cardWidth = firstCard?.getBoundingClientRect().width ?? portfolioRail.clientWidth;
      const gap = Number.parseFloat(getComputedStyle(portfolioRail).columnGap) || 16;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      portfolioRail.scrollBy({
        left: Number(button.dataset.portfolioDirection) * (cardWidth + gap),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  });

  portfolioRail.addEventListener("scroll", updatePortfolioControls, { passive: true });
  window.addEventListener("resize", updatePortfolioControls);
  updatePortfolioControls();
}
