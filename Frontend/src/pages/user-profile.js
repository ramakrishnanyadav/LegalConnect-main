import {
  userService,
  communityService,
  getProfileImageUrl,
  paymentService,
} from "../services/api.js";
import { showToast, showConfirm } from "../utils/toast.js";

export async function renderUserProfilePage(initialTab) {
  const mainContent = document.getElementById("main-content");

  // Show loading state
  mainContent.innerHTML = `
    <section class="user-profile-page">
      <div class="loading-spinner">Loading profile...</div>
    </section>
  `;

  try {
    // Get current user from localStorage
    const currentUser = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null;

    if (!currentUser) {
      mainContent.innerHTML = `
        <section class="user-profile-page">
          <div class="error-message">
            <h2>Not Authenticated</h2>
            <p>Please log in to view your profile.</p>
            <button class="btn btn-primary" id="login-redirect-btn">Login</button>
          </div>
        </section>
      `;

      document
        .getElementById("login-redirect-btn")
        .addEventListener("click", () => {
          document.getElementById("login-btn").click();
        });

      return;
    }

    // Fetch user profile details
    const response = await userService.getUserProfile();
    const userProfile = response.data.data;

    // Render profile page
    mainContent.innerHTML = `
      <section class="user-profile-page">
        <div class="profile-container">
          <div class="profile-header">
            <div class="profile-image">
              <img src="${getProfileImageUrl(userProfile?.profileImage)}" alt="${
                userProfile?.name || currentUser?.name
              }" onerror="this.src='/lawyer.png'">
              <button id="change-photo-btn" class="btn btn-sm btn-outline"><i class="fas fa-camera"></i> Change Photo</button>
            </div>
            <div class="profile-info">
              <h1>${userProfile?.name || currentUser?.name}</h1>
              <p>
                <strong>Email:</strong> ${userProfile?.email || currentUser?.email}
                <button id="change-email-btn" class="btn btn-xs btn-link" title="Change email">
                  <i class="fas fa-edit"></i>
                </button>
              </p>
              <p>
                <strong>Password:</strong> ••••••••
                <button id="change-password-btn" class="btn btn-xs btn-link" title="Change password">
                  <i class="fas fa-key"></i>
                </button>
              </p>
              <p><strong>Mobile:</strong> ${
                userProfile?.mobile || currentUser?.mobile || "Not specified"
              }</p>
              <p><strong>Location:</strong> ${
                userProfile?.location ||
                currentUser?.location ||
                "Not specified"
              }</p>
              <p><strong>Bio:</strong> ${
                userProfile?.bio ||
                currentUser?.bio ||
                "No bio information available."
              }</p>
            </div>
            <div class="profile-actions">
              <button id="edit-profile-btn" class="btn btn-primary"><i class="fas fa-edit"></i> Edit Profile</button>
            </div>
          </div>
          
          <div class="profile-tabs">
            <button class="tab-btn ${initialTab === "consultations" ? "" : "active"}" data-tab="activities">Activities</button>
            <button class="tab-btn ${initialTab === "consultations" ? "active" : ""}" data-tab="consultations">Consultations</button>
          </div>
          
          <div class="profile-content">
            <div class="tab-content ${initialTab === "consultations" ? "" : "active"}" id="activities-tab">
              <h2>Recent Activities</h2>
              
              <div class="activities-container">
                <div class="activity-section">
                  <h3><i class="fas fa-pen"></i> My Posted Topics</h3>
                  <div id="posted-topics-list">
                    <div class="loading-spinner">Loading...</div>
                  </div>
                </div>
                
                <div class="activity-section">
                  <h3><i class="fas fa-bookmark"></i> Saved Topics</h3>
                  <div id="saved-topics-list">
                    <div class="loading-spinner">Loading...</div>
                  </div>
                </div>
                
                <div class="activity-section">
                  <h3><i class="fas fa-comments"></i> Topics I Commented On</h3>
                  <div id="commented-topics-list">
                    <div class="loading-spinner">Loading...</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="tab-content ${initialTab === "consultations" ? "active" : ""}" id="consultations-tab">
              <h2>Your Consultations</h2>
              <div class="consultation-filters">
                <button class="consultation-filter-btn active" data-filter="all">All</button>
                <button class="consultation-filter-btn" data-filter="pending">Pending</button>
                <button class="consultation-filter-btn" data-filter="accepted">Accepted</button>
                <button class="consultation-filter-btn" data-filter="completed">Completed</button>
                <button class="consultation-filter-btn" data-filter="cancelled">Cancelled</button>
              </div>
              
              <div class="consultations-container" id="consultations-container">
                <div class="loading-spinner">Loading consultations...</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    // Add tab functionality
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        // Remove active class from all tabs
        document
          .querySelectorAll(".tab-btn")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((t) => t.classList.remove("active"));

        // Add active class to selected tab
        this.classList.add("active");
        document
          .getElementById(`${this.dataset.tab}-tab`)
          .classList.add("active");
      });
    });

    // Load activities when user clicks Activities tab or when landing on activities
    const activitiesTab = document.querySelector(
      '.tab-btn[data-tab="activities"]',
    );
    activitiesTab.addEventListener("click", () => {
      loadUserActivities();
    });
    if (!initialTab || initialTab === "activities") loadUserActivities();

    // Load consultations when user clicks Consultations tab or when landing with tab=consultations
    const consultationsTab = document.querySelector(
      '.tab-btn[data-tab="consultations"]',
    );
    consultationsTab.addEventListener("click", () => {
      loadUserConsultations();
    });
    if (initialTab === "consultations") loadUserConsultations();

    // Setup edit profile button
    document
      .getElementById("edit-profile-btn")
      .addEventListener("click", () => {
        showEditProfileModal(userProfile || currentUser);
      });

    // Setup change photo button
    document
      .getElementById("change-photo-btn")
      .addEventListener("click", () => {
        showChangePhotoModal(userProfile || currentUser);
      });

    // Setup change password button
    document
      .getElementById("change-password-btn")
      .addEventListener("click", () => {
        showChangePasswordModal();
      });

    // Setup change email button
    document
      .getElementById("change-email-btn")
      .addEventListener("click", () => {
        showChangeEmailModal(userProfile || currentUser);
      });
  } catch (error) {
    console.error("Error loading user profile:", error);
    mainContent.innerHTML = `
      <section class="user-profile-page">
        <div class="error-message">
          <h2>Error Loading Profile</h2>
          <p>We encountered a problem loading your profile. Please try again later.</p>
          <button class="btn btn-primary" id="back-btn">Go Back</button>
        </div>
      </section>
    `;

    document.getElementById("back-btn").addEventListener("click", () => {
      history.back();
    });
  }
}

// Load user consultations data
async function loadUserConsultations() {
  const consultationsContainer = document.getElementById(
    "consultations-container",
  );

  try {
    // Show loading indicator
    consultationsContainer.innerHTML =
      '<div class="loading-spinner">Loading consultations...</div>';

    // Get user consultations from API
    const response = await userService.getUserConsultations();
    const consultations = response.data.data || [];

    if (consultations.length === 0) {
      consultationsContainer.innerHTML = `<div class="no-consultations">You don't have any consultations yet.</div>`;
      return;
    }

    // Render consultations
    consultationsContainer.innerHTML = renderConsultations(consultations);

    // Pay button: initiate Razorpay payment
    consultationsContainer
      .querySelectorAll(".pay-consultation-btn")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const consultationId = btn.dataset.id;
          const fee = parseFloat(btn.dataset.fee);
          await initiatePayment(consultationId, fee);
        });
      });

    // Cancel: confirm no refund, then cancel
    consultationsContainer
      .querySelectorAll(".cancel-consultation-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          showConfirm(
            "Cancel this consultation? No refund will be given.",
            async () => {
              try {
                await userService.cancelConsultation(id);
                showToast("Consultation cancelled.", "success");
                loadUserConsultations();
              } catch (err) {
                showToast(
                  err.response?.data?.message ||
                    "Failed to cancel consultation.",
                  "error",
                );
              }
            },
          );
        });
      });

    // Reschedule: open modal, then submit
    consultationsContainer
      .querySelectorAll(".reschedule-consultation-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          showUserRescheduleModal(btn.dataset.id, loadUserConsultations);
        });
      });

    // Add filter functionality
    document.querySelectorAll(".consultation-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".consultation-filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        filterConsultations(btn.dataset.filter);
      });
    });

    // Mark consultations as read when user views the list; refresh notification badge
    await userService.markConsultationsRead().catch(() => {});
    window.dispatchEvent(new CustomEvent("consultations-updated"));
  } catch (error) {
    console.error("Error loading consultations:", error);
    consultationsContainer.innerHTML = `
      <div class="error-message">Failed to load your consultations. Please try again later.</div>
    `;
  }
}

