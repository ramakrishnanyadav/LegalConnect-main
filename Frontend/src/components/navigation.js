import { renderHomePage } from "../pages/home.js";
import { renderLawyersPage } from "../pages/lawyers.js";
import { renderResourcesPage } from "../pages/resources.js";
import { renderCommunityPage } from "../pages/community.js";
import { renderAIAssistantPage } from "../pages/ai-assistant.js";
import { renderLawyerRegisterPage } from "../pages/lawyer-register.js";
import { renderLawyerProfilePage } from "../pages/lawyer-profile.js";
import { renderUserProfilePage } from "../pages/user-profile.js";
import { renderAdminPage } from "../pages/admin.js";

// Add a variable to track current page
let currentPage = "home";

function getHashForPage(page, params = {}) {
  if (page === "lawyer-profile" && params.id) {
    return `#lawyer-profile/${params.id}`;
  }
  if (page === "community" && params.topicId) {
    return `#community/topic/${params.topicId}`;
  }
  if (page === "user-profile") return "#user-profile";
  return `#${page}`;
}

// Programmatic navigation. Set skipPushState=true when handling browser back/forward.
export function navigateTo(page, params, skipPushState = false) {
  const safeParams = params || {};

  // Skip if already on this page (except lawyer-profile where id might differ)
  if (page === currentPage && page !== "lawyer-profile" && page === "user-profile") {
    return;
  }

  currentPage = page;

  // Update browser history so back button works
  if (!skipPushState) {
    const hash = getHashForPage(page, safeParams);
    const state = { page, params: safeParams };
    history.pushState(state, "", hash);
  }

  // Clear active class from all links
  const navLinks = document.querySelectorAll("#main-nav a");
  navLinks.forEach((l) => l.classList.remove("active"));

  const link = Array.from(navLinks).find(
    (l) => l.getAttribute("data-page") === page
  );
  if (link) {
    link.classList.add("active");
  }

  switch (page) {
    case "home":
      renderHomePage();
      break;
    case "lawyers":
      renderLawyersPage();
      break;
    case "resources":
      renderResourcesPage();
      break;
    case "community":
      renderCommunityPage(safeParams.topicId);
      break;
    case "ai-assistant":
      renderAIAssistantPage();
      break;
    case "lawyer-register":
      renderLawyerRegisterPage();
      break;
    case "lawyer-profile":
      renderLawyerProfilePage(safeParams.id);
      break;
    case "user-profile":
      renderUserProfilePage();
      break;
    case "admin":
      renderAdminPage();
      break;
    default:
      renderHomePage();
  }
}

function renderUserMenu(user) {
  return `
    <div class="user-menu">
      <div class="user-profile-icon" id="profile-icon">
        <img src="${user.profileImage || "/lawyer.png"}" alt="${
    user.name
  }" onerror="this.src='/lawyer.png'">
      </div>
      <span>${user.name}</span>
      <!-- Rest of your user menu -->
    </div>
  `;
}

export function setupNavigation() {
  // Handle browser back/forward
  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.page) {
      navigateTo(e.state.page, e.state.params || {}, true);
    }
  });

  const navLinks = document.querySelectorAll("#main-nav a");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const page = link.getAttribute("data-page");
      navigateTo(page);
    });
  });

  document.addEventListener("click", function (e) {
    const profileIcon = e.target.closest("#profile-icon");

    if (profileIcon) {
      e.preventDefault();
      navigateTo("user-profile");
    }
  });
}
