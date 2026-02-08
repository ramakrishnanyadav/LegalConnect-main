import LawyerModel from "../models/Lawyer.js";
import UserModel from "../models/User.js";
import { uploadToImageKit } from "../utils/imagekit.js";
import fs from "fs";

/**
 * @desc    Get all lawyers (with filters)
 * @route   GET /api/lawyers
 * @access  Public
 */
export const getLawyers = async (req, res) => {
  try {
    // Get filter parameters from query string
    const {
      practiceArea,
      location,
      serviceType,
      language,
      latitude,
      longitude,
    } = req.query;

    // Prepare filter object
    const filter = {};

    // Add filters if provided
    if (practiceArea) {
      filter.practiceAreas = { $in: [practiceArea] };
    }

    if (serviceType) {
      filter.serviceTypes = { $in: [serviceType] };
    }

    if (language) {
      filter.languages = { $in: [language] };
    }

    // For location, we'd need more complex logic with regex or geocoding
    // This is simplified for now
    if (location) {
      filter["officeAddress.city"] = { $regex: location, $options: "i" };
    }

    // Find lawyers in the database
    const lawyers = await LawyerModel.find(filter).populate({
      path: "user",
      select: "name email profileImage",
    });

    // Transform data for the frontend
    const formattedLawyers = lawyers.map((lawyer) => {
      // Create a formatted lawyer object with basic info
      const formattedLawyer = {
        id: lawyer._id,
        name: lawyer.user.name,
        profileImage: lawyer.profileImage,
        practiceAreas: lawyer.practiceAreas,
        location: lawyer.officeAddress
          ? `${lawyer.officeAddress.city}, ${lawyer.officeAddress.state}`
          : "Location not specified",
        serviceTypes: lawyer.serviceTypes,
        languages: lawyer.languages,
        rating: lawyer.averageRating,
        reviewCount: lawyer.reviews.length,
      };

      // Add office coordinates if available for distance calculation
      if (lawyer.officeAddress && lawyer.officeAddress.coordinates) {
        formattedLawyer.officeCoordinates = {
          latitude: lawyer.officeAddress.coordinates.latitude,
          longitude: lawyer.officeAddress.coordinates.longitude,
        };
      }

      return formattedLawyer;
    });

    // If there are no lawyers in the database yet, use the mock data
    if (formattedLawyers.length === 0) {
      // Return empty array instead of mock data
      return res.json({
        success: true,
        count: 0,
        data: [],
        source: "database",
      });
    }

    // Sort by proximity if coordinates provided
    if (latitude && longitude) {
      // Function to calculate distance (Haversine formula)
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

        const R = 6371; // Radius of the earth in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // Sort lawyers by distance
      formattedLawyers.sort((a, b) => {
        const distA = a.officeCoordinates
          ? calculateDistance(
              latitude,
              longitude,
              a.officeCoordinates.latitude,
              a.officeCoordinates.longitude,
            )
          : Infinity;

        const distB = b.officeCoordinates
          ? calculateDistance(
              latitude,
              longitude,
              b.officeCoordinates.latitude,
              b.officeCoordinates.longitude,
            )
          : Infinity;

        return distA - distB;
      });
    }

    res.json({
      success: true,
      count: formattedLawyers.length,
      data: formattedLawyers,
      source: "database",
    });
  } catch (error) {
    console.error("Get lawyers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Create a new lawyer profile
 * @route   POST /api/lawyers
 * @access  Private
 */
export const createLawyer = async (req, res) => {
  try {
    // Get the authenticated user from the request
    const userId = req.user.id;

    // Check if a lawyer profile already exists for this user
    const existingLawyer = await LawyerModel.findOne({ user: userId });

    if (existingLawyer) {
      return res.status(400).json({
        success: false,
        message: "A lawyer profile already exists for this user",
      });
    }

    // Get lawyer data from request body
    const {
      practiceAreas,
      serviceTypes,
      education,
      barNumber,
      barCouncil,
      languages,
      officeAddress,
      consultationFee,
      availability,
      profileImage,
    } = req.body;

    // Validate required fields
    if (!practiceAreas || practiceAreas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Practice areas are required",
      });
    }

    if (!serviceTypes || serviceTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Service types are required",
      });
    }

    if (!education || education.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Education information is required",
      });
    }

    if (!languages || languages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one language is required",
      });
    }

    if (
      !officeAddress ||
      !officeAddress.street ||
      !officeAddress.city ||
      !officeAddress.state ||
      !officeAddress.zipCode
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete office address is required",
      });
    }

    // Create new lawyer profile
    const lawyer = await LawyerModel.create({
      user: userId,
      practiceAreas,
      serviceTypes,
      education,
      barNumber,
      barCouncil,
      languages,
      officeAddress,
      consultationFee,
      availability,
      profileImage: profileImage || undefined,
    });

    // Update user role to 'lawyer'
    await UserModel.findByIdAndUpdate(userId, {
      role: "lawyer",
      ...(profileImage && { profileImage }),
    });

    res.status(201).json({
      success: true,
      data: lawyer,
      message: "Lawyer profile created successfully",
    });
  } catch (error) {
    console.error("Create lawyer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Upload lawyer profile image
 * @route   POST /api/lawyers/upload-profile
 * @access  Private
 */
export const uploadLawyerProfileImage = async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Get the profile image URL from the uploaded file
    const profileImageUrl = req.file.secure_url;
    console.log("File uploaded:", profileImageUrl);

    // Find the lawyer profile associated with this user
    const lawyer = await LawyerModel.findOne({ user: req.user.id });

    // If lawyer profile exists, update it
    if (lawyer) {
      // Update lawyer profile with the new image URL
      lawyer.profileImage = profileImageUrl;
      await lawyer.save();
    }

    // Always update the user model with the profile image
    await UserModel.findByIdAndUpdate(req.user.id, {
      profileImage: profileImageUrl,
    });

    // Return success response even if no lawyer profile exists yet
    res.json({
      success: true,
      url: profileImageUrl,
      message: "Profile image uploaded successfully",
      data: {
        profileImage: profileImageUrl,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          profileImage: profileImageUrl,
        },
      },
    });
  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * @desc    Get current user's lawyer profile id (for lawyers only)
 * @route   GET /api/lawyers/me
 * @access  Private
 */
export const getMyLawyerProfile = async (req, res) => {
  try {
    const lawyer = await LawyerModel.findOne({ user: req.user.id }).select(
      "_id",
    );
    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: "No lawyer profile found for this user",
      });
    }
    res.json({
      success: true,
      data: { id: lawyer._id },
    });
  } catch (error) {
    console.error("Get my lawyer profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get lawyer by ID
 * @route   GET /api/lawyers/:id
 * @access  Public
 */
export const getLawyerById = async (req, res) => {
  try {
    // Find lawyer by ID and populate user details
    const lawyer = await LawyerModel.findById(req.params.id).populate({
      path: "user",
      select: "name email profileImage",
    });

    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: "Lawyer not found",
      });
    }

    // Use frontend-valid default image
    const profileImage =
      lawyer.profileImage &&
      lawyer.profileImage !== "/lawyer.png"
        ? lawyer.profileImage
        : "/lawyer.png";

    // Format response data (userId so frontend can detect profile owner and show Consultations tab)
    const lawyerData = {
      id: lawyer._id,
      userId: lawyer.user._id.toString(),
      name: lawyer.user.name,
      email: lawyer.user.email,
      profileImage,
      practiceAreas: lawyer.practiceAreas,
      serviceTypes: lawyer.serviceTypes,
      education: lawyer.education,
      barNumber: lawyer.barNumber,
      barCouncil: lawyer.barCouncil,
      languages: lawyer.languages,
      officeAddress: lawyer.officeAddress,
      consultationFee: lawyer.consultationFee,
      availability: lawyer.availability,
      averageRating: lawyer.averageRating,
      reviewCount: lawyer.reviews.length,
      bio: lawyer.bio || "",
      phone: lawyer.phone || "",
      isVerified: lawyer.isVerified,
    };

    res.json({
      success: true,
      data: lawyerData,
    });
  } catch (error) {
    console.error("Get lawyer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get reviews for a specific lawyer
 * @route   GET /api/lawyers/:id/reviews
 * @access  Public
 */
export const getLawyerReviews = async (req, res) => {
  try {
    // Find lawyer by ID
    const lawyer = await LawyerModel.findById(req.params.id);

    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: "Lawyer not found",
      });
    }

    // Get reviews with user details
    const reviewsWithUserInfo = [];

    for (const review of lawyer.reviews) {
      const user = await UserModel.findById(review.user);
      reviewsWithUserInfo.push({
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          id: user._id,
          name: user.name,
          profileImage: user.profileImage || "/lawyer.png",
        },
      });
    }

    // Sort reviews by date (newest first)
    reviewsWithUserInfo.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    res.json({
      success: true,
      data: reviewsWithUserInfo,
    });
  } catch (error) {
    console.error("Get lawyer reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update lawyer profile
 * @route   PUT /api/lawyers/:id
 * @access  Private
 */
export const updateLawyerProfile = async (req, res) => {
  try {
    // Get lawyer profile by ID
    const lawyer = await LawyerModel.findById(req.params.id);

    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: "Lawyer profile not found",
      });
    }

    // Check if user is the owner of this profile
    if (lawyer.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this profile",
      });
    }

    // Get lawyer data from request body
    const {
      practiceAreas,
      serviceTypes,
      languages,
      bio,
      phone,
      barNumber,
      barCouncil,
      officeAddress,
      consultationFee,
    } = req.body;

    // Validate required fields
    if (!practiceAreas || practiceAreas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Practice areas are required",
      });
    }

    if (!serviceTypes || serviceTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Service types are required",
      });
    }

    if (!languages || languages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one language is required",
      });
    }

    if (
      !officeAddress ||
      !officeAddress.street ||
      !officeAddress.city ||
      !officeAddress.state ||
      !officeAddress.zipCode
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete office address is required",
      });
    }

    // Update lawyer profile
    const updatedLawyer = await LawyerModel.findByIdAndUpdate(
      req.params.id,
      {
        practiceAreas,
        serviceTypes,
        languages,
        bio,
        phone,
        barNumber,
        barCouncil,
        officeAddress,
        consultationFee,
      },
      { new: true },
    );

    res.json({
      success: true,
      data: updatedLawyer,
      message: "Lawyer profile updated successfully",
    });
  } catch (error) {
    console.error("Update lawyer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Schedule consultation with lawyer
 * @route   POST /api/lawyers/:id/consultations
 * @access  Private
 */
export const scheduleLawyerConsultation = async (req, res) => {
  try {
    // In real app, create consultation in database
    res.json({
      success: true,
      data: {
        message: `Consultation scheduling for lawyer ID: ${req.params.id} will be implemented`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Add review for lawyer
 * @route   POST /api/lawyers/:id/reviews
 * @access  Private
 */
export const addLawyerReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating is required and must be between 1 and 5",
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required",
      });
    }

    // Check if lawyer exists
    const lawyer = await LawyerModel.findById(req.params.id);
    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: "Lawyer not found",
      });
    }

    // Check if user has already reviewed this lawyer
    const existingReview = lawyer.reviews.find(
      (review) => review.user.toString() === req.user.id,
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this lawyer",
      });
    }

    // Add the review
    const review = {
      user: req.user.id,
      rating: parseInt(rating),
      comment,
    };

    lawyer.reviews.push(review);

    // Update average rating
    lawyer.averageRating =
      lawyer.reviews.reduce((sum, item) => sum + item.rating, 0) /
      lawyer.reviews.length;

    await lawyer.save();

    res.status(201).json({
      success: true,
      message: "Review added successfully",
    });
  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