// Load user activities (posted, saved, commented topics)
async function loadUserActivities() {
  try {
    // Load all three types of activities in parallel
    const [postedResponse, savedResponse, commentedResponse] =
      await Promise.all([
        communityService.getMyPostedTopics(),
        communityService.getSavedTopics(),
        communityService.getMyCommentedTopics(),
      ]);

    const postedTopics = postedResponse.data.data || [];
    const savedTopics = savedResponse.data.data || [];
    const commentedTopics = commentedResponse.data.data || [];

    // Render each section
    renderTopicsList(
      "posted-topics-list",
      postedTopics,
      "You haven't posted any topics yet.",
    );
    renderTopicsList(
      "saved-topics-list",
      savedTopics,
      "You haven't saved any topics yet.",
    );
    renderTopicsList(
      "commented-topics-list",
      commentedTopics,
      "You haven't commented on any topics yet.",
    );
  } catch (error) {
    console.error("Error loading activities:", error);
    document.getElementById("posted-topics-list").innerHTML =
      '<div class="error-message">Failed to load activities.</div>';
    document.getElementById("saved-topics-list").innerHTML =
      '<div class="error-message">Failed to load activities.</div>';
    document.getElementById("commented-topics-list").innerHTML =
      '<div class="error-message">Failed to load activities.</div>';
  }
}

