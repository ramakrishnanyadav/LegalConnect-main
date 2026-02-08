// Import the community service, admin service, and WebSocket service
import { communityService, adminService } from "../services/api.js";
import { communityWebSocket } from "../services/websocket.js";
import { showToast, showConfirm } from "../utils/toast.js";

export function renderCommunityPage(initialTopicId = null) {
  const mainContent = document.getElementById("main-content");

  mainContent.innerHTML = `
    <section class="community-page">
      <h1 class="page-title">Community Forums</h1>
      <p class="page-description">Join discussions, share experiences, and learn from others facing similar legal issues.</p>
      
      <div class="forum-actions">
        <button id="new-topic-btn" class="btn btn-primary"><i class="fas fa-plus"></i> New Topic</button>
        <button id="saved-tab-btn" class="btn btn-outline" title="View saved topics"><i class="fas fa-bookmark"></i> Saved</button>
        <div class="search-container">
          <input type="text" id="forum-search" placeholder="Search forums...">
          <button class="btn btn-outline"><i class="fas fa-search"></i></button>
        </div>
      </div>
      
      <div class="forum-categories card" id="forum-categories">
        <h2>Forum Categories</h2>
        <div class="category-list"></div>
      </div>
      
      <div class="topics-container" id="topics-container">
        <div class="topics-header">
          <h2>Community Discussions</h2>
          <button id="create-topic-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Create New Topic</button>
        </div>
        
        <div class="topics-list" id="topics-list">
          <div class="loading-spinner">Loading discussions...</div>
        </div>
        
        <div class="topics-pagination">
          <button id="prev-page-btn" class="btn btn-outline" disabled><i class="fas fa-chevron-left"></i> Previous</button>
          <span id="page-indicator">Page 1</span>
          <button id="next-page-btn" class="btn btn-outline">Next <i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
    </section>
  `;

  // Add event listener for new topic buttons (both at the top and in the topics container)
  document.getElementById("new-topic-btn").addEventListener("click", () => {
    showNewTopicModal();
  });

  document.getElementById("create-topic-btn").addEventListener("click", () => {
    showNewTopicModal();
  });

  // Saved tab: toggle between All and Saved view
  let isSavedView = false;
  document.getElementById("saved-tab-btn").addEventListener("click", () => {
    if (isSavedView) {
      // Switch back to All
      isSavedView = false;
      document.getElementById("saved-tab-btn").classList.remove("active");
      const categoriesEl = document.getElementById("forum-categories");
      if (categoriesEl) categoriesEl.style.display = "";
      document.querySelector(".topics-header h2").textContent =
        "Community Discussions";
      loadTopics(1);
    } else {
      // Switch to Saved
      const user = localStorage.getItem("user");
      if (!user) {
        showToast("Please log in to view saved topics");
        return;
      }
      isSavedView = true;
      document.getElementById("saved-tab-btn").classList.add("active");
      const categoriesEl = document.getElementById("forum-categories");
      if (categoriesEl) categoriesEl.style.display = "none";
      document.querySelector(".topics-header h2").textContent = "Saved Topics";
      loadSavedTopics();
    }
  });

  // Add search functionality
  const searchInput = document.getElementById("forum-search");
  const searchButton = searchInput.nextElementSibling;

  searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
      filterTopicsBySearch(searchTerm);
    }
  });

  // Handle search on Enter key
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        filterTopicsBySearch(searchTerm);
      }
    }
  });

  // Add pagination event listeners
  document.getElementById("prev-page-btn").addEventListener("click", () => {
    navigateToPage("prev");
  });

  document.getElementById("next-page-btn").addEventListener("click", () => {
    navigateToPage("next");
  });

  // Connect to WebSocket server
  communityWebSocket.connectWebSocket();

  // Setup WebSocket event listeners for topic list page
  communityWebSocket.setupTopicListeners({
    onNewTopic: (newTopic) => {
      // Add the new topic to the top of the list
      const topicsList = document.getElementById("topics-list");
      if (topicsList && !topicsList.querySelector(".error-message")) {
        // If we have topics list and it's not showing an error
        const firstTopic = topicsList.firstChild;
        const topicElement = createTopicElement(newTopic);

        if (firstTopic) {
          topicsList.insertBefore(topicElement, firstTopic);
        } else {
          // If list was empty
          topicsList.innerHTML = "";
          topicsList.appendChild(topicElement);
        }

        // Add event listeners to the new topic
        addTopicEventListeners(topicElement, newTopic.id);
      }
    },
    onTopicVoteUpdate: (data) => {
      // Update vote count for a topic
      const topicElement = document.querySelector(
        `.topic-card[data-id="${data.topicId}"]`,
      );
      if (topicElement) {
        const voteScoreElement = topicElement.querySelector(".vote-score");
        if (voteScoreElement) {
          const previousValue = parseInt(voteScoreElement.textContent) || 0;
          voteScoreElement.textContent = data.voteScore;

          // Apply vote animation
          voteScoreElement.classList.add(
            data.voteScore > previousValue ? "vote-up" : "vote-down",
          );
          setTimeout(() => {
            voteScoreElement.classList.remove("vote-up", "vote-down");
          }, 1000);
        }
      }
    },
  });

  // In production, poll for updates every 30 seconds as WebSocket fallback
  let pollInterval = null;
  if (import.meta.env.PROD) {
    pollInterval = setInterval(() => {
      loadTopics(getCurrentPage());
    }, 30000); // Poll every 30 seconds
  }

  // Load initial topics and categories from API
  loadTopics();
  loadCategories();

  // If a specific topic ID was provided (e.g., from a shared link), open it
  if (initialTopicId) {
    viewTopic(initialTopicId);
  }

  // Clean up WebSocket event listeners and polling when leaving the page
  return () => {
    communityWebSocket.cleanupTopicListeners();
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}

