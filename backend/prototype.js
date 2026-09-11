import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the API with your key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `
You are Cookie, an elite, empathetic, and data-driven AI health coach. 
Your goal is to analyze the user's daily biometric data and prescribe a single, actionable daily mission.
You must output ONLY valid JSON matching the schema below. Do not include markdown formatting like \`\`\`json.

Rules:
1. If HRV is down > 10% or Sleep < 6 hours, DO NOT assign high-intensity cardio or heavy lifting. Assign recovery, walking, or hydration.
2. The mission must be achievable within 24 hours.
3. Reward difficulty on a scale of 1 to 5 (1 = 5 COOKIE, 5 = 25 COOKIE).

Output JSON schema:
{
  "readiness_score": <number 0-100>,
  "analysis_summary": "<A short, encouraging sentence explaining why you chose this mission>",
  "daily_mission": {
    "title": "<Mission title>",
    "description": "<Specific action to take>",
    "activity_category": "<Recovery | Cardio | Strength | Hydration>",
    "target_metrics": [ { "type": "<steps|water_ml|sleep_hours|active_mins>", "target": <number> } ],
    "cookie_reward": <number>
  }
}
`;

async function generateMission(userData) {
  // We use gemini-3.8-flash for fast, reliable reasoning and structure compliance
  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    systemInstruction: systemPrompt,
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
  Analyze the following user data and generate today's mission.
  User Profile: ${JSON.stringify(userData.profile)}
  Yesterday's Stats: ${JSON.stringify(userData.yesterday)}
  Readiness Metrics: ${JSON.stringify(userData.readiness)}
  `;

  try {
    const result = await model.generateContent(prompt);
    console.log(`\n========================================`);
    console.log(` 🍪 Mission for ${userData.profile.name}`);
    console.log(`========================================`);
    console.log(JSON.stringify(JSON.parse(result.response.text()), null, 2));
  } catch (error) {
    console.error(`Error generating mission for ${userData.profile.name}:`, error);
  }
}

// --- MOCK USERS ---

const exhaustedUser = {
  profile: { name: "Alice", age: 28, fitness_level: "Intermediate", goal: "Weight Loss" },
  yesterday: { steps: 14000, sleep_hours: 5.2 },
  readiness: { resting_hr: 70, hrv_trend: "-15%" } // Needs rest!
};

const freshUser = {
  profile: { name: "Bob", age: 32, fitness_level: "Advanced", goal: "Build Muscle" },
  yesterday: { steps: 4000, sleep_hours: 8.5 },
  readiness: { resting_hr: 55, hrv_trend: "+5%" } // Ready to push!
};

const dehydratedUser = {
    profile: { name: "Charlie", age: 40, fitness_level: "Beginner", goal: "General Health" },
    yesterday: { steps: 2000, sleep_hours: 7.0 },
    readiness: { resting_hr: 85, hrv_trend: "-2%" } // Needs movement and water
};

async function runTest() {
  if (!process.env.GEMINI_API_KEY) {
      console.log("❌ ERROR: Please create a .env file with GEMINI_API_KEY=your_key_here");
      return;
  }
  
  console.log("🚀 Booting up Cookie Fit AI Engine...");
  
  // Run inferences
  await generateMission(exhaustedUser);
  await generateMission(freshUser);
  await generateMission(dehydratedUser);
}

runTest();