// Render topics list for activities
function renderTopicsList(containerId, topics, emptyMessage) {
  const container = document.getElementById(containerId);

  if (!topics || topics.length === 0) {
    container.innerHTML = `<p class="no-data">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = topics
    .map(
      (topic) => `
    <div class="activity-topic-item" data-id="${topic.id}">
      <div class="activity-topic-content">
        <h4 class="activity-topic-title">${topic.title}</h4>
        <div class="activity-topic-meta">
          <span class="category-badge">${topic.category}</span>
          <span class="topic-stats">
            <i class="fas fa-thumbs-up"></i> ${topic.voteScore || 0}
            <i class="fas fa-comment"></i> ${topic.replyCount || 0}
            <i class="fas fa-eye"></i> ${topic.views || 0}
          </span>
          <span class="topic-date">${formatTopicDate(topic.createdAt)}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  // Add click handlers to navigate to topic
  container.querySelectorAll(".activity-topic-item").forEach((item) => {
    item.addEventListener("click", () => {
      const topicId = item.dataset.id;
      window.location.hash = `#community?topic=${topicId}`;
    });
  });
}

// Format topic date for display
function formatTopicDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Render consultations (with Pay fee, Cancel, Reschedule)
function renderConsultations(consultations) {
  if (!consultations || consultations.length === 0) {
    return `<div class="no-consultations">You don't have any consultations yet.</div>`;
  }

  return consultations
    .map((consultation) => {
      const fee =
        consultation.lawyer?.consultationFee != null
          ? Number(consultation.lawyer.consultationFee)
          : 0;
      const showPay =
        consultation.status === "accepted" && fee > 0 && !consultation.paid;
      const canReschedule =
        (consultation.status === "pending" ||
          consultation.status === "accepted") &&
        consultation.paid &&
        (consultation.rescheduleRequests || []).length < 1;
      const showActions = ["pending", "accepted"].includes(consultation.status);

      // Format date and time in user's local timezone
      const consultationDate = new Date(consultation.date);
      const formattedDate = consultationDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      });

      return `
    <div class="consultation-item ${consultation.status}" data-status="${
      consultation.status
    }">
      <div class="consultation-header">
        <div class="consultation-lawyer">
          <div class="profile-image-circle">
            <img src="${
              consultation.lawyer.profileImage || "/lawyer.png"
            }" alt="${consultation.lawyer.name}" 
                 onerror="this.src='/lawyer.png'">
          </div>
          <h4>${consultation.lawyer.name}</h4>
        </div>
        <div class="consultation-status-wrap">
          <span class="consultation-status status-${consultation.status}">${capitalizeFirst(consultation.status)}</span>
          ${consultation.paid ? '<span class="consultation-paid-badge">Paid</span>' : ""}
          ${(consultation.rescheduleRequests || []).length > 0 ? '<span class="reschedule-notice-badge">New date/time</span>' : ""}
        </div>
      </div>
      
      <div class="consultation-details">
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${consultation.time}</p>
        <p><strong>Type:</strong> ${consultation.type}</p>
        <p><strong>Issue:</strong> ${consultation.notes || "Not provided"}</p>
        ${
          consultation.message
            ? `<p><strong>Message:</strong> ${consultation.message}</p>`
            : ""
        }
        ${
          showPay
            ? `
        <div class="consultation-pay-section">
          <p><strong>Consultation fee:</strong> ₹${fee}</p>
          <button type="button" class="btn btn-primary pay-consultation-btn" data-id="${consultation.id}" data-fee="${fee}">Pay now</button>
        </div>
        `
            : ""
        }
        ${
          showActions
            ? `
        <div class="consultation-actions">
          ${canReschedule ? `<button type="button" class="btn btn-sm btn-outline reschedule-consultation-btn" data-id="${consultation.id}">Reschedule</button>` : ""}
          <button type="button" class="btn btn-sm btn-outline cancel-consultation-btn" data-id="${consultation.id}">Cancel</button>
        </div>
        `
            : ""
        }
      </div>
    </div>
  `;
    })
    .join("");
}