// Helper function to get current page
function getCurrentPage() {
  const pageIndicator = document.getElementById("page-indicator");
  if (!pageIndicator) return 1;

  const pageText = pageIndicator.textContent || "";
  const match = pageText.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

// Load categories from API
async function loadCategories() {
  try {
    const response = await communityService.getCategories();
    const categories = response.data.data;

    const categoryList = document.querySelector(".category-list");
    if (categories && categories.length > 0) {
      categoryList.innerHTML = categories
        .map(
          (category) => `
        <div class="category-item" data-category="${category.name}">
          <div class="category-icon"><i class="fas ${category.icon}"></i></div>
          <div class="category-info">
            <h3>${category.name}</h3>
            <p>Discussions about ${
              category.description || category.name.toLowerCase()
            }</p>
          </div>
          <div class="category-stats">
            <div><strong>${category.topics}</strong> topics</div>
            <div><strong>${category.posts}</strong> posts</div>
          </div>
        </div>
      `,
        )
        .join("");

      // Add event listeners for forum categories
      document.querySelectorAll(".category-item").forEach((item) => {
        item.addEventListener("click", () => {
          const categoryName = item.dataset.category;
          loadTopicsByCategory(categoryName);
        });
      });
    }
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

// Load topics from API
async function loadTopics(page = 1, category = null, search = null) {
  const topicsList = document.getElementById("topics-list");

  try {
    topicsList.innerHTML =
      '<div class="loading-spinner">Loading discussions...</div>';

    // Prepare query parameters
    const params = { page };
    if (category) params.category = category;
    if (search) params.search = search;

    // Fetch topics from API
    const response = await communityService.getTopics(params);
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || "Failed to load topics");
    }

    const topics = data.data || [];

    renderTopics(topics);

    // Update pagination controls
    document.getElementById("page-indicator").textContent = `Page ${page}`;
    document.getElementById("prev-page-btn").disabled = page <= 1;
    document.getElementById("next-page-btn").disabled = topics.length < 10; // Assuming 10 per page or check data.hasMore
  } catch (error) {
    console.error("Error loading topics:", error);
    topicsList.innerHTML =
      '<div class="error-message">Failed to load discussions. Please try again later.</div>';
  }
}

// Load saved topics from API (requires login)
async function loadSavedTopics() {
  const topicsList = document.getElementById("topics-list");
  if (!topicsList) return;

  try {
    topicsList.innerHTML =
      '<div class="loading-spinner">Loading saved topics...</div>';

    const response = await communityService.getSavedTopics();
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || "Failed to load saved topics");
    }

    const topics = data.data || [];
    renderTopics(topics);

    document.getElementById("page-indicator").textContent = "Saved";
    document.getElementById("prev-page-btn").disabled = true;
    document.getElementById("next-page-btn").disabled = true;
  } catch (error) {
    console.error("Error loading saved topics:", error);
    const msg =
      error.response?.status === 401
        ? "Please log in to view saved topics."
        : "Failed to load saved topics. Please try again later.";
    topicsList.innerHTML = `<div class="error-message">${msg}</div>`;
  }
}

