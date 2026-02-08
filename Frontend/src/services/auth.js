import { userService, lawyerService, getProfileImageUrl } from "./api.js";
import { showToast } from "../utils/toast.js";
import { navigateTo } from "../components/navigation.js";
import { translate } from "../utils/translations.js";
import { loginSchema, signupSchema } from "../utils/formValidation.js";

export function setupAuth() {
  const loginButton = document.getElementById("login-btn");
  const signupButton = document.getElementById("signup-btn");
  const authContainer = document.getElementById("auth-container");

  // Check if user is already logged in
  const user = localStorage.getItem("user");
  if (user) {
    showLoggedInState(JSON.parse(user));
  }

  loginButton.addEventListener("click", () => {
    showLoginModal();
  });

  signupButton.addEventListener("click", () => {
    showSignupModal();
  });

  function showLoggedInState(user) {
    const adminNavItem = document.getElementById("admin-nav-item");
    if (adminNavItem) {
      adminNavItem.style.display = user.role === "admin" ? "" : "none";
    }
    const isLawyer = user.role === "lawyer";
    authContainer.innerHTML = `
      <div class="user-profile header-auth-row">
        <a href="#" id="consultation-notification-icon" class="notification-bell-wrap" title="${isLawyer ? "Consultation requests" : "Consultation updates"}" aria-label="${isLawyer ? "Consultation requests" : "Consultation updates"}">
          <i class="fas fa-bell"></i>
          <span id="consultation-notification-badge" class="notification-badge">0</span>
        </a>
        <div class="profile-image-circle" id="profile-icon">
          <img src="${getProfileImageUrl(user.profileImage)}" alt="${
            user.name
          }" onerror="this.src='/lawyer.png'" crossorigin="anonymous">
        </div>
        <span><span data-i18n="welcome">${translate("welcome")}</span>, ${
          user.name
        }</span>
        <button id="logout-btn" class="btn btn-outline" data-i18n="logout">${translate(
          "logout",
        )}</button>
      </div>
    `;

    document.getElementById("logout-btn").addEventListener("click", () => {
      showToast("Logged out successfully!", "success");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setTimeout(() => {
        navigateTo("home");
        location.reload();
      }, 500);
    });

    // Add click event to profile icon with image preload to ensure proper rendering
    const profileIcon = document.getElementById("profile-icon");
    const profileImage = profileIcon.querySelector("img");

    // Ensure image loads correctly
    profileImage.onload = function () {
      console.log("Header profile image loaded successfully");
    };

    profileImage.onerror = function () {
      console.warn("Failed to load header profile image, using fallback");
      this.src = "/lawyer.png";
    };

    profileIcon.addEventListener("click", () => {
      if (user.role === "lawyer") {
        lawyerService
          .getMyLawyerProfile()
          .then((res) => {
            const lawyerId = res.data?.data?.id;
            import("../components/navigation.js").then((module) => {
              module.navigateTo(
                lawyerId ? "lawyer-profile" : "user-profile",
                lawyerId ? { id: lawyerId } : {},
              );
            });
          })
          .catch(() => {
            import("../components/navigation.js").then((module) => {
              module.navigateTo("user-profile");
            });
          });
      } else {
        import("../components/navigation.js").then((module) => {
          module.navigateTo("user-profile");
        });
      }
    });

    // Notification bell: lawyer = pending count (link to lawyer profile); user = unread updates count (link to user profile consultations)
    const badgeEl = document.getElementById("consultation-notification-badge");
    const bellEl = document.getElementById("consultation-notification-icon");
    if (bellEl) {
      bellEl.addEventListener("click", (e) => {
        e.preventDefault();
        if (user.role === "lawyer") {
          lawyerService
            .getMyLawyerProfile()
            .then((res) => {
              const lawyerId = res.data?.data?.id;
              import("../components/navigation.js").then((module) => {
                module.navigateTo(
                  lawyerId ? "lawyer-profile" : "user-profile",
                  lawyerId
                    ? { id: lawyerId, tab: "consultations" }
                    : { tab: "consultations" },
                );
              });
            })
            .catch(() => {
              import("../components/navigation.js").then((module) => {
                module.navigateTo("user-profile", { tab: "consultations" });
              });
            });
        } else {
          import("../components/navigation.js").then((module) => {
            module.navigateTo("user-profile", { tab: "consultations" });
          });
        }
      });
    }
    (async () => {
      try {
        if (isLawyer) {
          const meRes = await lawyerService.getMyLawyerProfile();
          const lawyerId = meRes.data?.data?.id;
          if (!lawyerId) {
            if (badgeEl) badgeEl.style.display = "none";
            return;
          }
          const consRes = await lawyerService.getConsultations(lawyerId);
          const list = consRes.data?.data || [];
          const pending = list.filter((c) => c.status === "pending").length;
          if (badgeEl) {
            badgeEl.textContent = pending > 99 ? "99+" : String(pending);
            badgeEl.style.display = pending > 0 ? "inline-flex" : "none";
          }
          window.addEventListener("consultations-updated", async () => {
            try {
              const res = await lawyerService.getConsultations(lawyerId);
              const list = res.data?.data || [];
              const pending = list.filter((c) => c.status === "pending").length;
              const badge = document.getElementById(
                "consultation-notification-badge",
              );
              if (badge) {
                badge.textContent = pending > 99 ? "99+" : String(pending);
                badge.style.display = pending > 0 ? "inline-flex" : "none";
              }
            } catch (_) {}
          });
        } else {
          const res = await userService.getConsultationUnreadCount();
          const count = res.data?.data?.count ?? 0;
          if (badgeEl) {
            badgeEl.textContent = count > 99 ? "99+" : String(count);
            badgeEl.style.display = count > 0 ? "inline-flex" : "none";
          }
          window.addEventListener("consultations-updated", async () => {
            try {
              const r = await userService.getConsultationUnreadCount();
              const n = r.data?.data?.count ?? 0;
              const badge = document.getElementById(
                "consultation-notification-badge",
              );
              if (badge) {
                badge.textContent = n > 99 ? "99+" : String(n);
                badge.style.display = n > 0 ? "inline-flex" : "none";
              }
            } catch (_) {}
          });
        }
      } catch (err) {
        console.error("Failed to load notification count:", err);
        if (badgeEl) badgeEl.style.display = "none";
      }
    })();
  }

  function showLoginModal() {
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Login to Your Account</h2>
        
        <div class="login-type-selector">
          <button type="button" class="login-type-btn active" data-type="user">Login as User</button>
          <button type="button" class="login-type-btn" data-type="lawyer">Login as Lawyer</button>
        </div>
        
        <form id="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" required>
          </div>
          <p class="error-message" id="login-error" style="color: red; display: none;"></p>
          <button type="submit" class="btn btn-primary">Login</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup login type selector
    const loginTypeBtns = modal.querySelectorAll(".login-type-btn");
    let selectedType = "user";

    loginTypeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        loginTypeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedType = btn.dataset.type;
      });
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

    // Handle form submit - use form scope to avoid duplicate IDs with other pages
    const loginForm = modal.querySelector("#login-form");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const form = e.target;
      const email = form.querySelector("#email").value;
      const password = form.querySelector("#password").value;
      const errorElement = form.querySelector("#login-error");

      try {
        errorElement.style.display = "none";

        // Validate form data using Zod
        const validationResult = loginSchema.safeParse({ email, password });

        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues[0].message;
          errorElement.textContent = errorMessage;
          errorElement.style.display = "block";
          return;
        }

        const response = await userService.login(email, password);

        // Check if the user type matches the selected type
        const userRole = response.data.user.role;
        if (
          (selectedType === "lawyer" && userRole !== "lawyer") ||
          (selectedType === "user" && userRole === "lawyer")
        ) {
          errorElement.textContent = `This account is not registered as a ${selectedType}. Please select the correct login type.`;
          errorElement.style.display = "block";
          return;
        }

        // Store the token and user data
        localStorage.setItem(
          "user",
          JSON.stringify({
            token: response.data.token,
            name: response.data.user.name,
            email: response.data.user.email,
            mobile: response.data.user.mobile,
            id: response.data.user.id,
            role: response.data.user.role,
            profileImage: response.data.user.profileImage,
          }),
        );

        document.body.removeChild(modal);
        showLoggedInState({
          name: response.data.user.name,
          profileImage: response.data.user.profileImage,
        });

        // Replace this line:
        // window.location.href = "/";

        // With this:
        window.location.reload();
      } catch (error) {
        console.error("Login error:", error);
        errorElement.textContent =
          error.response?.data?.message || "Login failed. Please try again.";
        errorElement.style.display = "block";
      }
    });
  }

  function showSignupModal() {
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Create an Account</h2>
        
        <div class="signup-type-selector">
          <button type="button" class="signup-type-btn active" data-type="user">Register as User</button>
          <button type="button" class="signup-type-btn" data-type="lawyer">Register as Lawyer</button>
        </div>
        
        <form id="signup-form">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input type="text" id="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="mobile">Mobile</label>
            <input type="text" id="mobile" required placeholder="+91 XXXXX XXXXX">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" required minlength="6">
          </div>
          <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input type="password" id="confirm-password" required>
          </div>
          <p class="error-message" id="signup-error" style="color: red; display: none;"></p>
          <button type="submit" class="btn btn-primary">Sign Up</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup signup type selector
    const signupTypeBtns = modal.querySelectorAll(".signup-type-btn");
    let selectedType = "user";

    signupTypeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        signupTypeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedType = btn.dataset.type;
      });
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

    // Handle form submit - use form scope to avoid duplicate IDs with other pages
    const signupForm = modal.querySelector("#signup-form");
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const form = e.target;
      const name = form.querySelector("#name").value;
      const email = form.querySelector("#email").value;
      const mobile = form.querySelector("#mobile").value;
      const password = form.querySelector("#password").value;
      const confirmPassword = form.querySelector("#confirm-password").value;
      const errorElement = form.querySelector("#signup-error");

      try {
        errorElement.style.display = "none";

        // Validate form data using Zod
        const validationResult = signupSchema.safeParse({
          name,
          email,
          mobile,
          password,
          confirmPassword,
        });

        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues[0].message;
          errorElement.textContent = errorMessage;
          errorElement.style.display = "block";
          return;
        }

        // Include the role (user or lawyer) in registration data
        const userData = {
          name,
          email,
          mobile,
          password,
          role: selectedType, // Include the selected role type here
        };

        const response = await userService.register(userData);

        // Store the token and user data
        localStorage.setItem(
          "user",
          JSON.stringify({
            token: response.data.token,
            name: response.data.user.name,
            email: response.data.user.email,
            mobile: response.data.user.mobile,
            id: response.data.user.id,
            role: response.data.user.role,
          }),
        );

        document.body.removeChild(modal);

        // If user selected to register as lawyer, redirect to lawyer registration page
        if (selectedType === "lawyer") {
          // Use the more reliable navigation function instead of trying to click an element
          import("../components/navigation.js").then((module) => {
            module.navigateTo("lawyer-register");
          });
        } else {
          showLoggedInState({ name: response.data.user.name });
          // Redirect to home page for regular users
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Registration error:", error);
        let message = "Registration failed. Please try again.";
        if (!error.response) {
          message =
            "Cannot reach server. Check that the backend is running on port 5000 and try again.";
        } else if (error.response.data?.message) {
          message = error.response.data.message;
        } else if (error.response.status === 500) {
          message = "Server error. Check the backend console for details.";
        }
        errorElement.textContent = message;
        errorElement.style.display = "block";
      }
    });
  }
}

