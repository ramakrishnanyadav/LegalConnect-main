import { lawyerService } from "../services/api.js";
import { showToast } from "../utils/toast.js";

export function renderLawyerRegisterPage() {
  const mainContent = document.getElementById("main-content");

  // Check if auth error is present in URL and handle it
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("auth") === "error") {
    localStorage.removeItem("user");
    mainContent.innerHTML = `
      <section class="lawyer-register-page">
        <div class="card">
          <h2>Authentication Failed</h2>
          <p>Your session has expired or is invalid. Please log in again.</p>
          <button id="login-redirect" class="btn btn-primary">Go to Login</button>
        </div>
      </section>
    `;

    document.getElementById("login-redirect").addEventListener("click", () => {
      document.getElementById("login-btn").click();
    });
    return;
  }

  // Check if user is logged in
  const user = localStorage.getItem("user");
  if (!user) {
    mainContent.innerHTML = `
      <section class="lawyer-register-page">
        <div class="card">
          <h2>Authentication Required</h2>
          <p>You need to be logged in to register as a lawyer.</p>
          <button id="login-redirect" class="btn btn-primary">Go to Login</button>
        </div>
      </section>
    `;

    document.getElementById("login-redirect").addEventListener("click", () => {
      document.getElementById("login-btn").click();
    });

    return;
  }

  // Parse user data to check for existing profile image
  const userData = JSON.parse(user);
  const profileImageSrc = userData.profileImage || "/lawyer.png";

  mainContent.innerHTML = `
    <section class="lawyer-register-page">
      <h1 class="page-title">Register as a Lawyer</h1>
      <p class="page-description">Join our network of pro bono and affordable legal service providers.</p>
      
      <div class="card">
        <form id="lawyer-register-form">
          <!-- Profile Image Upload Section -->
          <div class="form-section">
            <h3>Profile Image</h3>
            <div class="profile-upload-container">
              <div class="profile-image-preview">
                <img id="profile-preview" src="${profileImageSrc}" alt="Profile preview">
              </div>
              <div class="upload-controls">
                <input type="file" id="profile-image" name="profileImage" accept="image/*" style="display: none;">
                <button type="button" id="upload-trigger" class="btn btn-outline">Choose Profile Picture</button>
                <p class="form-help">Maximum size: 2MB. Formats: JPG, PNG</p>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Professional Information</h3>
            
            <div class="form-group">
              <label>Practice Areas (select all that apply)</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Family Law"> Family Law
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Criminal Defense"> Criminal Defense
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Immigration"> Immigration
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Housing & Tenants Rights"> Housing & Tenants Rights
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Employment Law"> Employment Law
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Civil Rights"> Civil Rights
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Consumer Protection"> Consumer Protection
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="practiceAreas" value="Other"> Other
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Service Types (select all that apply)</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="serviceTypes" value="Pro Bono"> Pro Bono
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="serviceTypes" value="Low Cost"> Low Cost
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="serviceTypes" value="Sliding Scale"> Sliding Scale
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="serviceTypes" value="Standard Rates"> Standard Rates
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="bar-number">Bar Number (optional)</label>
              <input type="text" id="bar-number" name="barNumber">
            </div>
            
            <div class="form-group">
              <label for="bar-council">Bar Council</label>
              <select id="bar-council" name="barCouncil">
                <option value="">Select Bar Council</option>
                <option value="Bar Council of India">Bar Council of India</option>
                <option value="Bar Council of Delhi">Bar Council of Delhi</option>
                <option value="Bar Council of Maharashtra and Goa">Bar Council of Maharashtra and Goa</option>
                <option value="Bar Council of Tamil Nadu">Bar Council of Tamil Nadu</option>
                <option value="Bar Council of Uttar Pradesh">Bar Council of Uttar Pradesh</option>
                <option value="Bar Council of West Bengal">Bar Council of West Bengal</option>
                <option value="Bar Council of Rajasthan">Bar Council of Rajasthan</option>
                <option value="Bar Council of Kerala">Bar Council of Kerala</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Education</h3>
            <div id="education-fields">
              <div class="education-entry">
                <div class="form-group">
                  <label>Institution</label>
                  <input type="text" name="education[0].institution" list="law-institutions" required>
                  <datalist id="law-institutions">
                    <option value="National Law School of India University, Bangalore">
                    <option value="National Law University, Delhi">
                    <option value="NALSAR University of Law, Hyderabad">
                    <option value="The West Bengal National University of Juridical Sciences, Kolkata">
                    <option value="ILS Law College, Pune">
                    <option value="Faculty of Law, Delhi University">
                    <option value="Symbiosis Law School, Pune">
                    <option value="Government Law College, Mumbai">
                    <option value="Faculty of Law, Banaras Hindu University">
                  </datalist>
                </div>
                <div class="form-group">
                  <label>Degree</label>
                  <input type="text" name="education[0].degree" list="law-degrees" required>
                  <datalist id="law-degrees">
                    <option value="LL.B.">
                    <option value="B.A. LL.B.">
                    <option value="B.Com. LL.B.">
                    <option value="B.Sc. LL.B.">
                    <option value="B.B.A. LL.B.">
                    <option value="LL.M.">
                    <option value="LL.M. (Constitutional Law)">
                    <option value="LL.M. (Corporate Law)">
                    <option value="LL.M. (Criminal Law)">
                    <option value="LL.M. (Intellectual Property Law)">
                    <option value="LL.M. (International Law)">
                    <option value="Ph.D. in Law">
                  </datalist>
                </div>
                <div class="form-group">
                  <label>Graduation Year</label>
                  <input type="number" name="education[0].graduationYear" min="1950" max="2023" required>
                </div>
              </div>
            </div>
            <button type="button" id="add-education" class="btn btn-outline">+ Add Another Education</button>
          </div>
          
          <div class="form-section">
            <h3>Languages</h3>
            <div class="form-group">
              <label>Languages Spoken (select all that apply)</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="English" checked> English
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Hindi"> Hindi
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Bengali"> Bengali
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Telugu"> Telugu
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Marathi"> Marathi
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Tamil"> Tamil
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Gujarati"> Gujarati
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Kannada"> Kannada
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Malayalam"> Malayalam
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Punjabi"> Punjabi
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" name="languages" value="Other"> Other
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Office Address</h3>
            <div class="form-group">
              <label for="street">Street Address</label>
              <input type="text" id="street" name="officeAddress.street" required>
            </div>
            <div class="form-group">
              <label for="state">State</label>
              <select id="state" name="officeAddress.state" required>
                <option value="">Select State</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Bihar">Bihar</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Delhi">Delhi</option>
                <option value="Goa">Goa</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Kerala">Kerala</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Odisha">Odisha</option>
                <option value="Punjab">Punjab</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Tripura">Tripura</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="West Bengal">West Bengal</option>
              </select>
            </div>
            <div class="form-group">
              <label for="city">City</label>
              <input type="text" id="city" name="officeAddress.city" list="indian-cities" required>
              <datalist id="indian-cities">
                <!-- Cities will be loaded based on selected state -->
              </datalist>
            </div>
            <div class="form-group">
              <label for="zip">PIN Code</label>
              <input type="text" id="zip" name="officeAddress.zipCode" pattern="[0-9]{6}" maxlength="6" inputmode="numeric" required>
              <p class="form-help">6-digit PIN code (e.g., 110001)</p>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Consultation Fee</h3>
            <div class="form-group">
              <label for="consultation-fee">Initial Consultation Fee (₹)</label>
              <input type="number" id="consultation-fee" name="consultationFee" min="0" value="0">
              <p class="form-help">Enter 0 for free initial consultations</p>
            </div>
          </div>
          
          <div class="error-message" id="form-error" style="display: none;"></div>
          
          <button type="submit" class="btn btn-primary">Register as Lawyer</button>
        </form>
      </div>
    </section>
  `;

  // Image upload preview functionality
  const uploadTrigger = document.getElementById("upload-trigger");
  const profileImageInput = document.getElementById("profile-image");
  const profilePreview = document.getElementById("profile-preview");

  uploadTrigger.addEventListener("click", () => {
    profileImageInput.click();
  });

  profileImageInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showToast("File is too large. Maximum size is 2MB.", "error");
        e.target.value = ""; // Reset the input
        return;
      }

      // Check file type
      if (!file.type.match("image/(jpeg|jpg|png)")) {
        showToast("Only JPG and PNG files are allowed.", "error");
        e.target.value = ""; // Reset the input
        return;
      }

      // Preview the image
      const reader = new FileReader();
      reader.onload = function (event) {
        profilePreview.src = event.target.result;
        uploadTrigger.textContent = "Change Profile Picture";
      };
      reader.readAsDataURL(file);
    }
  });

  // Add education entry
  document.getElementById("add-education").addEventListener("click", () => {
    const educationFields = document.getElementById("education-fields");
    const entryCount =
      educationFields.querySelectorAll(".education-entry").length;

    const newEntry = document.createElement("div");
    newEntry.className = "education-entry";
    newEntry.innerHTML = `
      <hr>
      <div class="form-group">
        <label>Institution</label>
        <input type="text" name="education[${entryCount}].institution" list="law-institutions" required>
      </div>
      <div class="form-group">
        <label>Degree</label>
        <input type="text" name="education[${entryCount}].degree" list="law-degrees" required>
      </div>
      <div class="form-group">
        <label>Graduation Year</label>
        <input type="number" name="education[${entryCount}].graduationYear" min="1950" max="2023" required>
      </div>
      <button type="button" class="btn btn-sm btn-outline remove-education">Remove</button>
    `;

    educationFields.appendChild(newEntry);

    // Add remove button functionality
    newEntry
      .querySelector(".remove-education")
      .addEventListener("click", function () {
        this.parentElement.remove();
      });
  });

  // Load cities based on selected state
  document.getElementById("state").addEventListener("change", function () {
    const selectedState = this.value;
    const citiesDatalist = document.getElementById("indian-cities");
    const cityInput = document.getElementById("city");

    // Clear existing options and reset city input
    citiesDatalist.innerHTML = "";
    cityInput.value = "";

    if (selectedState) {
      // Get cities for the selected state
      const cities = getIndianCities(selectedState);

      // Add options to datalist
      cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        citiesDatalist.appendChild(option);
      });
    }
  });

  // Only allow numbers in PIN code input
  document.getElementById("zip").addEventListener("input", function (e) {
    this.value = this.value.replace(/[^0-9]/g, "").slice(0, 6);
  });

  // Form submission
  document
    .getElementById("lawyer-register-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const formError = document.getElementById("form-error");
        formError.style.display = "none";

        // Collect practice areas
        const practiceAreas = Array.from(
          document.querySelectorAll('input[name="practiceAreas"]:checked'),
        ).map((el) => el.value);

        // Collect service types
        const serviceTypes = Array.from(
          document.querySelectorAll('input[name="serviceTypes"]:checked'),
        ).map((el) => el.value);

        // Collect languages
        const languages = Array.from(
          document.querySelectorAll('input[name="languages"]:checked'),
        ).map((el) => el.value);

        // Validate required fields
        if (practiceAreas.length === 0) {
          formError.textContent = "Please select at least one practice area";
          formError.style.display = "block";
          return;
        }

        if (serviceTypes.length === 0) {
          formError.textContent = "Please select at least one service type";
          formError.style.display = "block";
          return;
        }

        if (languages.length === 0) {
          formError.textContent = "Please select at least one language";
          formError.style.display = "block";
          return;
        }

        // Validate education fields
        const educationEntries = document.querySelectorAll(".education-entry");
        for (const entry of educationEntries) {
          const institution = entry.querySelector(
            'input[name$=".institution"]',
          ).value;
          const degree = entry.querySelector('input[name$=".degree"]').value;
          const gradYear = entry.querySelector(
            'input[name$=".graduationYear"]',
          ).value;

          if (!institution || !degree || !gradYear) {
            formError.textContent = "Please complete all education fields";
            formError.style.display = "block";
            return;
          }
        }

        // Validate office address
        const street = document.getElementById("street").value;
        const city = document.getElementById("city").value;
        const state = document.getElementById("state").value;
        const zipCode = document.getElementById("zip").value;

        if (!street || !city || !state || !zipCode) {
          formError.textContent = "Please complete all office address fields";
          formError.style.display = "block";
          return;
        }

        // Build education array
        const education = Array.from(educationEntries).map((entry, index) => {
          return {
            institution: document.querySelector(
              `input[name="education[${index}].institution"]`,
            ).value,
            degree: document.querySelector(
              `input[name="education[${index}].degree"]`,
            ).value,
            graduationYear: parseInt(
              document.querySelector(
                `input[name="education[${index}].graduationYear"]`,
              ).value,
            ),
          };
        });

        // Build office address object
        const officeAddress = {
          street,
          city,
          state,
          zipCode,
        };

        // Get consultation fee
        const consultationFee =
          parseFloat(document.getElementById("consultation-fee").value) || 0;

        // Get bar council
        const barCouncil = document.getElementById("bar-council").value;

        // Create form data for file upload
        const formData = new FormData();

        // Add image file if selected
        const profileImageInput = document.getElementById("profile-image");
        if (profileImageInput.files.length > 0) {
          formData.append("profileImage", profileImageInput.files[0]);
        }

        // Show loading indicator
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Creating profile...";

        // First upload the image if there is one
        let profileImageUrl = null;
        if (profileImageInput.files.length > 0) {
          try {
            const uploadResponse =
              await lawyerService.uploadProfileImage(formData);
            if (uploadResponse.data && uploadResponse.data.success) {
              profileImageUrl =
                uploadResponse.data.url ||
                uploadResponse.data.data.profileImage;
              console.log("Profile image uploaded:", profileImageUrl);
            } else {
              throw new Error(
                uploadResponse.data?.message || "Image upload failed",
              );
            }
          } catch (error) {
            console.error("Image upload error:", error);
            formError.textContent =
              "Failed to upload profile image. Please try again.";
            formError.style.display = "block";
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
          }
        }

        // Prepare data for API
        const lawyerData = {
          practiceAreas,
          serviceTypes,
          barNumber: document.getElementById("bar-number").value || undefined,
          barCouncil: barCouncil || undefined,
          languages,
          education,
          officeAddress,
          consultationFee,
          profileImage: profileImageUrl,
        };

        console.log("Creating lawyer profile with data:", lawyerData);

        // Submit data
        console.log("Sending lawyer registration data to server...");
        const response = await lawyerService.createLawyer(lawyerData);
        console.log("Server response:", response.data);

        if (response.data.success) {
          // Update local storage with updated user role
          const userData = JSON.parse(localStorage.getItem("user"));
          userData.role = "lawyer";
          if (profileImageUrl) {
            userData.profileImage = profileImageUrl;
          }
          localStorage.setItem("user", JSON.stringify(userData));

          showToast(
            "Your lawyer profile has been created successfully!",
            "success",
          );

          // Redirect to lawyers page
          document.querySelector('a[data-page="lawyers"]').click();
        } else {
          formError.textContent = response.data.message || "An error occurred";
          formError.style.display = "block";
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      } catch (error) {
        console.error("Lawyer registration error:", error);

        // Check specifically for auth errors
        if (error.response?.status === 401) {
          document.getElementById("form-error").textContent =
            "Authentication failed. Please log in again.";
          document.getElementById("form-error").style.display = "block";

          // Re-enable the submit button but prepare to redirect
          const submitBtn = document.querySelector('button[type="submit"]');
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Register as Lawyer";

          // After a short delay, redirect to login
          setTimeout(() => {
            localStorage.removeItem("user");
            document.getElementById("login-btn").click();
          }, 3000);
          return;
        }

        const errorMessage =
          error.response?.data?.message ||
          "Registration failed. Please try again.";

        const formError = document.getElementById("form-error");
        formError.textContent = errorMessage;
        formError.style.display = "block";

        // Re-enable the submit button
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Register as Lawyer";
      }
    });
}

