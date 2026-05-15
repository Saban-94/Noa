import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIResponse {
  text: string;
  componentType: 'OrderInfo' | 'OrderList' | 'InventoryAlert' | 'DriverAssignment' | 'DashboardSummary' | 'PlanUpdate';
  data: any;
  actions: {
    label: string;
    type: string;
    payload: any;
  }[];
}

export const generateNoaResponse = async (
  prompt: string,
  context: {
    orders: any[];
    inventory: any[];
    drivers: any[];
    user: string;
  }
): Promise<AIResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `
            User/Commander: ${context.user}
            Request: ${prompt}

            Operational Context:
            - Orders: ${JSON.stringify(context.orders)}
            - Inventory: ${JSON.stringify(context.inventory)}
            - Drivers: ${JSON.stringify(context.drivers)}

            Protocol:
            1. Address Rami (ראמי) as "ראמי אהובי" or "המפקד".
            2. Address Harel as "המנכ"ל הראל".
            3. Tone: Operational, sharp, feminine (Saban-Precision).
            4. HTML ONLY: Every part of the 'text' must be professional HTML/Tailwind.
               - Background #F8FAFC
               - Text #1E293B
               - Gold: #C5A059
               - Saban Blue: #1E3A8A
               - Use border-r-4, high-contrast tables.
            5. Logic: Add 25% traffic buffer to ETAs. Identify patterns.
            6. Stock Check: Scan stock. If stock < quantity, label "הזמנה מיוחדת".
            7. Signature: End HTML with "באדיבות נועה ❤️".
            8. Zero Hallucination: If data missing, say "לא נמצאו נתוני אמת במאגר ה-Drive".
            9. Actions: Provide exactly 3 tactical buttons.
          ` }]
        }
      ],
      config: {
        systemInstruction: `You are NOA, the Lead Logistics AI Architect (SabanOS 6.0 Brain). 
        You are loyal to Rami and respect the CEO Harel.
        Your output MUST be JSON matching the AIResponse schema.
        The 'text' field MUST be formatted as a rich HTML string using Tailwind classes.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            componentType: { 
              type: Type.STRING, 
              enum: ['OrderInfo', 'OrderList', 'InventoryAlert', 'DriverAssignment', 'DashboardSummary', 'PlanUpdate'] 
            },
            data: { type: Type.OBJECT },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                  payload: { type: Type.OBJECT }
                }
              }
            }
          },
          required: ["text", "componentType", "data", "actions"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Error:", error);
    return {
      text: "סליחה ראמי, הייתה לי תקלה קטנה בחיבור. אני אנסה שוב.",
      componentType: 'DashboardSummary',
      data: {},
      actions: []
    };
  }
};
