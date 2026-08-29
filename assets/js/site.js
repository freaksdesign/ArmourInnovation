/* Armour Innovation LLC - site behaviour.
   Three jobs: mobile nav, scroll reveal, contact form submission. */
(function () {
  "use strict";

  // Marks that JS is available, so the reveal styles can hide content safely.
  // Without this class the page renders fully visible for no-JS visitors.
  document.documentElement.classList.add("js");

  /* --- Mobile navigation ------------------------------------------------ */
  var toggle = document.querySelector(".nav__toggle");
  var drawer = document.querySelector(".nav__drawer");

  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      var open = drawer.getAttribute("data-open") === "true";
      drawer.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.innerHTML = open ? "☰" : "✕";
    });

    // Close the drawer when a link inside it is followed.
    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        drawer.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = "☰";
      }
    });
  }

  /* --- Scroll reveal ---------------------------------------------------- */
  var reveals = document.querySelectorAll("[data-reveal]");
  var wantsMotion = window.matchMedia(
    "(prefers-reduced-motion: no-preference)"
  ).matches;

  if (reveals.length && wantsMotion && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    // Failsafe: if the observer has revealed nothing shortly after load, show
    // everything. Uses the same class the observer does, so there is only one
    // code path that can make content visible.
    window.setTimeout(function () {
      if (document.querySelector("[data-reveal].is-visible")) return;
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }, 1500);

    reveals.forEach(function (el, index) {
      // Stagger siblings only, so long pages do not accumulate delay.
      var position = Array.prototype.indexOf.call(
        el.parentElement.children,
        el
      );
      el.style.setProperty(
        "--reveal-delay",
        Math.min(position, 4) * 70 + "ms"
      );
      observer.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* --- Contact form ----------------------------------------------------- */
  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  var submit = form.querySelector('button[type="submit"]');
  var endpoint = form.getAttribute("action") || "";

  function setFieldError(field, message) {
    var wrapper = field.closest(".field");
    if (!wrapper) return;
    var slot = wrapper.querySelector(".error");
    if (message) {
      wrapper.setAttribute("data-invalid", "true");
      field.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = message;
    } else {
      wrapper.removeAttribute("data-invalid");
      field.removeAttribute("aria-invalid");
    }
  }

  function validate() {
    var ok = true;
    var firstBad = null;

    form.querySelectorAll("[required]").forEach(function (field) {
      var value = (field.value || "").trim();
      var message = "";

      if (!value) {
        message = field.dataset.msgRequired || "This field is required.";
      } else if (field.type === "email" && !field.checkValidity()) {
        message = "Enter an email address we can reply to.";
      }

      setFieldError(field, message);
      if (message) {
        ok = false;
        if (!firstBad) firstBad = field;
      }
    });

    if (firstBad) firstBad.focus();
    return ok;
  }

  // Clear a field's error as soon as the visitor starts fixing it.
  form.addEventListener("input", function (event) {
    if (event.target.matches("[required]")) setFieldError(event.target, "");
  });

  function showStatus(kind, message) {
    if (!status) return;
    status.hidden = false;
    status.className = "form__status form__status--" + kind;
    status.textContent = message;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (status) status.hidden = true;
    if (!validate()) return;

    // No endpoint configured yet, and there is no published email to fall back
    // to, so say so plainly rather than appearing to send and dropping it.
    if (!endpoint || endpoint.indexOf("YOUR_FORM_ID") !== -1) {
      showStatus(
        "err",
        "This form is not connected yet. Please try again shortly."
      );
      return;
    }

    submit.setAttribute("aria-busy", "true");
    var label = submit.textContent;
    submit.textContent = "Sending...";

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Bad response");
        form.reset();
        showStatus(
          "ok",
          "Thanks, that came through. You will get a reply within one business day."
        );
      })
      .catch(function () {
        showStatus(
          "err",
          "That did not send. Please email " +
            (form.dataset.fallbackEmail || "us") +
            " directly and we will pick it up."
        );
      })
      .then(function () {
        submit.removeAttribute("aria-busy");
        submit.textContent = label;
      });
  });
})();
