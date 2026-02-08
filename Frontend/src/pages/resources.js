import { resourceService } from "../services/api.js";

// Map of PDF filenames to their ImageKit URLs
const pdfUrls = {
  "DISCRIMATION.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/DISCRIMATION.pdf",
  "englishconstitution.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/englishconstitution.pdf",
  "Labour_Law.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/Labour_Law.pdf",
  "Model-Tenancy-Act-English-02_06_2021.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/Model-Tenancy-Act-English-02_06_2021.pdf",
  "Notice-of-Termination.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/Notice-of-Termination.pdf",
  "PRIVACY_LAW.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/PRIVACY_LAW.pdf",
  "RIGHT_EVICTION.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/RIGHT_EVICTION.pdf",
  "Tenants-Rights-Handbook.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/Tenants-Rights-Handbook.pdf",
  "Woman_Law.pdf":
    "https://ik.imagekit.io/igaryanthakur/legalconnect/resources/Woman_Law.pdf",
};

export function renderResourcesPage() {
  const mainContent = document.getElementById("main-content");

  // Show loading state
  mainContent.innerHTML = `
    <section class="resources-page">
      <h1 class="page-title">Legal Resources</h1>
      <p class="page-description">Access free legal guides, templates, and educational materials.</p>
      <div class="resources-filter card">
        <div class="filter-section">
          <span class="filter-label">Category:</span>
          <div class="filter-options" id="category-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <!-- Categories will be loaded dynamically -->
          </div>
        </div>
        <div class="filter-section">
          <span class="filter-label">Type:</span>
          <div class="filter-options" id="type-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="Guide">Guides</button>
            <button class="filter-btn" data-filter="Template">Templates</button>
            <button class="filter-btn" data-filter="Article">Articles</button>
          </div>
        </div>
        <div class="search-container">
          <input type="text" id="resource-search" placeholder="Search resources...">
          <button class="btn btn-outline" id="search-btn"><i class="fas fa-search"></i></button>
        </div>
      </div>
      <div class="resources-container" id="resources-container">
        <div class="loading-spinner">Loading resources...</div>
      </div>
    </section>
  `;

  // Load resources
  loadResources();

  // Load categories
  loadCategories();

  // Type filter: when user clicks a type, apply filter and reload
  document.querySelectorAll("#type-filters .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#type-filters .filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const type = btn.dataset.filter;
      filterResources(type === "all" ? {} : { type });
    });
  });

  // Set up search functionality
  document.getElementById("search-btn").addEventListener("click", () => {
    filterResources();
  });

  // Enter key in search box
  document
    .getElementById("resource-search")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        document.getElementById("search-btn").click();
      }
    });
}

async function loadResources(filters = {}) {
  const resourcesContainer = document.getElementById("resources-container");

  try {
    // Get resources from API
    const response = await resourceService.getResources(filters);
    const resources = response.data.data;

    if (resources.length === 0) {
      resourcesContainer.innerHTML = `<p class="no-results">No resources found matching your criteria.</p>`;
      return;
    }

    // Render resources
    resourcesContainer.innerHTML = `
      <div class="resources-grid">
        ${resources.map((resource) => renderResourceCard(resource)).join("")}
      </div>
    `;

    // Add event listeners for action buttons
    document.querySelectorAll(".resource-view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const fileName = btn.dataset.file;
        viewResource(fileName);
      });
    });

    document.querySelectorAll(".resource-download-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const fileName = btn.dataset.file;
        downloadResource(fileName);
      });
    });
  } catch (error) {
    console.error("Error loading resources:", error);
    resourcesContainer.innerHTML = `<p class="error-message">Failed to load resources. Please try again later.</p>`;
  }
}