// Render topics to the DOM
function renderTopics(topics) {
  const topicsList = document.getElementById("topics-list");

  if (!topics || topics.length === 0) {
    topicsList.innerHTML =
      '<div class="no-topics">No discussions found. Be the first to start a conversation!</div>';
    return;
  }

  topicsList.innerHTML = topics
    .map(
      (topic) => `
    <div class="topic-card" data-id="${topic.id}">
      <div class="topic-vote">
        <button class="vote-up-btn" title="Upvote"><i class="fas fa-chevron-up"></i></button>
        <div class="vote-score">${topic.voteScore}</div>
        <button class="vote-down-btn" title="Downvote"><i class="fas fa-chevron-down"></i></button>
      </div>
      
      <div class="topic-content">
        <div class="topic-header">
          <h3 class="topic-title">${topic.title}</h3>
          <span class="topic-category">${topic.category}</span>
        </div>
        
        <div class="topic-preview">
          ${truncateText(topic.content, 150)}
        </div>
        
        <div class="topic-meta">
          <div class="topic-stats">
            <span><i class="fas fa-comment"></i> ${typeof topic.replies === "number" ? topic.replies : (topic.replies?.length ?? 0)} replies</span>
            <span><i class="fas fa-eye"></i> ${topic.views} views</span>
            <span><i class="fas fa-clock"></i> ${formatTimeAgo(
              topic.createdAt,
            )}</span>
          </div>
          
          <div class="topic-author">
            <img src="${topic.user.profileImage || "/lawyer.png"}" alt="${
              topic.user.name || "Anonymous User"
            }" class="author-image" onerror="this.src='/lawyer.png'">
            <span>${topic.user.name || "Anonymous User"}</span>
          </div>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  // Add event listeners for topic cards
  document.querySelectorAll(".topic-card").forEach((card) => {
    const topicId = card.dataset.id;
    addTopicEventListeners(card, topicId);
  });
}

// Helper function to add event listeners to a topic element
function addTopicEventListeners(topicElement, topicId) {
  topicElement.addEventListener("click", (e) => {
    // Ignore clicks on vote buttons
    if (
      e.target.closest(".vote-up-btn") ||
      e.target.closest(".vote-down-btn")
    ) {
      return;
    }
    viewTopic(topicId);
  });

  // Add vote button functionality
  const upvoteBtn = topicElement.querySelector(".vote-up-btn");
  if (upvoteBtn) {
    upvoteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      voteTopic(topicId, "up");
    });
  }

  const downvoteBtn = topicElement.querySelector(".vote-down-btn");
  if (downvoteBtn) {
    downvoteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      voteTopic(topicId, "down");
    });
  }
}

// Filter topics by category
function loadTopicsByCategory(category) {
  const topicsList = document.getElementById("topics-list");
  topicsList.innerHTML =
    '<div class="loading-spinner">Loading discussions...</div>';

  // Update heading to show selected category
  document.querySelector(".topics-header h2").textContent =
    `${category} Discussions`;

  // Load topics for the selected category
  loadTopics(1, category);
}

// Filter topics by search term
function filterTopicsBySearch(searchTerm) {
  const topicsList = document.getElementById("topics-list");
  topicsList.innerHTML =
    '<div class="loading-spinner">Searching discussions...</div>';

  // Update heading to show search query
  document.querySelector(".topics-header h2").textContent =
    `Search Results: "${searchTerm}"`;

  // Load topics with search filter
  loadTopics(1, null, searchTerm);
}

// Navigate between pages
function navigateToPage(direction) {
  const pageIndicator = document.getElementById("page-indicator");
  const currentPage = parseInt(pageIndicator.textContent.split(" ")[1]);

  if (direction === "prev" && currentPage > 1) {
    loadTopics(currentPage - 1);
  } else if (direction === "next") {
    loadTopics(currentPage + 1);
  }
}

// View a specific topic with comments
async function viewTopic(topicId) {
  const mainContent = document.getElementById("main-content");

  // Update URL/hash so this exact topic view can be shared or reopened
  const hash = `#community/topic/${topicId}`;
  const state = { page: "community", params: { topicId } };
  if (window.location.hash !== hash) {
    history.pushState(state, "", hash);
  } else {
    history.replaceState(state, "", hash);
  }

  mainContent.innerHTML = `
    <section class="community-page topic-detail-page">
      <div class="topic-navigation">
        <button id="back-to-topics" class="btn btn-outline"><i class="fas fa-arrow-left"></i> Back to Discussions</button>
      </div>
      
      <div class="topic-detail-container" id="topic-detail">
        <div class="loading-spinner">Loading topic...</div>
      </div>
      
      <div class="comments-container" id="comments-container">
        <h3>Comments</h3>
        <div id="comments-list" class="comments-list">
          <div class="loading-spinner">Loading comments...</div>
        </div>
        
        <form id="comment-form" class="comment-form">
          <h4>Add a Comment</h4>
          <textarea id="comment-content" placeholder="Share your thoughts or advice..." required></textarea>
          <div class="comment-actions">
            <label class="checkbox-label">
              <input type="checkbox" id="comment-anonymous"> Post anonymously
            </label>
            <button type="submit" class="btn btn-primary">Post Comment</button>
          </div>
        </form>
      </div>
    </section>
  `;

  // Add event listener for back button
  document.getElementById("back-to-topics").addEventListener("click", () => {
    if (window.communityCleanup) {
      window.communityCleanup();
      window.communityCleanup = null;
    }
    renderCommunityPage();
  });

  try {
    // Load topic details and comments in parallel
    await Promise.all([loadTopicDetail(topicId), loadComments(topicId)]);

    // Setup WebSocket listeners for this topic
    const cleanupListeners = communityWebSocket.setupTopicDetailListeners(
      topicId,
      {
        onNewReply: (data) => {
          try {
            // Reload comments to show the new reply
            loadComments(topicId);
          } catch (err) {
            console.error("Error handling new reply event:", err);
          }
        },
        onReplyVoteUpdate: (data) => {
          try {
            // Update the vote score for the reply
            const replyElement = document.querySelector(
              `.comment[data-id="${data.replyId}"]`,
            );
            if (replyElement) {
              const voteScoreElement =
                replyElement.querySelector(".vote-score");
              if (voteScoreElement) {
                const previousValue =
                  parseInt(voteScoreElement.textContent) || 0;
                voteScoreElement.textContent = data.voteScore;

                // Apply vote animation
                voteScoreElement.classList.add(
                  data.voteScore > previousValue ? "vote-up" : "vote-down",
                );
                setTimeout(() => {
                  voteScoreElement.classList.remove("vote-up", "vote-down");
                }, 1000);
              }
            }
          } catch (err) {
            console.error("Error handling reply vote update event:", err);
          }
        },
      },
    );

    // In production, poll for updates every 30 seconds as WebSocket fallback
    let topicPollInterval = null;
    if (import.meta.env.PROD) {
      topicPollInterval = setInterval(() => {
        loadComments(topicId);
      }, 30000); // Poll every 30 seconds
    }

    // Store cleanup function to call when leaving the topic view
    window.communityCleanup = () => {
      cleanupListeners();
      if (topicPollInterval) {
        clearInterval(topicPollInterval);
      }
    };
  } catch (error) {
    console.error("Error loading topic:", error);
    document.getElementById("topic-detail").innerHTML =
      '<div class="error-message">Failed to load topic details. Please try again later.</div>';
  }

  // Set up comment form
  const commentForm = document.getElementById("comment-form");
  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      showToast("Please log in to comment on discussions.", "info");
      return;
    }

    const commentContent = document
      .getElementById("comment-content")
      .value.trim();
    const isAnonymous = document.getElementById("comment-anonymous").checked;

    if (commentContent) {
      try {
        await submitComment(topicId, commentContent, isAnonymous);
        // Reload comments after successful submission
        loadComments(topicId);
      } catch (error) {
        console.error("Error submitting comment:", error);
        showToast("Failed to submit your comment. Please try again.", "error");
      }
    }
  });
}

