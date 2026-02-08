import { adminService } from "../services/api.js";
import { showConfirm } from "../utils/toast.js";

function showToast(message, type = "info") {
  const existing = document.getElementById("admin-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "admin-toast";
  toast.className = `admin-toast admin-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function renderAdminPage() {
  const mainContent = document.getElementById("main-content");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.role !== "admin") {
    mainContent.innerHTML = `
      <div class="admin-forbidden">
        <h2><i class="fas fa-lock"></i> Access Denied</h2>
        <p>You need admin privileges to view this page.</p>
      </div>
    `;
    return;
  }

  mainContent.innerHTML = `
    <section class="admin-page">
      <h1 class="page-title"><i class="fas fa-shield-alt"></i> Admin Dashboard</h1>

      <div class="admin-dashboard" id="admin-dashboard">
        <div class="loading-spinner">Loading dashboard...</div>
      </div>

      <div class="admin-tabs" id="admin-tabs">
        <button class="admin-tab active" data-tab="users">Users</button>
        <button class="admin-tab" data-tab="topics">Topics</button>
        <button class="admin-tab" data-tab="lawyers">Lawyers</button>
        <button class="admin-tab" data-tab="resources">Resources</button>
        <button class="admin-tab" data-tab="consultations">Consultations</button>
      </div>

      <div class="admin-content" id="admin-content">
        <div class="loading-spinner">Loading...</div>
      </div>
    </section>
  `;

  loadDashboard();
  loadTabContent("users");

  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".admin-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadTabContent(btn.dataset.tab);
    });
  });
}

async function loadDashboard() {
  const el = document.getElementById("admin-dashboard");
  try {
    const res = await adminService.getDashboard();
    const d = res.data.data;
    el.innerHTML = `
      <div class="admin-stats">
        <div class="stat-card">
          <i class="fas fa-users"></i>
          <span class="stat-value">${d.users}</span>
          <span class="stat-label">Users</span>
        </div>
        <div class="stat-card">
          <i class="fas fa-briefcase"></i>
          <span class="stat-value">${d.lawyers}</span>
          <span class="stat-label">Lawyers</span>
        </div>
        <div class="stat-card">
          <i class="fas fa-comments"></i>
          <span class="stat-value">${d.topics}</span>
          <span class="stat-label">Topics</span>
        </div>
        <div class="stat-card">
          <i class="fas fa-file-alt"></i>
          <span class="stat-value">${d.resources}</span>
          <span class="stat-label">Resources</span>
        </div>
        <div class="stat-card">
          <i class="fas fa-calendar-check"></i>
          <span class="stat-value">${d.consultations}</span>
          <span class="stat-label">Consultations</span>
        </div>
        <div class="stat-card stat-card-warning">
          <i class="fas fa-flag"></i>
          <span class="stat-value">${d.reportedTopicsCount}</span>
          <span class="stat-label">Reported Topics</span>
        </div>
      </div>
      ${
        d.topReportedTopics?.length
          ? `
        <div class="admin-reported">
          <h3><i class="fas fa-exclamation-triangle"></i> Top Reported Topics</h3>
          <ul>
            ${d.topReportedTopics
              .map(
                (t) => `
              <li>
                <span class="report-count">${t.reports} reports</span>
                <span class="report-title">${t.title}</span>
                <span class="report-meta">by ${t.author} · ${formatDate(t.createdAt)}</span>
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
      `
          : ""
      }
    `;
  } catch (err) {
    el.innerHTML = `<div class="error-message">${err.response?.data?.message || "Failed to load dashboard"}</div>`;
  }
}

async function loadTabContent(tab) {
  const el = document.getElementById("admin-content");
  el.innerHTML = '<div class="loading-spinner">Loading...</div>';

  try {
    if (tab === "users") {
      const res = await adminService.getUsers();
      renderUsersTable(el, res.data.data);
    } else if (tab === "topics") {
      const res = await adminService.getTopics();
      renderTopicsTable(el, res.data.data);
    } else if (tab === "lawyers") {
      const res = await adminService.getLawyers();
      renderLawyersTable(el, res.data.data);
    } else if (tab === "resources") {
      const res = await adminService.getResources();
      renderResourcesTable(el, res.data.data);
    } else if (tab === "consultations") {
      const res = await adminService.getConsultations();
      renderConsultationsTable(el, res.data.data);
    }
  } catch (err) {
    el.innerHTML = `<div class="error-message">${err.response?.data?.message || "Failed to load data"}</div>`;
  }
}

function renderUsersTable(el, items) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser.id ? String(currentUser.id) : null;
  el.innerHTML = `
    <div class="admin-search-container">
      <input type="text" class="admin-search-input" id="admin-search" placeholder="Search users by name, email, or role..." />
      <i class="fas fa-search admin-search-icon"></i>
    </div>
    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (u) => `
            <tr>
              <td>${u.name || "-"}</td>
              <td>${u.email || "-"}</td>
              <td><span class="badge badge-${u.role}">${u.role}</span></td>
              <td>${formatDate(u.createdAt)}</td>
              <td>
                ${
                  String(u.id) === currentUserId
                    ? '<span class="text-muted">Current user</span>'
                    : `<button class="btn btn-sm btn-danger delete-btn" data-id="${u.id}" data-type="user"><i class="fas fa-trash"></i> Delete</button>`
                }
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      ${items.length === 0 ? '<p class="no-data">No users found.</p>' : ""}
    </div>
  `;
  attachDeleteHandlers(el, "user", adminService.deleteUser, () =>
    loadTabContent("users"),
  );
  attachSearchHandler();
}

function renderTopicsTable(el, items) {
  el.innerHTML = `
    <div class="admin-search-container">
      <input type="text" class="admin-search-input" id="admin-search" placeholder="Search topics by title, category, or author..." />
      <i class="fas fa-search admin-search-icon"></i>
    </div>
    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Author</th>
            <th>Reports</th>
            <th>Views</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (t) => `
            <tr>
              <td>${(t.title || "").slice(0, 50)}${(t.title || "").length > 50 ? "..." : ""}</td>
              <td>${t.category || "-"}</td>
              <td>${t.author || "-"}</td>
              <td>${t.reports || 0}</td>
              <td>${t.views || 0}</td>
              <td>${formatDate(t.createdAt)}</td>
              <td><button class="btn btn-sm btn-danger delete-btn" data-id="${t.id}" data-type="topic"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      ${items.length === 0 ? '<p class="no-data">No topics found.</p>' : ""}
    </div>
  `;
  attachDeleteHandlers(el, "topic", adminService.deleteTopic, () => {
    loadTabContent("topics");
    loadDashboard();
  });
  attachSearchHandler();
}

