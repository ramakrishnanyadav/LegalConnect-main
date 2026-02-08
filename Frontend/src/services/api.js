import axios from "axios";
import { getCurrentLanguage } from "../utils/translations.js";

// Backend base URL must end with /api so routes like /users/login become /api/users/login
function normalizeApiBaseUrl(url) {
  if (!url) return url;
  const base = url.replace(/\/+$/, ""); // strip trailing slashes
  return base.endsWith("/api") ? base : `${base}/api`;
}

const API_URL =
  normalizeApiBaseUrl(import.meta.env.VITE_APP_Backend_BaseUrl) ||
  (import.meta.env.PROD
    ? "https://legal-connect-main-backend.vercel.app/api"
    : "http://localhost:5000/api");

/** Backend origin (no /api) for resolving relative asset URLs (e.g. profile images). */
const BACKEND_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/**
 * Returns a display URL for a profile image. Handles absolute URLs, relative paths, and fallback.
 * Use for header and profile page so images load when backend returns relative paths (e.g. /uploads/...).
 */
export function getProfileImageUrl(profileImage) {
  const fallback = "/lawyer.png";
  if (!profileImage || profileImage === "default-profile.png") return fallback;
  if (
    profileImage.startsWith("http://") ||
    profileImage.startsWith("https://")
  ) {
    return profileImage;
  }
  const path = profileImage.startsWith("/") ? profileImage : `/${profileImage}`;
  return `${BACKEND_ORIGIN}${path}`;
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": getCurrentLanguage() || "en",
  },
});

// Add request interceptor to include auth token and current language
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const { token } = JSON.parse(user);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        // Clear invalid data
        localStorage.removeItem("user");
      }
    }
    // Always use the current language - only en or hi now
    const currentLang = getCurrentLanguage();
    config.headers["Accept-Language"] = currentLang;
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("API Error:", error.response?.status, error.response?.data);

    // Check for auth errors (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      console.error("Authentication error:", error.response.data);

      // If token verification failed, clear localStorage and redirect
      if (
        error.response.data.message &&
        (error.response.data.message.includes("token") ||
          error.response.data.message.includes("signature") ||
          error.response.data.message.includes("authorized"))
      ) {
        console.log("Clearing invalid authentication data");
        localStorage.removeItem("user");

        // Check if we're already on the home page to avoid infinite redirect
        if (
          window.location.pathname !== "/" &&
          !window.location.search.includes("auth=error")
        ) {
          // Add auth=error parameter to signal authentication error
          window.location.href = "/?auth=error";
        }
      }
    }
    return Promise.reject(error);
  },
);

// User API services
export const userService = {
  register: (userData) => api.post("/users/register", userData),
  login: (email, password) => api.post("/users/login", { email, password }),
  getProfile: () => api.get("/users/profile"),
  updateProfile: (userData) => api.put("/users/profile", userData),
  uploadProfileImage: async (formData) => {
    try {
      return await api.post("/users/profile/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Important for file uploads
        },
      });
    } catch (error) {
      console.error("API Error - uploadProfileImage:", error);
      throw error;
    }
  },
  // Get user profile details
  getUserProfile: () => {
    return api.get("/users/profile");
  },

  // Update user profile details
  updateUserProfile: (userData) => {
    return api.put("/users/profile", userData);
  },

  // Upload profile image
  uploadProfileImage: async (formData) => {
    try {
      return await api.post("/users/profile/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (error) {
      console.error("API Error - uploadProfileImage:", error);
      throw error;
    }
  },

  // Get user consultations
  getUserConsultations: () => {
    return api.get("/users/consultations");
  },
  getConsultationUnreadCount: () =>
    api.get("/users/consultations/unread-count"),
  markConsultationsRead: () => api.post("/users/consultations/mark-read"),
  cancelConsultation: (consultationId) =>
    api.put(`/consultations/${consultationId}/cancel`),
  rescheduleConsultation: (consultationId, rescheduleData) =>
    api.put(`/consultations/${consultationId}/reschedule`, rescheduleData),

  // Change password
  changePassword: (passwordData) => {
    return api.put("/users/change-password", passwordData);
  },

  // Change email
  changeEmail: (emailData) => {
    return api.put("/users/change-email", emailData);
  },
};

