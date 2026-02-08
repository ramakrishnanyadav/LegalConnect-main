import { lawyerService } from "../services/api.js";
import { navigateTo } from "../components/navigation.js";
import { showToast } from "../utils/toast.js";

let userLocation = null;

export function renderLawyersPage() {
  const mainContent = document.getElementById("main-content");
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  mainContent.innerHTML = `
    <section class="lawyers-page">
      <h1 class="page-title">Find a Lawyer</h1>
      <p class="page-description">Connect with pro bono lawyers or affordable legal services in your area.</p>
      
      <div class="search-container card">
        <form id="lawyer-search-form">
          <div class="search-inputs">
            <div class="form-group">
              <label for="practice-area">Practice Area</label>
              <select id="practice-area">
                <option value="">All Areas</option>
                <option value="Family Law">Family Law</option>
                <option value="Criminal Defense">Criminal Defense</option>
                <option value="Immigration">Immigration</option>
                <option value="Housing & Tenants Rights">Housing & Tenants Rights</option>
                <option value="Employment Law">Employment Law</option>
                <option value="Civil Rights">Civil Rights</option>
                <option value="Consumer Protection">Consumer Protection</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="location">Location</label>
              <div class="location-input-container">
                <input type="text" id="location" placeholder="City, State or ZIP">
                <button type="button" id="use-my-location-btn" class="btn btn-sm btn-outline" title="Use my current location">
                  <i class="fas fa-map-marker-alt"></i>
                </button>
              </div>
              <div id="geo-status" style="display: none;"></div>
            </div>
            
            <div class="form-group">
              <label for="service-type">Service Type</label>
              <select id="service-type">
                <option value="">All Types</option>
                <option value="Pro Bono">Pro Bono</option>
                <option value="Low Cost">Low Cost</option>
                <option value="Sliding Scale">Sliding Scale</option>
                <option value="Standard Rates">Standard Rates</option>
              </select>
            </div>
          </div>
          
          <div class="search-actions">
            <button type="submit" class="btn btn-primary">Search</button>
            <button type="button" class="btn btn-highlight" id="lawyer-register-btn">
              <i class="fas fa-user-plus"></i> Register as a Lawyer
            </button>
          </div>
        </form>
      </div>
      
      <div id="search-results" class="search-results">
        <div class="loading-spinner">Loading lawyers...</div>
      </div>
    </section>
  `;

  // Check if we already have stored geolocation permission
  const geoPermission = localStorage.getItem("geoPermission");

  // Add event listener to location button
  document
    .getElementById("use-my-location-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      requestUserLocation();
    });

  // Add event listener for the "Register as a Lawyer" button if it exists
  const becomeLawyerBtn = document.getElementById("become-lawyer-btn");
  if (becomeLawyerBtn) {
    becomeLawyerBtn.addEventListener("click", () => {
      const user = localStorage.getItem("user");
      if (user) {
        // User is already logged in, redirect to lawyer registration
        import("../components/navigation.js").then((module) => {
          module.navigateTo("lawyer-register");
        });
      } else {
        // User needs to log in first, show signup modal with lawyer option selected
        document.getElementById("signup-btn").click();
        // Set a small timeout to ensure modal is loaded before selecting the lawyer option
        setTimeout(() => {
          const lawyerOption = document.querySelector(
            '.signup-type-btn[data-type="lawyer"]',
          );
          if (lawyerOption) lawyerOption.click();
        }, 300);
      }
    });
  }

  // Add event listener for the new Register as Lawyer button
  document
    .getElementById("lawyer-register-btn")
    .addEventListener("click", () => {
      const user = localStorage.getItem("user");
      if (user) {
        // User is already logged in, redirect to lawyer registration
        import("../components/navigation.js").then((module) => {
          module.navigateTo("lawyer-register");
        });
      } else {
        // User needs to log in first, show signup modal with lawyer option selected
        document.getElementById("signup-btn").click();
        // Set a small timeout to ensure modal is loaded before selecting the lawyer option
        setTimeout(() => {
          const lawyerOption = document.querySelector(
            '.signup-type-btn[data-type="lawyer"]',
          );
          if (lawyerOption) lawyerOption.click();
        }, 300);
      }
    });

  // Load lawyers from API
  loadLawyers();

  // Add search functionality
  document
    .getElementById("lawyer-search-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();

      // Get filter values
      const practiceArea = document.getElementById("practice-area").value;
      const location = document.getElementById("location").value;
      const serviceType = document.getElementById("service-type").value;

      // Apply filters
      loadLawyers({ practiceArea, location, serviceType });
    });

  // Check if we have never asked for location and should prompt
  if (
    geoPermission === null &&
    !document.querySelector(".geo-permission-prompt")
  ) {
    showLocationPermissionPrompt();
  }
}