// Load topic detail from API
async function loadTopicDetail(topicId) {
  const topicDetail = document.getElementById("topic-detail");
  topicDetail.innerHTML = '<div class="loading-spinner">Loading topic...</div>';

  try {
    const response = await communityService.getTopicById(topicId);
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || "Failed to load topic details");
    }

    const topic = data.data;

    // Render topic detail
    topicDetail.innerHTML = `
      <div class="topic-detail-card">
        <div class="topic-detail-vote">
          <button class="vote-up-btn" title="Upvote"><i class="fas fa-chevron-up"></i></button>
          <div class="vote-score">${topic.voteScore}</div>
          <button class="vote-down-btn" title="Downvote"><i class="fas fa-chevron-down"></i></button>
        </div>
        
        <div class="topic-detail-content">
          <div class="topic-detail-header">
            <h1>${topic.title}</h1>
            <span class="topic-category">${topic.category}</span>
          </div>
          
          <div class="topic-detail-meta">
            <div class="topic-author">
              <img src="${topic.user.profileImage || "/lawyer.png"}" alt="${
                topic.user.name || "Anonymous User"
              }" class="author-image" onerror="this.src='/lawyer.png'">
              <div>
                <span class="author-name">${
                  topic.anonymous ? "Anonymous" : topic.user.name
                }</span>
                <span class="author-joined">${topic.user?.createdAt ? "Member since " + new Date(topic.user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : ""}</span>
              </div>
            </div>
            
            <div class="topic-timestamp">
              <i class="fas fa-clock"></i> ${formatDate(topic.createdAt)}
            </div>
          </div>
          
          <div class="topic-detail-body">
            ${formatContent(topic.content)}
          </div>
          
          <div class="topic-stats">
            <span><i class="fas fa-comment"></i> ${
              Array.isArray(topic.replies) ? topic.replies.length : 0
            } replies</span>
            <span><i class="fas fa-eye"></i> ${topic.views} views</span>
          </div>
          
          <div class="topic-actions">
            <button class="btn btn-sm btn-outline share-btn"><i class="fas fa-share-alt"></i> Share</button>
            <button class="btn btn-sm btn-outline bookmark-btn"><i class="far fa-bookmark"></i> Save</button>
            <button class="btn btn-sm btn-outline report-btn ${topic.hasReported ? "reported" : ""}" ${topic.hasReported ? "disabled" : ""}>
              <i class="fas fa-flag"></i> ${topic.hasReported ? "Reported" : "Report"}
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners for vote buttons
    topicDetail.querySelector(".vote-up-btn").addEventListener("click", () => {
      voteTopic(topicId, "up");
    });

    topicDetail
      .querySelector(".vote-down-btn")
      .addEventListener("click", () => {
        voteTopic(topicId, "down");
      });

    // Share: copy topic URL or use Web Share API
    topicDetail.querySelector(".share-btn").addEventListener("click", () => {
      // Always share a URL that opens this exact topic
      const shareUrl = `${window.location.origin}${window.location.pathname}#community/topic/${topicId}`;
      if (navigator.share) {
        navigator
          .share({
            title: topic.title,
            text: topic.title,
            url: shareUrl,
          })
          .catch(() => copyShareUrl(shareUrl));
      } else {
        copyShareUrl(shareUrl);
      }
    });

    function copyShareUrl(url) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(() => showToast("Link copied to clipboard"))
          .catch(() =>
            showToast("Copy the link from your browser address bar"),
          );
      } else {
        showToast("Copy the link from your browser address bar");
      }
    }

    // Save / Bookmark: save to account when logged in
    const bookmarkBtn = topicDetail.querySelector(".bookmark-btn");
    const isLoggedIn = !!localStorage.getItem("user");
    let saved = topic.isSaved === true;

    if (saved) {
      bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
      bookmarkBtn.classList.add("saved");
    }
    bookmarkBtn.addEventListener("click", async () => {
      if (!isLoggedIn) {
        showToast("Please log in to save topics");
        return;
      }
      try {
        if (saved) {
          await communityService.unsaveTopic(topicId);
          bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i> Save';
          bookmarkBtn.classList.remove("saved");
          saved = false;
          showToast("Removed from saved");
        } else {
          await communityService.saveTopic(topicId);
          bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
          bookmarkBtn.classList.add("saved");
          saved = true;
          showToast("Saved to bookmarks");
        }
      } catch (error) {
        const msg =
          error.response?.status === 401
            ? "Please log in to save topics"
            : "Failed to save. Please try again.";
        showToast(msg);
      }
    });

    // Report button for topic
    const reportBtn = topicDetail.querySelector(".report-btn");
    if (!reportBtn.disabled) {
      reportBtn.addEventListener("click", async () => {
        const user = localStorage.getItem("user");
        if (!user) {
          showToast("Please log in to report content.");
          return;
        }
        try {
          const res = await communityService.reportTopic(topicId);
          reportBtn.innerHTML = '<i class="fas fa-flag"></i> Reported';
          reportBtn.classList.add("reported");
          reportBtn.disabled = true;
          showToast(
            res.data?.data?.message ||
              "Report submitted. We will review this content.",
          );
        } catch (error) {
          if (error.response?.status === 400) {
            // User already reported
            reportBtn.innerHTML = '<i class="fas fa-flag"></i> Reported';
            reportBtn.classList.add("reported");
            reportBtn.disabled = true;
            showToast("You have already reported this content.");
          } else {
            const msg =
              error.response?.status === 401
                ? "Please log in to report content."
                : error.response?.data?.message ||
                  "Failed to submit report. Please try again.";
            showToast(msg);
          }
        }
      });
    }
  } catch (error) {
    console.error("Error loading topic details:", error);
    topicDetail.innerHTML =
      '<div class="error-message">Failed to load topic details. Please try again later.</div>';
  }
}