// Lawyer API services
export const lawyerService = {
  getLawyers: async (filters = {}) => {
    try {
      const queryParams = [];

      if (filters.practiceArea) {
        queryParams.push(
          `practiceArea=${encodeURIComponent(filters.practiceArea)}`,
        );
      }

      if (filters.location) {
        queryParams.push(`location=${encodeURIComponent(filters.location)}`);
      }

      if (filters.serviceType) {
        queryParams.push(
          `serviceType=${encodeURIComponent(filters.serviceType)}`,
        );
      }

      if (filters.language) {
        queryParams.push(`language=${encodeURIComponent(filters.language)}`);
      }

      // Add location coordinates if available
      if (filters.latitude && filters.longitude) {
        queryParams.push(`latitude=${filters.latitude}`);
        queryParams.push(`longitude=${filters.longitude}`);
      }

      const queryString =
        queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      return await api.get(`/lawyers${queryString}`);
    } catch (error) {
      console.error("Error fetching lawyers:", error);
      throw error;
    }
  },
  getLawyerById: (id) => api.get(`/lawyers/${id}`),
  getMyLawyerProfile: () => api.get("/lawyers/me"),
  createLawyer: (lawyerData) => {
    console.log("Creating lawyer profile with data:", lawyerData);
    return api.post("/lawyers", lawyerData);
  },
  uploadProfileImage: async (formData) => {
    try {
      return await api.post("/lawyers/upload-profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (error) {
      console.error("API Error - uploadProfileImage:", error);
      throw error;
    }
  },
  updateLawyer: (lawyerId, lawyerData) => {
    console.log("Updating lawyer profile with data:", lawyerData);
    return api.put(`/lawyers/${lawyerId}`, lawyerData);
  },
  scheduleConsultation: (lawyerId, consultationData) =>
    api.post(`/lawyers/${lawyerId}/consultations`, consultationData),
  getLawyerReviews: (lawyerId) => api.get(`/lawyers/${lawyerId}/reviews`),
  addReview: (lawyerId, reviewData) =>
    api.post(`/lawyers/${lawyerId}/reviews`, reviewData),
  // New consultation management endpoints
  getConsultations: (lawyerId) => api.get(`/lawyers/${lawyerId}/consultations`),
  updateConsultation: (consultationId, updateData) =>
    api.put(`/consultations/${consultationId}`, updateData),
  cancelConsultation: (consultationId) =>
    api.put(`/consultations/${consultationId}/cancel`),
  rescheduleConsultation: (consultationId, rescheduleData) =>
    api.put(`/consultations/${consultationId}/reschedule`, rescheduleData),
};

// Resource API services
export const resourceService = {
  getResources: (filters) => api.get("/resources", { params: filters }),
  getResourceById: (id) => api.get(`/resources/${id}`),
  getResourceCategories: () => api.get("/resources/categories"),
  getApiUrl: () => API_URL,
};

// Community API services
export const communityService = {
  getTopics: (filters) => api.get("/community/topics", { params: filters }),
  getTopicById: (id) => api.get(`/community/topics/${id}`),
  createTopic: (topicData) => api.post("/community/topics", topicData),
  addReply: (topicId, replyData) =>
    api.post(`/community/topics/${topicId}/replies`, replyData),
  upvoteTopic: (topicId) => api.put(`/community/topics/${topicId}/upvote`),
  downvoteTopic: (topicId) => api.put(`/community/topics/${topicId}/downvote`),
  getCategories: () => api.get("/community/categories"),
  voteReply: (topicId, replyId, direction) =>
    api.put(
      `/community/topics/${topicId}/replies/${replyId}/${
        direction === "up" ? "upvote" : "downvote"
      }`,
    ),
  saveTopic: (topicId) => api.post(`/community/topics/${topicId}/save`),
  unsaveTopic: (topicId) => api.delete(`/community/topics/${topicId}/save`),
  reportTopic: (topicId) => api.post(`/community/topics/${topicId}/report`),
  reportReply: (topicId, replyId) =>
    api.post(`/community/topics/${topicId}/replies/${replyId}/report`),
  getSavedTopics: () => api.get("/community/saved"),
  getMyPostedTopics: () => api.get("/community/my-topics"),
  getMyCommentedTopics: () => api.get("/community/my-comments"),
};

// Admin API services
export const adminService = {
  getDashboard: () => api.get("/admin/dashboard"),
  getUsers: () => api.get("/admin/users"),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getTopics: () => api.get("/admin/topics"),
  deleteTopic: (id) => api.delete(`/admin/topics/${id}`),
  deleteReply: (topicId, replyId) =>
    api.delete(`/admin/topics/${topicId}/replies/${replyId}`),
  getLawyers: () => api.get("/admin/lawyers"),
  deleteLawyer: (id) => api.delete(`/admin/lawyers/${id}`),
  getResources: () => api.get("/admin/resources"),
  createResource: (formData) =>
    api.post("/admin/resources", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteResource: (id) => api.delete(`/admin/resources/${id}`),
  getConsultations: () => api.get("/admin/consultations"),
  deleteConsultation: (id) => api.delete(`/admin/consultations/${id}`),
};

// AI Assistant API services
export const aiService = {
  askQuestion: (question) => api.post("/ai/ask", { question }),
  getFAQs: () => api.get("/ai/faq"),
};

// Payment API services
export const paymentService = {
  createOrder: (consultationId) =>
    api.post("/payments/create-order", { consultationId }),
  verifyPayment: (paymentData) => api.post("/payments/verify", paymentData),
  getPaymentDetails: (consultationId) =>
    api.get(`/payments/consultation/${consultationId}`),
};

export default api;
