import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './lib/supabase.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Prompt for Cookie AI
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

// --- ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cookie Fit Backend is running' });
});

// Auto-confirm user email (for frictionless local/dev signup flow)
app.post('/api/auth/auto-confirm', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (user && !user.email_confirmed_at) {
      await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
      console.log(`Auto-confirmed email for ${email}`);
    }

    res.json({ success: true, message: 'User confirmed or already confirmed' });
  } catch (error) {
    console.error('Error in auto-confirm:', error);
    res.status(500).json({ error: 'Failed to auto-confirm user' });
  }
});

// Get Profile
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
      
    if (error) throw error;

    if (!data) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: req.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      data = newProfile;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update Profile
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const { display_name, age, fitness_level, goal } = req.body;
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: req.user.id, display_name, age, fitness_level, goal })
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Submit Biometrics
app.post('/api/biometrics', requireAuth, async (req, res) => {
  try {
    const { steps, sleep_hours, resting_hr, hrv_trend } = req.body;
    
    const { data, error } = await supabase
      .from('biometrics')
      .insert({
        user_id: req.user.id,
        steps,
        sleep_hours,
        resting_hr,
        hrv_trend,
        recorded_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error submitting biometrics:', error);
    res.status(500).json({ error: 'Failed to submit biometrics' });
  }
});

// Get Today's Mission (or current active mission)
app.get('/api/mission/today', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('assigned_date', today)
      .order('completed_at', { ascending: true, nullsFirst: true })
      .limit(1);

    if (error) throw error;
    res.json(data && data.length > 0 ? data[0] : null);
  } catch (error) {
    console.error('Error fetching today mission:', error);
    res.status(500).json({ error: 'Failed to fetch mission' });
  }
});

// Generate Mission
app.post('/api/mission', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Return existing pending mission for today if one is already active
    const { data: existingMissions } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('assigned_date', today)
      .eq('status', 'pending')
      .limit(1);

    if (existingMissions && existingMissions.length > 0) {
      return res.json(existingMissions[0]);
    }

    // 1. Fetch user profile and latest biometrics
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: req.user.id })
        .select()
        .single();
      profile = newProfile;
    }

    const { data: biometrics } = await supabase
      .from('biometrics')
      .select('*')
      .eq('user_id', req.user.id)
      .order('recorded_date', { ascending: false })
      .limit(1);

    const latestBiometrics = biometrics && biometrics.length > 0 ? biometrics[0] : { steps: 0, sleep_hours: 0, resting_hr: 0, hrv_trend: "0%" };

    // 2. Generate mission with Gemini (with fallback models)
    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-2.5-flash-lite"
    ];

    const prompt = `
    Analyze the following user data and generate today's mission.
    User Profile: ${JSON.stringify(profile)}
    Yesterday's Stats: ${JSON.stringify(latestBiometrics)}
    `;

    let missionJsonStr = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(prompt);
        missionJsonStr = result.response.text();
        if (missionJsonStr) break;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} failed (${err.message}), trying fallback...`);
      }
    }

    if (!missionJsonStr) {
      throw lastError || new Error('All candidate Gemini models failed to generate content');
    }

    let missionData;
    try {
      missionData = JSON.parse(missionJsonStr);
    } catch (e) {
      console.error("Failed to parse Gemini output:", missionJsonStr);
      return res.status(500).json({ error: 'Failed to parse AI mission response' });
    }

    // 3. Save mission to Supabase
    const { data: savedMission, error: missionError } = await supabase
      .from('missions')
      .insert({
        user_id: req.user.id,
        title: missionData.daily_mission.title,
        description: missionData.daily_mission.description,
        activity_category: missionData.daily_mission.activity_category,
        target_metrics: missionData.daily_mission.target_metrics,
        cookie_reward: missionData.daily_mission.cookie_reward,
        readiness_score: missionData.readiness_score,
        analysis_summary: missionData.analysis_summary,
        status: 'pending'
      })
      .select()
      .single();

    if (missionError) throw missionError;

    res.json(savedMission);

  } catch (error) {
    console.error('Error generating mission:', error);
    res.status(500).json({ error: 'Failed to generate mission' });
  }
});

// Complete Mission
app.put('/api/mission/:id/complete', requireAuth, async (req, res) => {
  try {
    const missionId = req.params.id;

    // 1. Get mission and verify ownership
    const { data: mission, error: getError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', req.user.id)
      .single();

    if (getError || !mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }
    
    if (mission.status === 'completed') {
      return res.status(400).json({ error: 'Mission already completed' });
    }

    // 2. Mark mission as completed
    const { error: updateError } = await supabase
      .from('missions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', missionId);
      
    if (updateError) throw updateError;

    // 3. Update user profile (add cookies, increment streak)
    // Note: We use rpc function here ideally for atomic updates, but for now we do it directly
    const { data: profile } = await supabase
      .from('profiles')
      .select('cookie_balance, current_streak, best_streak')
      .eq('id', req.user.id)
      .single();
      
    if (profile) {
      const newBalance = (profile.cookie_balance || 0) + mission.cookie_reward;
      const newStreak = (profile.current_streak || 0) + 1;
      const newBestStreak = Math.max(newStreak, profile.best_streak || 0);
      
      await supabase
        .from('profiles')
        .update({
          cookie_balance: newBalance,
          current_streak: newStreak,
          best_streak: newBestStreak
        })
        .eq('id', req.user.id);
    }

    res.json({ success: true, message: 'Mission completed!', reward: mission.cookie_reward });

  } catch (error) {
    console.error('Error completing mission:', error);
    res.status(500).json({ error: 'Failed to complete mission' });
  }
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Cookie Fit Backend running on http://localhost:${PORT}`);
  });
}

export default app;
