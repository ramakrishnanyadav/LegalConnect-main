// Shared mock data (in-memory for now; replace with DB later)
function getMockResources() {
  return [
    {
      id: "1",
      title: "Know Your Rights: Tenant Basics",
      description:
        "Essential information for renters about lease agreements, maintenance responsibilities, eviction procedures, and security deposits.",
      type: "Guide",
      category: "Housing & Tenant Rights",
      file: "Tenants-Rights.pdf",
    },
    {
      id: "2",
      title: "Power of Attorney Form",
      description:
        "Customize this power of attorney template to authorize someone to make legal decisions on your behalf.",
      type: "Template",
      category: "Family Law",
      file: null,
    },
    {
      id: "3",
      title: "Discrimination Law Overview",
      description:
        "Comprehensive guide to discrimination laws and protections for individuals in various settings.",
      type: "Guide",
      category: "Civil Rights",
      file: "DISCRIMINATION.pdf",
    },
    {
      id: "4",
      title: "English Constitution",
      description:
        "Overview of the English constitutional framework and principles.",
      type: "Guide",
      category: "Other",
      file: "englishconstitution.pdf",
    },
    {
      id: "5",
      title: "Labour Law Handbook",
      description:
        "Guide to employment laws, worker rights, and employer obligations.",
      type: "Guide",
      category: "Employment Law",
      file: "Labour_Law.pdf",
    },
    {
      id: "6",
      title: "Model Tenancy Act",
      description:
        "Complete text of the Model Tenancy Act with explanations and implications for landlords and tenants.",
      type: "Guide",
      category: "Housing & Tenant Rights",
      file: "Model-Tenancy-Act-English.pdf",
    },
    {
      id: "7",
      title: "Notice of Termination Template",
      description:
        "Template for creating a legally valid termination notice for tenancy agreements.",
      type: "Template",
      category: "Housing & Tenant Rights",
      file: "Notice-of-Termination.pdf",
    },
    {
      id: "8",
      title: "Privacy Law Guide",
      description:
        "Understanding privacy laws and your rights to data protection and confidentiality.",
      type: "Guide",
      category: "Consumer Rights",
      file: "PRIVACY_LAW.pdf",
    },
    {
      id: "9",
      title: "Eviction Rights and Processes",
      description:
        "Legal guide to eviction procedures and tenant rights during eviction.",
      type: "Guide",
      category: "Housing & Tenant Rights",
      file: "RIGHT_EVICTION.pdf",
    },
    {
      id: "10",
      title: "Tenants' Rights Handbook",
      description:
        "Comprehensive handbook on tenant rights, responsibilities, and legal remedies.",
      type: "Guide",
      category: "Housing & Tenant Rights",
      file: "Tenants-Rights-Handbook.pdf",
    },
    {
      id: "11",
      title: "Women's Legal Rights",
      description:
        "Guide to legal protections and rights specific to women across various areas of law.",
      type: "Guide",
      category: "Civil Rights",
      file: "Woman_Law.pdf",
    },
  ];
}

// In-memory store (replace with DB when ready)
const resourceStore = getMockResources();

/**
 * @desc    Get all resources (with filters)
 * @route   GET /api/resources
 * @access  Public
 */
export const getResources = async (req, res) => {
  try {
    const { category, type, search } = req.query;
    let list = [...resourceStore];

    if (category && category !== "all") {
      list = list.filter((r) => r.category === category);
    }
    if (type && type !== "all") {
      list = list.filter((r) => r.type === type);
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.description.toLowerCase().includes(term) ||
          (r.category && r.category.toLowerCase().includes(term)),
      );
    }

    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error) {
    console.error("Get resources error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get resource categories
 * @route   GET /api/resources/categories
 * @access  Public
 */
export const getResourceCategories = async (req, res) => {
  try {
    const categories = [
      "Housing & Tenant Rights",
      "Family Law",
      "Employment Law",
      "Consumer Rights",
      "Civil Rights",
      "Other",
      "Immigration",
      "Traffic & Driving",
      "Criminal Defense",
    ];

    res.json({
      success: true,
      data: categories,
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
 * @desc    Get resource by ID
 * @route   GET /api/resources/:id
 * @access  Public
 */
export const getResourceById = async (req, res) => {
  try {
    // In real app, fetch resource from database
    res.json({
      success: true,
      data: {
        message: `Resource details for ID: ${req.params.id} will be implemented`,
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
 * @desc    Get resource file for download or view
 * @route   GET /api/resources/:id/file
 * @access  Public
 */
export const getResourceFile = async (req, res) => {
  try {
    const resourceId = req.params.id;

    // In a real app, you would fetch the resource from the database
    // Here we're using our mock data
    const resources = [
      // ...mock data with files
      { id: "1", file: "Tenants-Rights.pdf" },
      { id: "5", file: "DISCRIMINATION.pdf" }, // Note: URL has typo as "DISCRIMATION.pdf"
      { id: "6", file: "englishconstitution.pdf" },
      { id: "7", file: "Labour_Law.pdf" },
      { id: "8", file: "Model-Tenancy-Act-English.pdf" }, // Note: URL has "Model-Tenancy-Act-English-02_06_2021.pdf"
      { id: "9", file: "Notice-of-Termination.pdf" },
      { id: "10", file: "PRIVACY_LAW.pdf" },
      { id: "11", file: "RIGHT_EVICTION.pdf" },
      { id: "12", file: "Tenants-Rights-Handbook.pdf" },
      { id: "13", file: "Woman_Law.pdf" },
    ];

    const resource = resources.find((r) => r.id === resourceId);

    if (!resource || !resource.file) {
      return res.status(404).json({
        success: false,
        message: "Resource file not found",
      });
    }

    // Map to ImageKit URLs
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

    // Get the URL for the file
    const fileUrl = pdfUrls[resource.file];

    if (!fileUrl) {
      return res.status(404).json({
        success: false,
        message: "File URL not found",
      });
    }

    // Redirect to the ImageKit URL
    const download = req.query.download === "true";

    if (download) {
      res.redirect(fileUrl);
    } else {
      res.redirect(fileUrl);
    }
  } catch (error) {
    console.error("Get resource file error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