// Helper function to filter consultations
function filterConsultations(filter) {
  const consultationItems = document.querySelectorAll(".consultation-item");

  consultationItems.forEach((item) => {
    if (filter === "all" || item.dataset.status === filter) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

// Reschedule modal for user (status will go back to pending; lawyer must accept)
function showUserRescheduleModal(consultationId, onSuccess) {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Request Reschedule</h2>
      <p class="form-help">Your request will set the consultation back to pending. The lawyer will need to accept the new time. All times are in your local timezone (${Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
      <form id="user-reschedule-form">
        <div class="form-group">
          <label for="user-reschedule-date">New Date</label>
          <input type="date" id="user-reschedule-date" required min="${new Date().toISOString().split("T")[0]}">
        </div>
        <div class="form-group">
          <label for="user-reschedule-time">New Time</label>
          <select id="user-reschedule-time" required>
            <option value="">Select a time</option>
            <option value="9:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
          </select>
        </div>
        <div class="form-group">
          <label for="user-reschedule-message">Message to lawyer</label>
          <textarea id="user-reschedule-message" rows="3" placeholder="Reason for reschedule (optional)"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Request Reschedule</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal
    .querySelector(".close")
    .addEventListener("click", () => document.body.removeChild(modal));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) document.body.removeChild(modal);
  });
  document
    .getElementById("user-reschedule-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const date = document.getElementById("user-reschedule-date").value;
      const time = document.getElementById("user-reschedule-time").value;
      const message = document
        .getElementById("user-reschedule-message")
        .value.trim();

      // Get user's timezone offset in minutes
      const timezoneOffset = new Date().getTimezoneOffset();

      try {
        await userService.rescheduleConsultation(consultationId, {
          date,
          time,
          message: message || undefined,
          timezoneOffset: -timezoneOffset, // Negate because getTimezoneOffset returns opposite sign
        });
        document.body.removeChild(modal);
        showToast(
          "Reschedule requested. Lawyer will need to accept the new time.",
          "success",
        );
        if (typeof onSuccess === "function") onSuccess();
      } catch (err) {
        showToast(
          err.response?.data?.message || "Failed to request reschedule.",
          "error",
        );
      }
    });
}

// Show modal for editing user profile
function showEditProfileModal(user) {
  // First fetch the current profile data to ensure we have the latest
  userService
    .getUserProfile()
    .then((response) => {
      const profileData = response.data.data;
      const currentUser = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user"))
        : null;

      // Create modal with the latest user data, falling back to stored data if needed
      const modal = document.createElement("div");
      modal.classList.add("modal");
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Edit Profile</h2>
          <form id="edit-profile-form">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" value="${
                (profileData && profileData.name) ||
                (user && user.name) ||
                (currentUser && currentUser.name) ||
                ""
              }" required>
            </div>
            <div class="form-group">
              <label for="mobile">Mobile Number</label>
              <input type="tel" id="mobile" name="mobile" value="${
                (profileData && profileData.mobile) ||
                (user && user.mobile) ||
                (currentUser && currentUser.mobile) ||
                ""
              }" placeholder="+91 XXXXX XXXXX">
            </div>
            <div class="form-group">
              <label for="location">Location</label>
              <input type="text" id="location" name="location" value="${
                (profileData && profileData.location) ||
                (user && user.location) ||
                (currentUser && currentUser.location) ||
                ""
              }" placeholder="City, State">
            </div>
            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea id="bio" name="bio" rows="4" placeholder="Tell us about yourself">${
                (profileData && profileData.bio) ||
                (user && user.bio) ||
                (currentUser && currentUser.bio) ||
                ""
              }</textarea>
            </div>
            <div class="error-message" id="edit-form-error" style="display: none;"></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Save Changes</button>
              <button type="button" id="cancel-edit-btn" class="btn btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle cancel button
      modal.querySelector("#cancel-edit-btn").addEventListener("click", () => {
        document.body.removeChild(modal);
      });

      // Close modal when clicking on x
      modal.querySelector(".close").addEventListener("click", () => {
        document.body.removeChild(modal);
      });

      // Close modal when clicking outside
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });

      // Handle form submit
      document
        .getElementById("edit-profile-form")
        .addEventListener("submit", async (e) => {
          e.preventDefault(); // Prevent default form submission

          const errorElement = document.getElementById("edit-form-error");
          errorElement.style.display = "none";

          // Get form data
          const name = document.getElementById("name").value.trim();
          const mobile = document.getElementById("mobile").value.trim();
          const location = document.getElementById("location").value.trim();
          const bio = document.getElementById("bio").value.trim();

          // Validate required fields
          if (!name) {
            errorElement.textContent = "Name is required";
            errorElement.style.display = "block";
            return;
          }

          // Show loading state on the button
          const submitBtn = e.target.querySelector('button[type="submit"]');
          submitBtn.disabled = true;
          submitBtn.innerHTML = "Saving...";

          try {
            // Send update to API
            const userData = { name, mobile, location, bio };
            const response = await userService.updateUserProfile(userData);

            if (response.data.success) {
              // Update the local user data in localStorage
              const currentUserData = JSON.parse(localStorage.getItem("user"));
              if (currentUserData) {
                // Update all user data in localStorage
                currentUserData.name = name;
                currentUserData.mobile = mobile;
                currentUserData.location = location;
                currentUserData.bio = bio;
                localStorage.setItem("user", JSON.stringify(currentUserData));
              }

              // Close the modal
              document.body.removeChild(modal);

              // Show success message
              showToast("Profile updated successfully!", "success");

              // Reload the user profile page to reflect changes
              renderUserProfilePage();
            } else {
              throw new Error(
                response.data.message || "Failed to update profile",
              );
            }
          } catch (error) {
            console.error("Error updating profile:", error);
            errorElement.textContent =
              error.message || "Something went wrong. Please try again.";
            errorElement.style.display = "block";

            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Save Changes";
          }
        });
    })
    .catch((error) => {
      console.error("Error fetching profile data for edit:", error);
      // Fallback to existing data if fetch fails
      const currentUser = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user"))
        : null;

      // Use original modal creation with fallback data
      const modal = document.createElement("div");
      modal.classList.add("modal");
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Edit Profile</h2>
          <form id="edit-profile-form">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" value="${
                (user && user.name) || (currentUser && currentUser.name) || ""
              }" required>
            </div>
            <div class="form-group">
              <label for="mobile">Mobile Number</label>
              <input type="tel" id="mobile" name="mobile" value="${
                (user && user.mobile) ||
                (currentUser && currentUser.mobile) ||
                ""
              }" placeholder="+91 XXXXX XXXXX">
            </div>
            <div class="form-group">
              <label for="location">Location</label>
              <input type="text" id="location" name="location" value="${
                (user && user.location) ||
                (currentUser && currentUser.location) ||
                ""
              }" placeholder="City, State">
            </div>
            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea id="bio" name="bio" rows="4" placeholder="Tell us about yourself">${
                (user && user.bio) || (currentUser && currentUser.bio) || ""
              }</textarea>
            </div>
            <div class="error-message" id="edit-form-error" style="display: none;"></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Save Changes</button>
              <button type="button" id="cancel-edit-btn" class="btn btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle cancel button
      modal.querySelector("#cancel-edit-btn").addEventListener("click", () => {
        document.body.removeChild(modal);
      });

      // Close modal when clicking on x
      modal.querySelector(".close").addEventListener("click", () => {
        document.body.removeChild(modal);
      });

      // Close modal when clicking outside
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });

      // Handle form submit
      document
        .getElementById("edit-profile-form")
        .addEventListener("submit", async (e) => {
          e.preventDefault(); // Prevent default form submission

          const errorElement = document.getElementById("edit-form-error");
          errorElement.style.display = "none";

          // Get form data
          const name = document.getElementById("name").value.trim();
          const mobile = document.getElementById("mobile").value.trim();
          const location = document.getElementById("location").value.trim();
          const bio = document.getElementById("bio").value.trim();

          // Validate required fields
          if (!name) {
            errorElement.textContent = "Name is required";
            errorElement.style.display = "block";
            return;
          }

          // Show loading state on the button
          const submitBtn = e.target.querySelector('button[type="submit"]');
          submitBtn.disabled = true;
          submitBtn.innerHTML = "Saving...";

          try {
            // Send update to API
            const userData = { name, mobile, location, bio };
            const response = await userService.updateUserProfile(userData);

            if (response.data.success) {
              // Update the local user data in localStorage
              const currentUserData = JSON.parse(localStorage.getItem("user"));
              if (currentUserData) {
                // Update all user data in localStorage
                currentUserData.name = name;
                currentUserData.mobile = mobile;
                currentUserData.location = location;
                currentUserData.bio = bio;
                localStorage.setItem("user", JSON.stringify(currentUserData));
              }

              // Close the modal
              document.body.removeChild(modal);

              // Show success message
              showToast("Profile updated successfully!", "success");

              // Reload the user profile page to reflect changes
              renderUserProfilePage();
            } else {
              throw new Error(
                response.data.message || "Failed to update profile",
              );
            }
          } catch (error) {
            console.error("Error updating profile:", error);
            errorElement.textContent =
              error.message || "Something went wrong. Please try again.";
            errorElement.style.display = "block";

            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Save Changes";
          }
        });
    });
}