function renderLawyersTable(el, items) {
  el.innerHTML = `
    <div class="admin-search-container">
      <input type="text" class="admin-search-input" id="admin-search" placeholder="Search lawyers by name, email, or practice area..." />
      <i class="fas fa-search admin-search-icon"></i>
    </div>
    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Practice Areas</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (l) => `
            <tr>
              <td>${l.name || "-"}</td>
              <td>${l.email || "-"}</td>
              <td>${(l.practiceAreas || []).join(", ") || "-"}</td>
              <td><button class="btn btn-sm btn-danger delete-btn" data-id="${l.id}" data-type="lawyer"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      ${items.length === 0 ? '<p class="no-data">No lawyers found.</p>' : ""}
    </div>
  `;
  attachDeleteHandlers(el, "lawyer", adminService.deleteLawyer, () => {
    loadTabContent("lawyers");
    loadDashboard();
  });
  attachSearchHandler();
}

function renderResourcesTable(el, items) {
  el.innerHTML = `
    <div class="admin-search-container">
      <input type="text" class="admin-search-input" id="admin-search" placeholder="Search resources by title, type, or category..." />
      <i class="fas fa-search admin-search-icon"></i>
    </div>
    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Category</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (r) => `
            <tr>
              <td>${(r.title || "").slice(0, 40)}${(r.title || "").length > 40 ? "..." : ""}</td>
              <td>${r.type || "-"}</td>
              <td>${r.category || "-"}</td>
              <td><button class="btn btn-sm btn-danger delete-btn" data-id="${r.id}" data-type="resource"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      ${items.length === 0 ? '<p class="no-data">No resources found.</p>' : ""}
    </div>
  `;
  attachDeleteHandlers(el, "resource", adminService.deleteResource, () => {
    loadTabContent("resources");
    loadDashboard();
  });
  attachSearchHandler();
}

function renderConsultationsTable(el, items) {
  el.innerHTML = `
    <div class="admin-search-container">
      <input type="text" class="admin-search-input" id="admin-search" placeholder="Search consultations by lawyer, client, or status..." />
      <i class="fas fa-search admin-search-icon"></i>
    </div>
    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Lawyer</th>
            <th>Client</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (c) => `
            <tr>
              <td>${c.lawyerName || "-"}</td>
              <td>${c.clientName || "-"}</td>
              <td>${formatDate(c.date)}</td>
              <td><span class="badge badge-${c.status}">${c.status}</span></td>
              <td><button class="btn btn-sm btn-danger delete-btn" data-id="${c.id}" data-type="consultation"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      ${items.length === 0 ? '<p class="no-data">No consultations found.</p>' : ""}
    </div>
  `;
  attachDeleteHandlers(
    el,
    "consultation",
    adminService.deleteConsultation,
    () => {
      loadTabContent("consultations");
      loadDashboard();
    },
  );
  attachSearchHandler();
}

function attachDeleteHandlers(container, type, deleteFn, onSuccess) {
  container.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      showConfirm(`Are you sure you want to delete this ${type}?`, async () => {
        btn.disabled = true;
        try {
          await deleteFn(id);
          showToast(
            `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
            "success",
          );
          onSuccess();
        } catch (err) {
          showToast(err.response?.data?.message || "Delete failed", "error");
          btn.disabled = false;
        }
      });
    });
  });
}

function attachSearchHandler() {
  const searchInput = document.getElementById("admin-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const table = document.querySelector(".admin-table tbody");
    if (!table) return;

    const rows = table.querySelectorAll("tr");
    let visibleCount = 0;

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        row.style.display = "";
        visibleCount++;
      } else {
        row.style.display = "none";
      }
    });

    // Show/hide no results message
    const container = document.querySelector(".admin-table-container");
    let noResults = container.querySelector(".no-search-results");

    if (visibleCount === 0 && searchTerm) {
      if (!noResults) {
        noResults = document.createElement("p");
        noResults.className = "no-search-results no-data";
        noResults.textContent = "No results found for your search.";
        container.appendChild(noResults);
      }
    } else if (noResults) {
      noResults.remove();
    }
  });
}