// Function to request the user's location
function requestUserLocation() {
  const geoStatus = document.getElementById("geo-status");

  if (!navigator.geolocation) {
    geoStatus.textContent = "Geolocation is not supported by your browser";
    geoStatus.style.display = "block";
    return;
  }

  geoStatus.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Getting your location...';
  geoStatus.style.display = "block";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Save permission state
      localStorage.setItem("geoPermission", "granted");

      // Get and display city name
      fetchLocationDetails(position.coords.latitude, position.coords.longitude)
        .then((locationName) => {
          document.getElementById("location").value = locationName;
          geoStatus.innerHTML = `<div class="geo-enabled-indicator"><i class="fas fa-check-circle"></i> Using your location</div>`;

          // Trigger a search with the new location
          const practiceArea = document.getElementById("practice-area").value;
          const serviceType = document.getElementById("service-type").value;
          loadLawyers({ practiceArea, location: locationName, serviceType });
        })
        .catch((error) => {
          console.error("Error getting location name:", error);
          geoStatus.innerHTML = `<div class="geo-enabled-indicator"><i class="fas fa-check-circle"></i> Location detected</div>`;

          // Still trigger a search with coordinates
          const practiceArea = document.getElementById("practice-area").value;
          const serviceType = document.getElementById("service-type").value;
          loadLawyers({
            practiceArea,
            serviceType,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        });
    },
    (error) => {
      console.error("Geolocation error:", error);

      // Save denied permission state
      localStorage.setItem("geoPermission", "denied");

      switch (error.code) {
        case error.PERMISSION_DENIED:
          geoStatus.innerHTML =
            '<span style="color: var(--danger-color);"><i class="fas fa-times-circle"></i> Location access denied. Please enable in browser settings</span>';
          break;
        case error.POSITION_UNAVAILABLE:
          geoStatus.innerHTML =
            '<span style="color: var(--warning-color);"><i class="fas fa-exclamation-circle"></i> Location information unavailable</span>';
          break;
        case error.TIMEOUT:
          geoStatus.innerHTML =
            '<span style="color: var(--warning-color);"><i class="fas fa-exclamation-circle"></i> Request timed out</span>';
          break;
        default:
          geoStatus.innerHTML =
            '<span style="color: var(--warning-color);"><i class="fas fa-exclamation-circle"></i> Unknown error occurred</span>';
      }
    },
    { maximumAge: 60000, timeout: 10000, enableHighAccuracy: true },
  );
}

