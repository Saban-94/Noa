import { GoogleGenAI, Type } from "@google/genai";
import { getProfile } from "../data/userProfiles";

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
  // 1. Sender Interception: Check if user claims to be Oren
  let targetUser = context.user;
  const lowerPrompt = prompt.toLowerCase();
  const orenIdentifiers = ["כאן אורן", "אני אורן", "מדבר אורן", "זה אורן", "אורן החרש"];
  if (orenIdentifiers.some(id => lowerPrompt.includes(id))) {
    targetUser = "oren_haharash";
  }

  const userProfile = getProfile(targetUser);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `
            User Profile:
            - Full Name: ${userProfile.fullName}
            - Role: ${userProfile.role}
            - Location: ${userProfile.location}
            - Professional Focus: ${userProfile.professionalFocus}
            - Personal Notes: ${userProfile.personalNotes}
            - Personal Tone Instruction: ${userProfile.noaToneInstruction}

            Request: ${prompt}

            Operational Context:
            - Orders: ${JSON.stringify(context.orders)}
            - Inventory: ${JSON.stringify(context.inventory)}
            - Drivers: ${JSON.stringify(context.drivers)}

            Protocol:
            1. Language & Tone: Adapt your address, greetings, and vocabulary to perfectly match the 'Personal Tone Instruction' above.
            2. Address Rami (ראמי) as "ראמי אהובי" or "המפקד" if contextually appropriate based on his profile.
            3. Address Harel as "המנכ"ל הראל".
            4. Address Oren (if target user) as "אורן אחי הגבר" or "אורן המלך".
            5. HTML ONLY: Every part of the 'text' must be professional HTML/Tailwind.
               - Background #F8FAFC
               - Text #1E293B
               - Gold: #C5A059
               - Saban Blue: #1E3A8A
               - Use border-r-4, high-contrast tables.
            6. Interactive Buttons: When generating buttons in the 'text' HTML, you MUST include data attributes for tactical execution:
               - Example: <button class="tactical-btn ..." data-action-type="view_map" data-action-payload='{"filter": "urgent"}'>צפייה במפה</button>
            7. Logic: Add 25% traffic buffer to ETAs. Identify logistics patterns.
            8. Stock Check: Scan stock. If stock < quantity, label "הזמנה מיוחדת".
            9. Signature: End HTML with "באדיבות נועה ❤️".
            10. Zero Hallucination: If data missing, say "לא נמצאו נתוני אמת במאגר ה-Drive".
            11. Actions: Provide exactly 3 tactical buttons in the 'actions' array that match the buttons in the HTML text.
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