async function loadCategories() {
  try {
    // Get categories from API
    const response = await resourceService.getResourceCategories();
    const categories = response.data.data;

    const categoryFilters = document.getElementById("category-filters");

    // Add category filter buttons
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.className = "filter-btn";
      button.setAttribute("data-filter", category);
      button.textContent = category;

      button.addEventListener("click", () => {
        // Remove active class from all category buttons
        document
          .querySelectorAll("#category-filters .filter-btn")
          .forEach((btn) => btn.classList.remove("active"));

        // Add active class to clicked button
        button.classList.add("active");

        // Filter resources by category
        filterResources({ category });
      });

      categoryFilters.appendChild(button);
    });

    // Add event listener to "All" button
    const allButton = document.querySelector(
      "#category-filters .filter-btn[data-filter='all']",
    );
    allButton.addEventListener("click", () => {
      // Remove active class from all category buttons
      document
        .querySelectorAll("#category-filters .filter-btn")
        .forEach((btn) => btn.classList.remove("active"));

      // Add active class to "All" button
      allButton.classList.add("active");

      // Load all resources
      loadResources();
    });
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

function getActiveFilters() {
  const filters = {};
  const activeCategory = document.querySelector(
    "#category-filters .filter-btn.active",
  );
  const activeType = document.querySelector("#type-filters .filter-btn.active");
  const searchInput = document.getElementById("resource-search");
  if (activeCategory && activeCategory.dataset.filter !== "all") {
    filters.category = activeCategory.dataset.filter;
  }
  if (activeType && activeType.dataset.filter !== "all") {
    filters.type = activeType.dataset.filter;
  }
  if (searchInput && searchInput.value.trim()) {
    filters.search = searchInput.value.trim();
  }
  return filters;
}

function filterResources(overrides = {}) {
  const filters = { ...getActiveFilters(), ...overrides };
  loadResources(filters);
}

function renderResourceCard(resource) {
  const hasFile = resource.file ? true : false;

  return `
    <div class="resource-card">
      <div class="resource-type ${(resource.type || "").toLowerCase()}">${
        resource.type || "Guide"
      }</div>
      <h3 class="resource-title">${resource.title}</h3>
      <p class="resource-category">${resource.category}</p>
      <p class="resource-description">${resource.description}</p>
      ${resource.duration ? `<div class="resource-meta"><span><i class="fas fa-clock"></i> ${resource.duration}</span></div>` : ""}
      <div class="resource-actions">
        ${
          hasFile
            ? `
          <button class="btn btn-primary resource-view-btn" data-id="${resource.id}" data-file="${resource.file}">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn btn-outline resource-download-btn" data-id="${resource.id}" data-file="${resource.file}">
            <i class="fas fa-download"></i> Download
          </button>
        `
            : `
          <button class="btn btn-primary" disabled>Coming Soon</button>
        `
        }
      </div>
    </div>
  `;
}

function viewResource(fileName) {
  // Get ImageKit URL with inline display parameter
  const pdfUrl = pdfUrls[fileName] || `/pdfs/${fileName}`;

  // For ImageKit URLs, add transformation to ensure inline display
  // Check if URL already has query parameters and use appropriate connector
  const viewUrl = pdfUrl.includes("imagekit.io")
    ? `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}tr=f-inline`
    : pdfUrl;

  // Open in new tab - browser will display PDF with its native viewer
  window.open(viewUrl, "_blank");
}

async function downloadResource(fileName) {
  try {
    // Get ImageKit URL for the file
    const pdfUrl = pdfUrls[fileName] || `/pdfs/${fileName}`;

    // For ImageKit URLs, use transformation parameter to force download
    // Check if URL already has query parameters and use appropriate connector
    const downloadUrl = pdfUrl.includes("imagekit.io")
      ? `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}tr=f-attachment`
      : pdfUrl;

    // Fetch the file and create a blob for proper download
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download error:", error);
    // Fallback: open in new tab
    const pdfUrl = pdfUrls[fileName] || `/pdfs/${fileName}`;
    window.open(pdfUrl, "_blank");
  }
}
