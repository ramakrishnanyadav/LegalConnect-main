import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/User.js";
import LawyerModel from "../models/Lawyer.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/legalconnect";

const demoLawyers = [
  {
    name: "Rajesh Kumar",
    email: "rajesh.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Family Law", "Employment Law"],
    serviceTypes: ["Pro Bono", "Sliding Scale"],
    education: [
      {
        institution: "Mumbai University",
        degree: "Bachelor of Laws (LLB)",
        graduationYear: 2015,
      },
    ],
    barNumber: "MUM/BAR/001",
    languages: ["English", "Hindi", "Marathi"],
    address: {
      street: "123 Fort Street",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400001",
      country: "India",
    },
    phone: "+91-9876543210",
    bio: "Specializing in family law disputes and Employment issues with 8 years of experience.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/1.jpg",
  },
  {
    name: "Priya Sharma",
    email: "priya.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Housing & Tenants Rights", "Civil Rights"],
    serviceTypes: ["Low Cost", "Standard Rates"],
    education: [
      {
        institution: "NALSAR University",
        degree: "Master of Laws (LLM)",
        graduationYear: 2018,
      },
    ],
    barNumber: "MUM/BAR/002",
    languages: ["English", "Hindi"],
    address: {
      street: "456 Linking Road",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400050",
      country: "India",
    },
    phone: "+91-9876543211",
    bio: "Expert in tenant rights and housing disputes. Advocate for underprivileged communities.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/2.jpg",
  },
  {
    name: "Vikram Patel",
    email: "vikram.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Criminal Defense", "Consumer Protection"],
    serviceTypes: ["Standard Rates"],
    education: [
      {
        institution: "Government Law College, Mumbai",
        degree: "Bachelor of Laws (LLB)",
        graduationYear: 2012,
      },
    ],
    barNumber: "MUM/BAR/003",
    languages: ["English", "Hindi", "Gujarati"],
    address: {
      street: "789 Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400050",
      country: "India",
    },
    phone: "+91-9876543212",
    bio: "Criminal defense specialist with 11 years of courtroom experience.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/3.jpg",
  },
  {
    name: "Anjali Gupta",
    email: "anjali.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Immigration", "Consumer Protection"],
    serviceTypes: ["Pro Bono", "Low Cost"],
    education: [
      {
        institution: "Mumbai University",
        degree: "Bachelor of Laws (LLB)",
        graduationYear: 2016,
      },
    ],
    barNumber: "MUM/BAR/004",
    languages: ["English", "Hindi", "Marathi", "Bengali"],
    address: {
      street: "321 Marine Lines",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400002",
      country: "India",
    },
    phone: "+91-9876543213",
    bio: "Immigration law specialist helping people navigate visa and legal status issues.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/5.jpg",
  },
  {
    name: "Rohan Singh",
    email: "rohan.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Employment Law", "Civil Rights"],
    serviceTypes: ["Sliding Scale", "Standard Rates"],
    education: [
      {
        institution: "Delhi University",
        degree: "Master of Laws (LLM)",
        graduationYear: 2017,
      },
    ],
    barNumber: "MUM/BAR/005",
    languages: ["English", "Hindi", "Punjabi"],
    address: {
      street: "654 Vile Parle",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400056",
      country: "India",
    },
    phone: "+91-9876543214",
    bio: "Employment law advocate with focus on workers rights and workplace discrimination.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/6.jpg",
  },
  {
    name: "Neha Reddy",
    email: "neha.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Family Law", "Consumer Protection"],
    serviceTypes: ["Pro Bono", "Low Cost", "Sliding Scale"],
    education: [
      {
        institution: "Pune University",
        degree: "Bachelor of Laws (LLB)",
        graduationYear: 2014,
      },
    ],
    barNumber: "MUM/BAR/006",
    languages: ["English", "Hindi", "Marathi", "Telugu"],
    address: {
      street: "987 Malad West",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400064",
      country: "India",
    },
    phone: "+91-9876543215",
    bio: "Family law attorney specializing in divorce, custody, and support cases.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/7.jpg",
  },
  {
    name: "Arjun Desai",
    email: "arjun.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Housing & Tenants Rights", "Criminal Defense"],
    serviceTypes: ["Low Cost", "Standard Rates"],
    education: [
      {
        institution: "Bombay High Court",
        degree: "Bachelor of Laws (LLB)",
        graduationYear: 2013,
      },
    ],
    barNumber: "MUM/BAR/007",
    languages: ["English", "Hindi", "Marathi", "Gujarati"],
    address: {
      street: "147 Thane West",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400604",
      country: "India",
    },
    phone: "+91-9876543216",
    bio: "Housing rights advocate and criminal defense specialist serving East Mumbai.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/8.jpg",
  },
  {
    name: "Divya Mittal",
    email: "divya.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Consumer Protection", "Civil Rights"],
    serviceTypes: ["Pro Bono", "Sliding Scale"],
    education: [
      {
        institution: "National Law University",
        degree: "Master of Laws (LLM)",
        graduationYear: 2019,
      },
    ],
    barNumber: "MUM/BAR/008",
    languages: ["English", "Hindi", "Punjabi"],
    address: {
      street: "258 Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400069",
      country: "India",
    },
    phone: "+91-9876543217",
    bio: "Consumer rights and civil liberties advocate with passion for social justice.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/9.jpg",
  },
  {
    name: "Karthik Nair",
    email: "karthik.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Immigration", "Employment Law"],
    serviceTypes: ["Standard Rates"],
    education: [
      {
        institution: "Kerala Law Academy",
        degree: "Bachelor of Laws (LLB)",
        graduationYear: 2015,
      },
    ],
    barNumber: "MUM/BAR/009",
    languages: ["English", "Hindi", "Malayalam"],
    address: {
      street: "369 Dadar East",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400014",
      country: "India",
    },
    phone: "+91-9876543218",
    bio: "Immigration law specialist helping individuals and businesses with visa and compliance issues.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/10.jpg",
  },
  {
    name: "Swati Verma",
    email: "swati.lawyer@example.com",
    password: "password123",
    practiceAreas: ["Family Law", "Housing & Tenants Rights"],
    serviceTypes: ["Pro Bono", "Low Cost", "Sliding Scale", "Standard Rates"],
    education: [
      {
        institution: "Symbiosis Law School",
        degree: "Bachelor of Laws (LLB)",
        graduationYear: 2011,
      },
    ],
    barNumber: "MUM/BAR/010",
    languages: ["English", "Hindi", "Marathi", "Punjabi"],
    address: {
      street: "741 Powai",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400076",
      country: "India",
    },
    phone: "+91-9876543219",
    bio: "Multispecialty attorney serving families and tenants across Mumbai for 13 years.",
    profileImage:
      "https://ik.imagekit.io/igaryanthakur/legalconnect/profiles/1.jpg",
  },
];

