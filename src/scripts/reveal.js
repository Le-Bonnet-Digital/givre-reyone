function initReveal() {
  const reveals = document.querySelectorAll(".reveal");

  if (!reveals.length) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!("IntersectionObserver" in window) || reduceMotion) {
    reveals.forEach((element) => element.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -60px 0px"
    }
  );

  reveals.forEach((element) => observer.observe(element));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReveal, { once: true });
} else {
  initReveal();
}
