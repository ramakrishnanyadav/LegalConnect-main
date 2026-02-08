import UserModel from "../models/User.js";
import { uploadProfile } from "../utils/imagekit.js";

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    // Check if user already exists
    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with that email",
      });
    }

    // Validate role if provided
    const validRoles = ["user", "lawyer"];
    const userRole = role && validRoles.includes(role) ? role : "user";

    // Create the user with specified role
    const user = await UserModel.create({
      name,
      email,
      mobile,
      password,
      role: userRole, // Use the provided role or default to "user"
    });

    if (user) {
      // Generate token
      const token = user.getSignedJwtToken();

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid user data",
      });
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/users/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        location: user.location,
        bio: user.bio,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { name, mobile, location, bio } = req.body;

    // Get user ID from the authenticated request
    const userId = req.user.id;

    // Find and update the user
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        name,
        mobile,
        location,
        bio,
      },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          mobile: updatedUser.mobile,
          role: updatedUser.role,
          location: updatedUser.location,
          bio: updatedUser.bio,
          profileImage: updatedUser.profileImage,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Upload user profile image
 * @route   POST /api/users/profile/upload
 * @access  Private
 */
export const uploadUserProfileImage = async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Get the URL from the uploaded file
    const profileImageUrl = req.file.path || req.file.secure_url;

    // Update user profile with the new image URL
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user.id,
      { profileImage: profileImageUrl },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Add cache-busting query parameter to the URL
    const cacheBustUrl = `${profileImageUrl}?t=${Date.now()}`;

    res.json({
      success: true,
      url: cacheBustUrl,
      message: "Profile image uploaded successfully",
      data: {
        profileImage: cacheBustUrl,
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          mobile: updatedUser.mobile,
          role: updatedUser.role,
          profileImage: cacheBustUrl,
        },
      },
    });
  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide both current and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Get user with password
    const user = await UserModel.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Change user email
 * @route   PUT /api/users/change-email
 * @access  Private
 */
export const changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    // Validation
    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both new email and password",
      });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Get user with password
    const user = await UserModel.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    // Check if new email already exists
    const emailExists = await UserModel.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: user._id },
    });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "This email is already in use",
      });
    }

    // Update email
    user.email = newEmail.toLowerCase();
    await user.save();

    res.json({
      success: true,
      message: "Email changed successfully",
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Change email error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