// Helper function to get cities for a given state in India
function getIndianCities(state) {
  const citiesByState = {
    "Andhra Pradesh": [
      "Visakhapatnam",
      "Vijayawada",
      "Guntur",
      "Nellore",
      "Kurnool",
      "Rajahmundry",
      "Tirupati",
    ],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
    Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia"],
    Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Arrah"],
    Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Raigarh"],
    Delhi: ["New Delhi", "Delhi", "Noida", "Gurgaon", "Faridabad", "Ghaziabad"],
    Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
    Gujarat: [
      "Ahmedabad",
      "Surat",
      "Vadodara",
      "Rajkot",
      "Bhavnagar",
      "Jamnagar",
    ],
    Haryana: [
      "Chandigarh",
      "Faridabad",
      "Gurgaon",
      "Panipat",
      "Ambala",
      "Rohtak",
    ],
    "Himachal Pradesh": [
      "Shimla",
      "Dharamshala",
      "Mandi",
      "Solan",
      "Kullu",
      "Manali",
    ],
    Jharkhand: [
      "Ranchi",
      "Jamshedpur",
      "Dhanbad",
      "Bokaro",
      "Hazaribagh",
      "Deoghar",
    ],
    Karnataka: [
      "Bengaluru",
      "Mysore",
      "Hubli",
      "Mangalore",
      "Belgaum",
      "Gulbarga",
    ],
    Kerala: [
      "Thiruvananthapuram",
      "Kochi",
      "Kozhikode",
      "Thrissur",
      "Kollam",
      "Palakkad",
    ],
    "Madhya Pradesh": [
      "Bhopal",
      "Indore",
      "Jabalpur",
      "Gwalior",
      "Ujjain",
      "Sagar",
    ],
    Maharashtra: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
    Manipur: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul"],
    Meghalaya: ["Shillong", "Tura", "Jowai", "Nongpoh", "Williamnagar"],
    Mizoram: ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib"],
    Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
    Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
    Punjab: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
    Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"],
    Sikkim: ["Gangtok", "Namchi", "Pelling", "Ravangla", "Lachung"],
    "Tamil Nadu": [
      "Chennai",
      "Coimbatore",
      "Madurai",
      "Tiruchirappalli",
      "Salem",
      "Tirunelveli",
    ],
    Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Belonia"],
    "Uttar Pradesh": [
      "Lucknow",
      "Kanpur",
      "Ghaziabad",
      "Agra",
      "Varanasi",
      "Meerut",
    ],
    Uttarakhand: ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur"],
    "West Bengal": [
      "Kolkata",
      "Howrah",
      "Durgapur",
      "Asansol",
      "Siliguri",
      "Darjeeling",
    ],
  };

  return citiesByState[state] || [];
}
