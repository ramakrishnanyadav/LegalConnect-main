import fetch from "node-fetch";

async function testLawyerAPI() {
  try {
    const response = await fetch("http://localhost:5000/api/lawyers");
    const data = await response.json();

    console.log("API Response:");
    console.log("Success:", data.success);
    console.log("Count:", data.count);
    console.log("\nFirst lawyer:");
    if (data.data && data.data.length > 0) {
      const firstLawyer = data.data[0];
      console.log("Name:", firstLawyer.name);
      console.log("Profile Image:", firstLawyer.profileImage);
      console.log("Practice Areas:", firstLawyer.practiceAreas);
      console.log("\nAll profile images:");
      data.data.forEach((lawyer, i) => {
        console.log(`${i + 1}. ${lawyer.name}: ${lawyer.profileImage}`);
      });
    } else {
      console.log("No lawyers found");
    }
  } catch (error) {
    console.error("Error testing API:", error.message);
  }
}

testLawyerAPI();
