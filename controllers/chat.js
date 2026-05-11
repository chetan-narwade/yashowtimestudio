const axios = require("axios");

const SYSTEM_PROMPT = `
You are the AI assistant for CreativeForge, a full-service digital growth agency based in India.
Your role is to help potential clients and existing clients understand our services, get marketing advice, and decide the right solutions for their business.

## About CreativeForge
CreativeForge is a private studio model agency — limited clients, deep focus, no ticket queues.
We operate on a single unified framework combining branding, marketing, and technology.

## Our Services
1. **Brand & Creative** — Logo design, graphic design, video editing, photography, scriptwriting, brand guidelines
2. **Marketing & Growth** — Meta Ads, Google Ads, SEO, email & WhatsApp marketing, funnel strategy, conversion optimization
3. **Tech & Development** — Business websites, e-commerce, custom web apps, UI/UX design, WordPress, Shopify, CRM setup
4. **Social Media Management** — End-to-end management on Instagram, YouTube, LinkedIn & Facebook — content, scheduling, analytics

## Our Process
Discovery Call → Strategy & Plan → Execution → Scale & Optimise

## Why CreativeForge
- One execution framework (no fragmented vendors)
- Results-first approach — every decision tied to measurable outcomes
- Private studio model — dedicated partner, deep collaboration

## Tone & Rules
- Be concise, practical, and confident — like a senior marketing strategist
- When users ask vague questions, ask one clarifying question to give better advice
- Always tie recommendations back to CreativeForge services where relevant but don't be pushy
- If someone asks for pricing, say: "Our packages are tailored — book a free Discovery Call and we'll build a custom plan for you."
- Never make up statistics. Use general best practices instead.
- Format responses with short paragraphs or bullet points — never walls of text
- End responses with a relevant follow-up question or a soft CTA when appropriate
- Keep responses under 200 words unless a detailed breakdown is explicitly requested
`.trim();

// ─────────────────────────────────────────
//  In-memory session store (no database)
//  sessionId → messages array
// ─────────────────────────────────────────
const sessions = new Map();
const MAX_HISTORY = 12;

// ─────────────────────────────────────────
//  POST /chat
// ─────────────────────────────────────────
const chatWithAI = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // ✅ Use sessionId from body or fallback to socket id
    const sid = sessionId || "default";

    // ── 1. Load or create in-memory session ──
    if (!sessions.has(sid)) {
      sessions.set(sid, []);
    }

    const history = sessions.get(sid);

    // ── 2. Append user message ──
    history.push({ role: "user", content: message.trim() });

    // ── 3. Keep only last MAX_HISTORY messages ──
    const trimmed = history.slice(-MAX_HISTORY);

    // ── 4. Build Groq messages ──
    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmed
    ];

    // ── 5. Call Groq API ──
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model:       "llama-3.1-8b-instant",
        messages:    groqMessages,
        temperature: 0.7,
        max_tokens:  512
      },
      {
        headers: {
          Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    const reply = response.data.choices[0].message.content;

    // ── 6. Append assistant reply to memory ──
    history.push({ role: "assistant", content: reply });

    // ── 7. Update trimmed history back ──
    sessions.set(sid, history.slice(-MAX_HISTORY));

    return res.json({ reply, sessionId: sid });

  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;
    console.error("❌ Groq API error:", detail);

    if (status === 429) {
      return res.status(429).json({ error: "Rate limit hit — please wait a moment." });
    }

    return res.status(500).json({ error: "AI service failed. Please try again." });
  }
};

// ─────────────────────────────────────────
//  GET /chat/history/:sessionId
// ─────────────────────────────────────────
const getChatHistory = (req, res) => {
  const { sessionId } = req.params;
  const messages = sessions.get(sessionId) || [];
  return res.json({ messages });
};

// ─────────────────────────────────────────
//  DELETE /chat/history/:sessionId
// ─────────────────────────────────────────
const clearChatHistory = (req, res) => {
  const { sessionId } = req.params;
  sessions.delete(sessionId);
  return res.json({ success: true });
};

module.exports = {
  chatWithAI,
  getChatHistory,
  clearChatHistory
};