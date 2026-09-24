const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.querySelector("[data-year]");
const portfolioRail = document.querySelector(".portfolio-grid");
const portfolioButtons = document.querySelectorAll("[data-portfolio-direction]");
const copyPayidButton = document.querySelector("[data-copy-payid]");
const copyPayidStatus = document.querySelector("[data-copy-payid-status]");

if (year) {
  year.textContent = new Date().getFullYear();
}

const closeNavigation = ({ returnFocus = false } = {}) => {
  body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
  if (returnFocus) navToggle?.focus();
};

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => closeNavigation());
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && body.classList.contains("nav-open")) {
    closeNavigation({ returnFocus: true });
  }
});

document.addEventListener("click", (event) => {
  if (!body.classList.contains("nav-open") || siteNav?.contains(event.target) || navToggle?.contains(event.target)) return;
  closeNavigation();
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

if (copyPayidButton) {
  copyPayidButton.addEventListener("click", async () => {
    const payid = copyPayidButton.dataset.copyPayid;
    let copied = false;

    try {
      await navigator.clipboard.writeText(payid);
      copied = true;
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = payid;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      copied = document.execCommand("copy");
      fallback.remove();
    }

    if (copyPayidStatus) {
      copyPayidStatus.textContent = copied
        ? "PayID copied — paste it into your banking app."
        : "Copy unavailable. Select the ABN above to copy it manually.";
    }

    if (copied) {
      copyPayidButton.textContent = "PayID copied";
      window.setTimeout(() => {
        copyPayidButton.textContent = "Copy ABN PayID";
      }, 2400);
    }
  });
}