// Get city/location name from coordinates
async function fetchLocationDetails(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
    );

    if (!response.ok) {
      console.warn("Location API responded with status:", response.status);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    const data = await response.json();
    console.log("Location data received:", data);

    // Extract location details - typically city, state
    let locationName = "";

    if (data.address) {
      const parts = [];

      // Try to get the most relevant location name
      if (data.address.city) parts.push(data.address.city);
      else if (data.address.town) parts.push(data.address.town);
      else if (data.address.village) parts.push(data.address.village);
      else if (data.address.suburb) parts.push(data.address.suburb);
      else if (data.address.county) parts.push(data.address.county);

      // Add state information if available
      if (data.address.state) parts.push(data.address.state);

      locationName = parts.join(", ");
    }

    return locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.error("Error fetching location details:", error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

// Show permission prompt
function showLocationPermissionPrompt() {
  const prompt = document.createElement("div");
  prompt.className = "geo-permission-prompt";
  prompt.innerHTML = `
    <h3>Improve Your Lawyer Search</h3>
    <p>Allow LegalConnect to access your location to find lawyers near you.</p>
    <div class="geo-permission-actions">
      <button class="btn btn-outline" id="deny-location">Not Now</button>
      <button class="btn btn-primary" id="allow-location">Allow</button>
    </div>
  `;

  document.body.appendChild(prompt);

  // Add event listeners
  document.getElementById("allow-location").addEventListener("click", () => {
    requestUserLocation();
    document.body.removeChild(prompt);
  });

  document.getElementById("deny-location").addEventListener("click", () => {
    localStorage.setItem("geoPermission", "denied");
    document.body.removeChild(prompt);
  });
}

// Function to load lawyers from API
async function loadLawyers(filters = {}) {
  const resultsContainer = document.getElementById("search-results");

  try {
    // Show loading indicator
    resultsContainer.innerHTML =
      '<div class="loading-spinner">Loading lawyers...</div>';

    // Get lawyers from API
    const response = await lawyerService.getLawyers(filters);
    const lawyers = response?.data?.data ?? response?.data ?? [];

    if (!Array.isArray(lawyers) || lawyers.length === 0) {
      resultsContainer.innerHTML =
        '<div class="no-results">No lawyers found matching your criteria.</div>';
      return;
    }

    // Sort lawyers by proximity if we have user location
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      // First calculate and add distance to each lawyer who has coordinates
      lawyers.forEach((lawyer) => {
        if (lawyer.officeCoordinates) {
          lawyer.distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lawyer.officeCoordinates.latitude,
            lawyer.officeCoordinates.longitude,
          );
        } else {
          lawyer.distance = Infinity; // Lawyers without coordinates go to the end
        }
      });

      // Then sort by distance
      lawyers.sort(
        (a, b) => (a.distance || Infinity) - (b.distance || Infinity),
      );

      // Add a note to the top of the results if sorting by location
      resultsContainer.innerHTML = `
        <div class="location-sorting-notice">
          <i class="fas fa-map-marker-alt"></i> Showing lawyers sorted by distance from your location
        </div>
      `;
    }

    // Build HTML for each lawyer (safe array joins)
    const lawyersHTML = lawyers
      .map((lawyer) => {
        const practiceAreas = Array.isArray(lawyer.practiceAreas)
          ? lawyer.practiceAreas.join(", ")
          : "—";
        const serviceTypes = Array.isArray(lawyer.serviceTypes)
          ? lawyer.serviceTypes.join(", ")
          : "—";
        const languages = Array.isArray(lawyer.languages)
          ? lawyer.languages.join(", ")
          : "—";
        const location = lawyer.location || "Location not specified";
        const rating = lawyer.rating ?? 0;
        const reviewCount = lawyer.reviewCount ?? 0;
        const distanceHtml =
          userLocation && lawyer.officeCoordinates
            ? `
            <div class="lawyer-distance">
              <i class="fas fa-map-marker-alt"></i>
              ${
                lawyer.distance != null
                  ? lawyer.distance.toFixed(1)
                  : calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      lawyer.officeCoordinates.latitude,
                      lawyer.officeCoordinates.longitude,
                    ).toFixed(1)
              } km away
            </div>`
            : "";
        return `
      <div class="lawyer-card card" data-id="${lawyer.id}">
        <div class="lawyer-info">
          <img src="${lawyer.profileImage || "/lawyer.png"}" alt="${lawyer.name}" class="lawyer-photo" onerror="this.src='/lawyer.png'">
          <div class="lawyer-details">
            <h3>${lawyer.name}</h3>
            <p class="lawyer-specialties"><strong>Practice areas:</strong> ${practiceAreas}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Services:</strong> ${serviceTypes}</p>
            <p><strong>Languages:</strong> ${languages}</p>
            <div class="lawyer-rating">
              <span class="stars">${generateStars(rating)}</span>
              <span>${rating}/5 (${reviewCount} reviews)</span>
            </div>
            ${distanceHtml}
          </div>
        </div>
        <div class="lawyer-actions">
          <button class="btn btn-outline view-profile-btn">View Profile</button>
          <button class="btn btn-primary schedule-btn">Schedule Consultation</button>
        </div>
      </div>
    `;
      })
      .join("");

    // If we have the location notice, append to it, otherwise set as innerHTML
    if (resultsContainer.querySelector(".location-sorting-notice")) {
      resultsContainer.innerHTML += lawyersHTML;
    } else {
      resultsContainer.innerHTML = lawyersHTML;
    }

    // Add event listeners for lawyer actions
    document.querySelectorAll(".view-profile-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const lawyerId = this.closest(".lawyer-card").dataset.id;

        // Navigate to lawyer profile page with the lawyer ID
        navigateTo("lawyer-profile", { id: lawyerId });
      });
    });

    document.querySelectorAll(".schedule-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const lawyerId = this.closest(".lawyer-card").dataset.id;
        const lawyerName =
          this.closest(".lawyer-card").querySelector("h3").textContent;
        if (!localStorage.getItem("user")) {
          showToast("Please log in to request a consultation.", "info");
          document.getElementById("login-btn")?.click();
          return;
        }
        showSchedulingModal(lawyerName, lawyerId);
      });
    });
  } catch (error) {
    console.error("Error loading lawyers:", error);
    resultsContainer.innerHTML =
      '<div class="error-message">Failed to load lawyers. Please try again later.</div>';
  }
}

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999; // Return large number if coordinates missing

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Helper function to generate star rating HTML
function generateStars(rating) {
  let starsHTML = "";
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }

  // Add half star if needed
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half"></i>';
  }

  // Add empty stars
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }

  return starsHTML;
}