// Improved version of refreshUserAuth function
export function refreshUserAuth() {
  const userJson = localStorage.getItem("user");
  if (!userJson) return null;

  try {
    // Parse the stored user data
    const userData = JSON.parse(userJson);

    // Check if token exists
    if (!userData.token) {
      console.error("No token found in stored user data");
      localStorage.removeItem("user");
      return null;
    }

    // Get the token parts
    const tokenParts = userData.token.split(".");
    if (tokenParts.length !== 3) {
      console.error("Invalid token format");
      localStorage.removeItem("user");
      return null;
    }

    // Parse the payload to check expiration
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds

      if (Date.now() >= expirationTime) {
        console.log("Token has expired, clearing user data");
        localStorage.removeItem("user");
        return null;
      }

      return userData;
    } catch (e) {
      console.error("Error parsing token:", e);
      localStorage.removeItem("user");
      return null;
    }
  } catch (e) {
    console.error("Error parsing user JSON:", e);
    localStorage.removeItem("user");
    return null;
  }
}

// Check token validity on application start and clean up invalid tokens
document.addEventListener("DOMContentLoaded", () => {
  console.log("Checking token validity on application startup");
  const userData = refreshUserAuth();

  // If we have a user but getting token issues, clear it
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("auth") === "error") {
    console.log("Auth error parameter detected, clearing token");
    localStorage.removeItem("user");
    showToast("Your session has expired. Please log in again.", "info");
    // After a brief delay, redirect to home page without the query parameter
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 1000);
  }
});
