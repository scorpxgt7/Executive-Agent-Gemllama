import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini Client safely with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Warning: GEMINI_API_KEY is not defined in environment variables.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Route: Generate Affiliate Postings
app.post("/api/generate-affiliate", async (req, res) => {
  try {
    const { productName, productDescription, affiliateLink, price, keywords, platform, tone, style } = req.body;

    if (!productName || !productDescription) {
      res.status(400).json({ error: "Product name and description are required." });
      return;
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are a world-class direct-response copywriter and affiliate marketing automation expert. Your goal is to write a highly engaging, persuasive, and conversion-optimized affiliate post tailored for the specified platform.
Ensure the affiliate link is naturally integrated. Add structured hooks, emojis where appropriate, clear formatting, and targeted hashtags.

Output format should be markdown. Do not include meta comments or filler - output exactly the draft post.`;

    const instructions = `Create an affiliate marketing post with the following details:
- **Product Name**: ${productName}
- **Description**: ${productDescription}
- **Affiliate/Promo Link**: ${affiliateLink || "No link provided (use placeholders)"}
- **Price/Deal**: ${price || "N/A"}
- **Target Keywords/Concepts**: ${keywords || "None specified"}
- **Target Social Platform**: ${platform || "Twitter/X"}
- **Copy Tone**: ${tone || "Persuasive / High Conversion"}
- **Structure Style**: ${style || "Standard Single Post"}

Draft a high-performing post or thread specifically for the character limits and user behaviors of ${platform}. Include clear calls-to-action (CTAs). Include visual spacing, hooks at the top, outline of benefits, and a sense of scarcity or high value.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: instructions,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/generate-affiliate:", error);
    res.status(500).json({ error: error.message || "Failed to generate affiliate content." });
  }
});

// API Route: Generate Landing Page Tailwind HTML
app.post("/api/generate-landing", async (req, res) => {
  try {
    const { offerName, valueProp, ctaText, features, audience, styleTheme } = req.body;

    if (!offerName || !valueProp) {
      res.status(400).json({ error: "Offer name and main value proposition are required." });
      return;
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are an elite conversion rate optimization (CRO) engineer and lead web architect. You specialize in generating extremely modern, elegant, fully responsive, and highly persuasive landing pages in standalone HTML.
Always use Tailwind CSS (v4) for styling. Define standard Inter font and beautiful modern slate/indigo/emerald colors.
Do not output anything other than pure HTML code inside. 
No introductory text, no conversational text, and no markdown wrapping code blocks (do not wrap in \`\`\`html). Output ONLY the raw HTML string beginning with \`<!DOCTYPE html>\` and ending with \`</html>\`.`;

    const instructions = `Generate a high-converting landing page for:
- **Offer/Product Name**: ${offerName}
- **Core Value Proposition**: ${valueProp}
- **Primary CTA Button Text**: ${ctaText || "Get Started Instantly"}
- **Key Features / Selling Points**: ${features || "Premium benefits, automated support, and streamlined performance"}
- **Target Audience**: ${audience || "General consumers / digital creators"}
- **Design Theme / Aesthetic Style**: ${styleTheme || "SaaS Clean (Slate & Indigo)"}

Requirements:
1. Build a stunning Hero section with a modern badge ("#1 Automated Affiliate Tool"), bold typographic scaling, a clear subtitle reinforcing ${valueProp}, and high-contrast call-to-actions.
2. Build a Features section showing standard modern grid layouts. Let each feature have a Lucide-like stylized block.
3. Build a social proof/testimonial slider or grid.
4. Include a prominent email signup/capture form for lead gen or purchase redirects.
5. Code must be highly responsive with neat paddings, clean negative space, micro-shadows, and elegant color pairs.
6. Make sure all external script links or assets work seamlessly (e.g., use Tailwind directly and standard free fonts).
Your response MUST be raw HTML starting with \`<!DOCTYPE html>\` and ending with \`</html>\`.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: instructions,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    let rawHtml = response.text || "";
    // Clean markdown wrappers if any slipped past
    if (rawHtml.startsWith("```html")) {
      rawHtml = rawHtml.replace(/^```html\s*/i, "").replace(/\s*```$/i, "");
    } else if (rawHtml.startsWith("```")) {
      rawHtml = rawHtml.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    res.json({ html: rawHtml.trim() });
  } catch (error: any) {
    console.error("Error in /api/generate-landing:", error);
    res.status(500).json({ error: error.message || "Failed to generate landing page HTML." });
  }
});

// Configure Vite middleware in dev or Static directories in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server and Vite running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
