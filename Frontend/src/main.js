import "./style.css";
import { renderHomePage } from "./pages/home.js";
import { setupNavigation, navigateTo } from "./components/navigation.js";
import { setupAuth } from "./services/auth.js";
import {
  getCurrentLanguage,
  applyTranslations,
  availableLanguages,
  setLanguage,
} from "./utils/translations.js";

// Initialize the application
function initApp() {
  const app = document.querySelector("#app");

  // Create the app structure - now using the footer from home.js
  app.innerHTML = `
    <header class="header">
      <div class="container">
        <div class="logo" id="logo-home-link">
          <h1><i class="fas fa-balance-scale"></i> LegalConnect</h1>
        </div>
        <nav id="main-nav">
          <ul>
            <li><a href="#" data-page="home" data-i18n="home" class="active">Home</a></li>
            <li><a href="#" data-page="lawyers" data-i18n="findLawyers">Find Lawyers</a></li>
            <li><a href="#" data-page="resources" data-i18n="resources">Resources</a></li>
            <li><a href="#" data-page="community" data-i18n="community">Community</a></li>
            <li><a href="#" data-page="ai-assistant" data-i18n="aiAssistant">AI Assistant</a></li>
            <li id="admin-nav-item" style="display: none;"><a href="#" data-page="admin"><i class="fas fa-shield-alt"></i> Admin</a></li>
          </ul>
        </nav>
        <div class="right-nav-controls">
          <div class="language-selector">
            <button id="language-btn" class="language-btn">
              <i class="fas fa-globe"></i>
              <span class="current-language">${getCurrentLanguage().toUpperCase()}</span>
            </button>
            <div class="language-dropdown" id="language-dropdown">
              <div class="language-dropdown-content">
                <!-- Language options will be inserted here -->
              </div>
            </div>
          </div>
          <div class="auth-buttons" id="auth-container">
            <button id="login-btn" class="btn btn-outline" data-i18n="login">Login</button>
            <button id="signup-btn" class="btn btn-primary" data-i18n="signup">Sign Up</button>
          </div>
        </div>
      </div>
    </header>

    <main id="main-content" class="container">
      <!-- Page content will be loaded here -->
    </main>

    <!-- Footer will be dynamically added from home.js -->
    <div id="footer-container"></div>
  `;

  // Setup navigation and authentication
  setupNavigation();
  setupAuth();

  // Setup language selector
  setupLanguageSelector();

  // Setup logo click to navigate to home
  document.getElementById("logo-home-link").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("home");
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Import the renderFooter function and render it
  import("./pages/home.js").then((module) => {
    const footerContainer = document.getElementById("footer-container");
    footerContainer.innerHTML = module.renderFooter();

    // Set up social link event listeners
    setupSocialLinks();

    // Apply translations after rendering
    applyTranslations();
  });

  // Set initial history state and restore from URL hash if present (so back button and bookmarks work)
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("lawyer-profile/")) {
    const id = hash.split("/")[1];
    history.replaceState(
      { page: "lawyer-profile", params: { id } },
      "",
      "#" + hash
    );
    navigateTo("lawyer-profile", { id }, true);
  } else if (hash.startsWith("community/topic/")) {
    // Deep link directly to a specific community topic
    const id = hash.split("/")[2];
    history.replaceState(
      { page: "community", params: { topicId: id } },
      "",
      "#" + hash
    );
    navigateTo("community", { topicId: id }, true);
  } else if (
    [
      "lawyers",
      "resources",
      "community",
      "ai-assistant",
      "lawyer-register",
      "user-profile",
      "admin",
    ].includes(hash)
  ) {
    history.replaceState({ page: hash, params: {} }, "", "#" + hash);
    navigateTo(hash, {}, true);
  } else {
    history.replaceState({ page: "home" }, "", "#home");
    renderHomePage();
  }
}

// Function to set up the language selector
function setupLanguageSelector() {
  const languageBtn = document.getElementById("language-btn");
  const languageDropdown = document.getElementById("language-dropdown");
  const dropdownContent = languageDropdown.querySelector(
    ".language-dropdown-content"
  );

  // Populate dropdown with only English and Hindi
  Object.entries(availableLanguages).forEach(([code, language]) => {
    const langOption = document.createElement("div");
    langOption.className = `language-option ${
      code === getCurrentLanguage() ? "active" : ""
    }`;
    langOption.setAttribute("data-lang", code);
    langOption.innerHTML = `
      <span class="language-flag">${language.flag}</span>
      <span class="language-name">${language.nativeName}</span>
    `;
    dropdownContent.appendChild(langOption);

    // Add click event to select language
    langOption.addEventListener("click", () => {
      // If it's the same language, don't do anything
      if (code === getCurrentLanguage()) {
        languageDropdown.classList.remove("show");
        return;
      }

      // Show simple loading indicator
      const overlay = document.createElement("div");
      overlay.className = "translation-loading-overlay";
      overlay.innerHTML = `
        <div class="translation-loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Changing to ${language.name}...</span>
        </div>
      `;
      document.body.appendChild(overlay);

      setLanguage(code);
      document.querySelector(".current-language").textContent =
        code.toUpperCase();

      // Update active class
      document.querySelectorAll(".language-option").forEach((option) => {
        option.classList.toggle(
          "active",
          option.getAttribute("data-lang") === code
        );
      });

      // Close dropdown
      languageDropdown.classList.remove("show");

      // Apply translations
      applyTranslations();

      // Remove the loading overlay after a short delay
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 500);
    });
  });

  // Toggle dropdown visibility
  languageBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    languageDropdown.classList.toggle("show");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".language-selector")) {
      languageDropdown.classList.remove("show");
    }
  });
}

// Function to set up the social links
function setupSocialLinks() {
  // Add event listeners to social media links to prevent default navigation behavior
  document.querySelectorAll(".social-links .social-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      // Stop the event from being handled by the app's navigation system
      e.stopPropagation();

      // Open the link in a new tab
      window.open(this.href, "_blank");
    });
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initApp();

  // Add a global click handler for external links
  document.addEventListener("click", (e) => {
    // Check if this is an external link (has target="_blank")
    const externalLink = e.target.closest('a[target="_blank"]');
    if (externalLink) {
      e.preventDefault();
      e.stopPropagation();
      window.open(externalLink.href, "_blank");
      return;
    }
  });

  // Apply translations with a small delay to ensure the page is rendered first
  setTimeout(() => {
    applyTranslations();
  }, 300);
});