function showSchedulingModal(lawyerName, lawyerId) {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Schedule a Consultation with ${lawyerName}</h2>
      <p class="form-help">All times are in your local timezone (${Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
      <form id="scheduling-form">
        <div class="form-group">
          <label for="consultation-date">Date</label>
          <input type="date" id="consultation-date" required min="${
            new Date().toISOString().split("T")[0]
          }">
        </div>
        <div class="form-group">
          <label for="consultation-time">Time</label>
          <select id="consultation-time" required>
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
          <label for="consultation-type">Consultation Type</label>
          <select id="consultation-type" required>
            <option value="video">Video Call</option>
            <option value="phone">Phone Call</option>
            <option value="in-person">In Person</option>
          </select>
        </div>
        <div class="form-group">
          <label for="consultation-notes">Brief description of your legal issue</label>
          <textarea id="consultation-notes" rows="4"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Request Consultation</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

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

  // Handle form submit - create consultation via API
  document
    .getElementById("scheduling-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const dateEl = document.getElementById("consultation-date");
      const timeEl = document.getElementById("consultation-time");
      const typeEl = document.getElementById("consultation-type");
      const notesEl = document.getElementById("consultation-notes");
      const submitBtn = modal.querySelector('button[type="submit"]');
      const date = dateEl?.value;
      const time = timeEl?.value;
      const type = typeEl?.value;
      const notes = (notesEl?.value || "").trim();
      if (!date || !time || !type) {
        showToast("Please fill in date, time, and consultation type.", "error");
        return;
      }

      // Get user's timezone offset in minutes
      const timezoneOffset = new Date().getTimezoneOffset();

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      try {
        await lawyerService.scheduleConsultation(lawyerId, {
          date,
          time,
          type,
          notes: notes || undefined,
          timezoneOffset: -timezoneOffset, // Negate because getTimezoneOffset returns opposite sign
        });
        document.body.removeChild(modal);
        showToast(
          `Consultation request sent to ${lawyerName}. They will confirm or respond soon.`,
          "success",
        );
      } catch (err) {
        console.error("Schedule consultation error:", err);
        submitBtn.disabled = false;
        submitBtn.textContent = "Request Consultation";
        const msg =
          err.response?.status === 401
            ? "Please log in to request a consultation."
            : err.response?.data?.message ||
              "Failed to send request. Please try again.";
        showToast(msg, "error");
      }
    });
}