// Show modal for changing profile photo
function showChangePhotoModal(user) {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Update Profile Photo</h2>
      <div class="profile-upload-container">
        <div class="profile-image-preview">
          <img id="profile-preview" src="${getProfileImageUrl(user?.profileImage)}" alt="Profile preview" onerror="this.src='/lawyer.png'">
        </div>
        <div class="upload-controls">
          <input type="file" id="profile-image" name="profileImage" accept="image/*" style="display: none;">
          <button type="button" id="upload-trigger" class="btn btn-outline">Choose New Photo</button>
          <p class="form-help">Maximum size: 2MB. Formats: JPG, PNG</p>
        </div>
      </div>
      <div class="error-message" id="upload-error" style="display: none;"></div>
      <div class="modal-actions">
        <button id="save-photo-btn" class="btn btn-primary" disabled>Save Changes</button>
        <button id="cancel-photo-btn" class="btn btn-outline">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Setup file input trigger
  const uploadTrigger = modal.querySelector("#upload-trigger");
  const profileImageInput = modal.querySelector("#profile-image");
  const profilePreview = modal.querySelector("#profile-preview");
  const saveBtn = modal.querySelector("#save-photo-btn");
  const errorElement = modal.querySelector("#upload-error");

  uploadTrigger.addEventListener("click", () => {
    profileImageInput.click();
  });

  // Handle image preview and validation
  profileImageInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        errorElement.textContent = "File is too large. Maximum size is 2MB.";
        errorElement.style.display = "block";
        e.target.value = ""; // Reset the input
        return;
      }

      // Check file type
      if (!file.type.match("image/(jpeg|jpg|png)")) {
        errorElement.textContent = "Only JPG and PNG files are allowed.";
        errorElement.style.display = "block";
        e.target.value = ""; // Reset the input
        return;
      }

      // Reset error message
      errorElement.style.display = "none";

      // Preview the image
      const reader = new FileReader();
      reader.onload = function (event) {
        profilePreview.src = event.target.result;
        uploadTrigger.textContent = "Change Photo";
        saveBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle save button click
  saveBtn.addEventListener("click", async () => {
    if (profileImageInput.files.length === 0) {
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = "Uploading...";
      errorElement.style.display = "none";
      // Upload the image directly without timeout or Promise.race
      // This simplifies the code and makes debugging easier
      const formData = new FormData();
      formData.append("profileImage", profileImageInput.files[0]);

      const response = await userService.uploadProfileImage(formData);

      console.log("Upload response:", response);
      if (response.data && response.data.success) {
        // Update the user object in localStorage with new image URL
        const userData = JSON.parse(localStorage.getItem("user"));
        if (userData) {
          // Make sure we're getting the correct URL path from the response
          userData.profileImage =
            response.data.url ||
            response.data.data?.profileImage ||
            response.data.data?.user?.profileImage;
          localStorage.setItem("user", JSON.stringify(userData));
        }

        const displayUrl = getProfileImageUrl(userData.profileImage);
        const cacheBust = `${displayUrl}${displayUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;

        // Update the image directly on the page without full re-render
        const profileImages = document.querySelectorAll(".profile-image img");
        profileImages.forEach((img) => {
          img.src = cacheBust;
          img.onerror = function () {
            this.src = "/lawyer.png";
          };
        });

        // Update user profile icon in header if it exists
        const profileIcon = document.querySelector("#profile-icon img");
        if (profileIcon) {
          profileIcon.src = cacheBust;
          profileIcon.onerror = function () {
            this.src = "/lawyer.png";
          };
        }

        // Close the modal and show message
        showToast("Profile image updated successfully!", "success");
        document.body.removeChild(modal);
      } else {
        throw new Error(response.data?.message || "Upload failed");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      errorElement.textContent =
        error.response?.data?.message ||
        error.message ||
        "Failed to upload image. Please try again.";
      errorElement.style.display = "block";
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });

  // Handle cancel button click
  modal.querySelector("#cancel-photo-btn").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking on x
  modal.querySelector(".close").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Helper function to capitalize first letter
function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Show Change Password Modal
function showChangePasswordModal() {
  // Create modal HTML
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2><i class="fas fa-key"></i> Change Password</h2>
      <form id="change-password-form">
        <div class="form-group">
          <label for="current-password">Current Password:</label>
          <input type="password" id="current-password" name="currentPassword" required minlength="6">
        </div>
        <div class="form-group">
          <label for="new-password">New Password:</label>
          <input type="password" id="new-password" name="newPassword" required minlength="6">
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm New Password:</label>
          <input type="password" id="confirm-password" name="confirmPassword" required minlength="6">
        </div>
        <div class="error-message" id="password-error" style="display: none; color: red; margin-bottom: 1rem;"></div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-primary" id="save-password-btn">Change Password</button>
          <button type="button" class="btn btn-secondary" id="cancel-password-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "block";

  const form = modal.querySelector("#change-password-form");
  const errorElement = modal.querySelector("#password-error");
  const saveBtn = modal.querySelector("#save-password-btn");

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorElement.style.display = "none";

    const currentPassword = form.querySelector("#current-password").value;
    const newPassword = form.querySelector("#new-password").value;
    const confirmPassword = form.querySelector("#confirm-password").value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      errorElement.textContent = "New passwords do not match";
      errorElement.style.display = "block";
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      errorElement.textContent = "Password must be at least 6 characters";
      errorElement.style.display = "block";
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Changing...";

    try {
      const response = await userService.changePassword({
        currentPassword,
        newPassword,
      });

      if (response.data && response.data.success) {
        showToast("Password changed successfully!", "success");
        document.body.removeChild(modal);
      } else {
        throw new Error(response.data?.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Change password error:", error);
      errorElement.textContent =
        error.response?.data?.message ||
        error.message ||
        "Failed to change password. Please try again.";
      errorElement.style.display = "block";
      saveBtn.disabled = false;
      saveBtn.textContent = "Change Password";
    }
  });

  // Handle cancel button click
  modal.querySelector("#cancel-password-btn").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking on x
  modal.querySelector(".close").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Show Change Email Modal
function showChangeEmailModal(user) {
  // Create modal HTML
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2><i class="fas fa-envelope"></i> Change Email</h2>
      <form id="change-email-form">
        <div class="form-group">
          <label for="current-email">Current Email:</label>
          <input type="email" id="current-email" value="${user.email}" disabled>
        </div>
        <div class="form-group">
          <label for="new-email">New Email:</label>
          <input type="email" id="new-email" name="newEmail" required>
        </div>
        <div class="form-group">
          <label for="password-confirm">Confirm Password:</label>
          <input type="password" id="password-confirm" name="password" required minlength="6">
          <small style="color: var(--gray-text);">Enter your password to confirm this change</small>
        </div>
        <div class="error-message" id="email-error" style="display: none; color: red; margin-bottom: 1rem;"></div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-primary" id="save-email-btn">Change Email</button>
          <button type="button" class="btn btn-secondary" id="cancel-email-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "block";

  const form = modal.querySelector("#change-email-form");
  const errorElement = modal.querySelector("#email-error");
  const saveBtn = modal.querySelector("#save-email-btn");

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorElement.style.display = "none";

    const newEmail = form.querySelector("#new-email").value.trim();
    const password = form.querySelector("#password-confirm").value;

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      errorElement.textContent = "Please enter a valid email address";
      errorElement.style.display = "block";
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Changing...";

    try {
      const response = await userService.changeEmail({
        newEmail,
        password,
      });

      if (response.data && response.data.success) {
        // Update the user object in localStorage with new email
        const userData = JSON.parse(localStorage.getItem("user"));
        if (userData) {
          userData.email = response.data.data.email;
          localStorage.setItem("user", JSON.stringify(userData));
        }

        showToast(
          "Email changed successfully! Please log in with your new email next time.",
          "success",
        );
        document.body.removeChild(modal);

        // Reload the profile page to show updated email
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error(response.data?.message || "Failed to change email");
      }
    } catch (error) {
      console.error("Change email error:", error);
      errorElement.textContent =
        error.response?.data?.message ||
        error.message ||
        "Failed to change email. Please try again.";
      errorElement.style.display = "block";
      saveBtn.disabled = false;
      saveBtn.textContent = "Change Email";
    }
  });

  // Handle cancel button click
  modal.querySelector("#cancel-email-btn").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking on x
  modal.querySelector(".close").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Initiate Razorpay payment for consultation
async function initiatePayment(consultationId, fee) {
  try {
    // Create order on backend
    const orderResponse = await paymentService.createOrder(consultationId);
    
    if (!orderResponse.data.success) {
      showToast(orderResponse.data.message || "Failed to create payment order", "error");
      return;
    }

    const { orderId, amount, currency, key } = orderResponse.data.data;
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Razorpay checkout options
    const options = {
      key: key, // Razorpay key from backend
      amount: amount * 100, // Amount in paise
      currency: currency,
      name: "LegalConnect",
      description: "Consultation Fee Payment",
      order_id: orderId,
      prefill: {
        name: user.name || "",
        email: user.email || "",
      },
      theme: {
        color: "#2563eb",
      },
      handler: async function (response) {
        // Payment successful - verify on backend
        try {
          const verifyResponse = await paymentService.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            consultationId: consultationId,
          });

          if (verifyResponse.data.success) {
            showToast("Payment successful! Your consultation is now confirmed.", "success");
            // Reload consultations to reflect paid status
            loadUserConsultations();
          } else {
            showToast("Payment verification failed. Please contact support.", "error");
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          showToast("Payment verification failed. Please contact support.", "error");
        }
      },
      modal: {
        ondismiss: function () {
          showToast("Payment cancelled", "info");
        },
      },
    };

    // Open Razorpay checkout
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error("Payment initiation error:", error);
    showToast(
      error.response?.data?.message || "Failed to initiate payment. Please try again.",
      "error"
    );
  }
}