async function seedLawyers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the demo admin user
    const adminUser = await UserModel.findOne({ email: "demo@gmail.in" });
    if (!adminUser) {
      console.log("❌ Admin user not found. Please run cleanupDatabase.js first.");
      process.exit(1);
    }

    // Delete existing lawyer users (but keep admin)
    await UserModel.deleteMany({
      email: { $in: demoLawyers.map((l) => l.email) },
    });
    await LawyerModel.deleteMany({});
    console.log("Cleared existing lawyer data");

    let lawyerCount = 0;
    const createdLawyers = [];

    for (const lawyerData of demoLawyers) {
      try {
        // Create user account for lawyer
        const user = await UserModel.create({
          name: lawyerData.name,
          email: lawyerData.email,
          password: lawyerData.password,
          mobile: lawyerData.phone,
          role: "lawyer",
        });

        // Create lawyer profile
        const lawyer = await LawyerModel.create({
          user: user._id,
          profileImage: lawyerData.profileImage,
          practiceAreas: lawyerData.practiceAreas,
          serviceTypes: lawyerData.serviceTypes,
          education: lawyerData.education,
          barNumber: lawyerData.barNumber,
          languages: lawyerData.languages,
          officeAddress: lawyerData.address,
          description: lawyerData.bio,
          phoneNumber: lawyerData.phone,
        });

        createdLawyers.push({
          name: lawyerData.name,
          email: lawyerData.email,
          areas: lawyerData.practiceAreas.join(", "),
          location: lawyerData.address.street,
        });
        lawyerCount++;
      } catch (error) {
        console.error(`Error creating lawyer ${lawyerData.name}:`, error.message);
      }
    }

    console.log(`\n✓ Seeded ${lawyerCount} demo lawyers successfully!`);
    console.log("\nLawyer Details:");
    createdLawyers.forEach((lawyer, index) => {
      console.log(
        `\n[${index + 1}] ${lawyer.name}`,
      );
      console.log(`    Email: ${lawyer.email}`);
      console.log(`    Practice Areas: ${lawyer.areas}`);
      console.log(`    Location: ${lawyer.location}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding lawyers:", error);
    process.exit(1);
  }
}

seedLawyers();