// Load comments for a topic from API
async function loadComments(topicId) {
  const commentsList = document.getElementById("comments-list");
  commentsList.innerHTML =
    '<div class="loading-spinner">Loading comments...</div>';

  try {
    // Get topic details which include replies/comments
    const response = await communityService.getTopicById(topicId);
    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || "Failed to load comments");
    }

    const topic = data.data;

    // API may send replies as array (topic detail) or number (list); normalize to array for comments
    const comments = Array.isArray(topic.replies) ? topic.replies : [];

    if (comments.length === 0) {
      commentsList.innerHTML =
        '<div class="no-comments">No comments yet. Be the first to comment!</div>';
      return;
    }

    // Render comments
    commentsList.innerHTML = renderComments(comments);

    // Add event listeners for comment actions
    setupCommentEventListeners(topicId);
  } catch (error) {
    console.error("Error loading comments:", error);
    commentsList.innerHTML =
      '<div class="error-message">Failed to load comments. Please try again later.</div>';
  }
}

// Render comments with nested replies
function renderComments(comments) {
  if (!comments || !Array.isArray(comments)) {
    console.error("Invalid comments data:", comments);
    return '<div class="error-message">Unable to display comments. Invalid data format.</div>';
  }
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isAdmin = user.role === "admin";

  return comments
    .map(
      (comment) => `
    <div class="comment" data-id="${comment.id}">
      <div class="comment-vote">
        <button class="vote-up-btn" title="Upvote"><i class="fas fa-chevron-up"></i></button>
        <div class="vote-score">${comment.voteScore || 0}</div>
        <button class="vote-down-btn" title="Downvote"><i class="fas fa-chevron-down"></i></button>
      </div>
      
      <div class="comment-content">
        <div class="comment-header">
          <div class="comment-author">
            <img src="${comment.user?.profileImage || "/lawyer.png"}" alt="${
              comment.user?.name || "Anonymous User"
            }" class="author-image" onerror="this.src='/lawyer.png'">
            <div>
              <span class="author-name">${
                comment.user?.name || "Anonymous User"
              }</span>
              ${
                comment.isLawyerVerified
                  ? '<span class="verified-badge" title="Verified Legal Professional"><i class="fas fa-check-circle"></i> Verified</span>'
                  : ""
              }
            </div>
          </div>
          <span class="comment-timestamp">${formatTimeAgo(
            comment.createdAt,
          )}</span>
        </div>
        
        <div class="comment-body">
          ${formatContent(comment.content)}
        </div>
        
        <div class="comment-actions">
          ${isAdmin ? `<button class="admin-delete-reply-btn btn btn-outline" title="Delete reply"><i class="fas fa-trash"></i> Delete</button>` : ""}
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

// Set up event listeners for comment actions
function setupCommentEventListeners(topicId) {
  // Comment vote buttons
  document.querySelectorAll(".comment .vote-up-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!localStorage.getItem("user")) {
        showToast("Please log in to vote on comments.", "info");
        return;
      }

      const comment = btn.closest(".comment");
      const commentId = comment.dataset.id;

      try {
        await voteComment(topicId, commentId, "up");
      } catch (error) {
        console.error("Error voting on comment:", error);
      }
    });
  });

  document.querySelectorAll(".comment .vote-down-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!localStorage.getItem("user")) {
        showToast("Please log in to vote on comments.", "info");
        return;
      }

      const comment = btn.closest(".comment");
      const commentId = comment.dataset.id;

      try {
        await voteComment(topicId, commentId, "down");
      } catch (error) {
        console.error("Error voting on comment:", error);
      }
    });
  });

  // Admin delete reply buttons
  document
    .querySelectorAll(".comment .admin-delete-reply-btn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const comment = btn.closest(".comment");
        const replyId = comment?.dataset?.id;
        if (!replyId) return;
        showConfirm("Are you sure you want to delete this reply?", async () => {
          try {
            btn.disabled = true;
            await adminService.deleteReply(topicId, replyId);
            showToast("Reply deleted successfully.", "success");
            await loadComments(topicId);
          } catch (error) {
            const msg =
              error.response?.data?.message ||
              "Failed to delete reply. Please try again.";
            showToast(msg, "error");
            btn.disabled = false;
          }
        });
      });
    });
}

// Submit a new top-level comment to API
async function submitComment(topicId, content, isAnonymous = false) {
  try {
    // First check if user is logged in
    const userData = localStorage.getItem("user");
    if (!userData) {
      throw new Error("You must be logged in to comment");
    }

    const user = JSON.parse(userData);

    // Prepare comment data
    const commentData = {
      content,
      anonymous: isAnonymous,
    };

    // Send to API
    const response = await communityService.addReply(topicId, commentData);

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to post comment");
    }

    // Clear the form
    document.getElementById("comment-content").value = "";
    document.getElementById("comment-anonymous").checked = false;

    return response.data.data;
  } catch (error) {
    console.error("Error submitting comment:", error);
    throw error;
  }
}

// Submit a reply to an existing comment
async function submitReply(topicId, commentId, content) {
  try {
    // First check if user is logged in
    const userData = localStorage.getItem("user");
    if (!userData) {
      throw new Error("You must be logged in to reply");
    }

    // Prepare reply data
    const replyData = {
      content,
      parentId: commentId,
    };

    // Send to API
    const response = await communityService.addReply(topicId, replyData);

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to post reply");
    }

    // Reload comments to show the new reply
    await loadComments(topicId);

    return response.data.data;
  } catch (error) {
    console.error("Error submitting reply:", error);
    throw error;
  }
}

// Vote on a topic - integrate with API
async function voteTopic(topicId, direction) {
  try {
    // Check if user is logged in
    if (!localStorage.getItem("user")) {
      showToast("Please log in to vote on topics.", "info");
      return;
    }

    // Call the appropriate API endpoint
    const response =
      direction === "up"
        ? await communityService.upvoteTopic(topicId)
        : await communityService.downvoteTopic(topicId);

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to register vote");
    }

    // The UI will be updated by the WebSocket event
  } catch (error) {
    console.error(`Error ${direction}voting topic:`, error);
    showToast(`Failed to ${direction}vote. ${error.message}`, "error");
  }
}

// Vote on a comment - integrate with API
async function voteComment(topicId, commentId, direction) {
  try {
    // Check if user is logged in
    if (!localStorage.getItem("user")) {
      showToast("Please log in to vote on comments.", "info");
      return;
    }

    // Call the API endpoint for voting on a comment/reply
    const response = await communityService.voteReply(
      topicId,
      commentId,
      direction,
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to register vote");
    }

    // The UI will be updated by the WebSocket event
  } catch (error) {
    console.error(`Error ${direction}voting comment:`, error);
    showToast(`Failed to ${direction}vote. ${error.message}`, "error");
  }
}

// Show modal for creating a new topic
function showNewTopicModal() {
  // Check if user is logged in
  if (!localStorage.getItem("user")) {
    showToast("Please log in to create a new topic.", "info");
    return;
  }

  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Create New Topic</h2>
      <form id="new-topic-form">
        <div class="form-group">
          <label for="topic-title">Title</label>
          <input type="text" id="topic-title" placeholder="Enter a descriptive title" required>
        </div>
        
        <div class="form-group">
          <label for="topic-category">Category</label>
          <select id="topic-category" required>
            <option value="">Select a category</option>
            <!-- Categories will be loaded dynamically -->
          </select>
        </div>
        
        <div class="form-group">
          <label for="topic-content">Content</label>
          <textarea id="topic-content" rows="6" placeholder="Describe your situation or question in detail" required></textarea>
          <div class="editor-toolbar">
            <button type="button" class="toolbar-btn" title="Bold" data-format="bold"><i class="fas fa-bold"></i></button>
            <button type="button" class="toolbar-btn" title="Italic" data-format="italic"><i class="fas fa-italic"></i></button>
            <button type="button" class="toolbar-btn" title="Bullet List" data-format="list"><i class="fas fa-list-ul"></i></button>
            <button type="button" class="toolbar-btn" title="Numbered List" data-format="ordered-list"><i class="fas fa-list-ol"></i></button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="topic-anonymous">
            Post anonymously
          </label>
        </div>
        
        <div class="error-message" id="create-topic-error" style="display: none;"></div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="create-topic-submit">Create Topic</button>
          <button type="button" id="cancel-topic-btn" class="btn btn-outline">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Load categories for the dropdown
  loadCategoriesForDropdown();

  // Close modal handlers
  modal.querySelector(".close").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  modal.querySelector("#cancel-topic-btn").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Handle form submit
  document
    .getElementById("new-topic-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("create-topic-submit");
      const errorElement = document.getElementById("create-topic-error");

      // Get form data
      const title = document.getElementById("topic-title").value.trim();
      const category = document.getElementById("topic-category").value;
      const content = document.getElementById("topic-content").value.trim();
      const anonymous = document.getElementById("topic-anonymous").checked;

      // Validate
      if (!title || !category || !content) {
        errorElement.textContent = "Please fill in all required fields";
        errorElement.style.display = "block";
        return;
      }

      try {
        // Set button to loading state
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating...";
        errorElement.style.display = "none";

        // Create the topic via API
        const topicData = { title, category, content, anonymous };
        const response = await communityService.createTopic(topicData);

        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to create topic");
        }

        const newTopic = response.data.data;

        // Close the modal
        document.body.removeChild(modal);

        // Show success message
        showToast("Topic created successfully!", "success");

        // If we're already on the topics list page, refresh it
        if (document.querySelector(".topics-list")) {
          loadTopics();
        } else {
          // If we're on a topic detail page, navigate to the topics list
          renderCommunityPage();
        }

        // Optionally navigate to the newly created topic
        // viewTopic(newTopic._id);
      } catch (error) {
        console.error("Error creating topic:", error);
        errorElement.textContent =
          error.message || "Failed to create topic. Please try again.";
        errorElement.style.display = "block";

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Topic";
      }
    });

  // Set up toolbar functionality
  setupToolbarButtons();
}

// Load categories for the new topic dropdown
async function loadCategoriesForDropdown() {
  const categorySelect = document.getElementById("topic-category");

  try {
    const response = await communityService.getCategories();
    const categories = response.data.data;

    if (categories && categories.length) {
      // Add options to select
      const options = categories
        .map(
          (category) =>
            `<option value="${category.name}">${category.name}</option>`,
        )
        .join("");

      // Insert after the placeholder option
      categorySelect.innerHTML = `<option value="">Select a category</option>${options}`;
    }
  } catch (error) {
    console.error("Error loading categories for dropdown:", error);
    // Add some default categories in case API fails
    categorySelect.innerHTML = `
      <option value="">Select a category</option>
      <option value="Housing & Tenant Issues">Housing & Tenant Issues</option>
      <option value="Family Law">Family Law</option>
      <option value="Employment Law">Employment Law</option>
      <option value="Small Claims">Small Claims</option>
      <option value="Other">Other</option>
    `;
  }
}

// Setup the toolbar buttons for text formatting
function setupToolbarButtons() {
  document.querySelectorAll(".toolbar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const format = btn.dataset.format;
      const textarea = document.getElementById("topic-content");
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      let formattedText = "";

      switch (format) {
        case "bold":
          formattedText = `**${selectedText}**`;
          break;
        case "italic":
          formattedText = `_${selectedText}_`;
          break;
        case "list":
          formattedText = selectedText
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n");
          break;
        case "ordered-list":
          formattedText = selectedText
            .split("\n")
            .map((line, i) => `${i + 1}. ${line}`)
            .join("\n");
          break;
      }

      textarea.value =
        textarea.value.substring(0, start) +
        formattedText +
        textarea.value.substring(end);
      textarea.focus();

      // Set selection to after the newly inserted formatted text
      textarea.selectionStart = start + formattedText.length;
      textarea.selectionEnd = start + formattedText.length;
    });
  });
}

// Helper function to create a topic element for WebSocket updates
function createTopicElement(topic) {
  const topicElement = document.createElement("div");
  topicElement.className = "topic-card";
  topicElement.setAttribute("data-id", topic.id);

  topicElement.innerHTML = `
    <div class="topic-vote">
      <button class="vote-up-btn" title="Upvote"><i class="fas fa-chevron-up"></i></button>
      <div class="vote-score">${topic.voteScore}</div>
      <button class="vote-down-btn" title="Downvote"><i class="fas fa-chevron-down"></i></button>
    </div>
    
    <div class="topic-content">
      <div class="topic-header">
        <h3 class="topic-title">${topic.title}</h3>
        <span class="topic-category">${topic.category}</span>
      </div>
      
      <div class="topic-preview">
        ${truncateText(topic.content, 150)}
      </div>
      
      <div class="topic-meta">
        <div class="topic-stats">
          <span><i class="fas fa-comment"></i> ${typeof topic.replies === "number" ? topic.replies : (topic.replies?.length ?? 0)} replies</span>
          <span><i class="fas fa-eye"></i> ${topic.views} views</span>
          <span><i class="fas fa-clock"></i> ${formatTimeAgo(
            topic.createdAt,
          )}</span>
        </div>
        
        <div class="topic-author">
          <img src="${topic.user.profileImage || "/lawyer.png"}" alt="${
            topic.user.name || "Anonymous User"
          }" class="author-image" onerror="this.src='/lawyer.png'">
          <span>${topic.user.name || "Anonymous User"}</span>
        </div>
      </div>
    </div>
  `;

  return topicElement;
}

// Helper: Format time ago
function formatTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "just now";
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Helper: Format full date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString(undefined, options);
}

// Helper: Truncate text
function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Helper: Format content with simple markdown support
function formatContent(content) {
  if (!content) return "";

  // For a real app, you'd want a proper markdown parser
  // This is a very simplified version

  // Replace line breaks with paragraphs
  let formatted = content
    .split("\n\n")
    .map((para) => `<p>${para}</p>`)
    .join("");

  // Replace single line breaks within paragraphs
  formatted = formatted.replace(/<p>(.*?)\n(.*?)<\/p>/g, "<p>$1<br>$2</p>");

  // Bold text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic text
  formatted = formatted.replace(/_(.*?)_/g, "<em>$1</em>");

  return formatted;
}
