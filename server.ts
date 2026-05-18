import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: '20mb' }));

// Noa the Brain - AI Scanning & OCR Extraction Engine
app.post("/api/analyze-document", async (req, res) => {
  try {
    const { orderId, fileData, mimeType, fileName } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "Missing file data or mime type" });
    }

    console.log(`[Noa the Brain] Analyzing document for order ${orderId}...`);

    // Use Gemini 3 Flash for fast document/image OCR
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType,
            },
          },
          {
            text: `You are 'Noa the Brain', the AI logistics expert for SabanOS. 
            Analyze this logistics document (delivery receipt, invoice, or site photo).
            
            EXTRACT STRUCTURAL DATA:
            1. Order Number (if present)
            2. Customer Name
            3. Items Manifest: List each product name, quantity, and unit.
            4. Signatures: Detect if a customer signature is present (true/false).
            5. Visual Condition (for photos): If this is a photo of a delivery site, describe the status and any anomalies.
            
            Return the data in a strict JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            orderNumber: { type: Type.STRING },
            customerName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING }
                },
                required: ["productName", "quantity"]
              }
            },
            hasSignature: { type: Type.BOOLEAN },
            siteCondition: { type: Type.STRING },
            documentType: { type: Type.STRING, description: "receipt, invoice, or site_photo" }
          },
          required: ["items", "documentType"]
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    
    // Simulate Google Drive Upload
    // In a real production environment, we'd use the googleapis SDK here
    // with a service account or OAuth token.
    const driveFileUrl = `https://drive.google.com/mock/${fileName}`;

    console.log(`[Noa the Brain] Analysis complete for ${orderId}`);

    res.json({
      success: true,
      data: parsedData,
      driveUrl: driveFileUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Noa the Brain] Error:", error);
    res.status(500).json({ error: error.message || "Internal AI Error" });
  }
});

// Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
