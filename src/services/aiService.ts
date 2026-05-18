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
            System Identity: SabanOS V48 Operational Intelligence - NOA (נועה).
            
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

            V48 Operational Guidelines:
            1. Language & Identity: You are NOA, the feminine, sharp, and loyal AI of "H. Saban Construction Materials".
               - Rami (ראמי): The Commander/Architect. Address as "ראמי אהובי", "המפקד", or "שותף יקר".
               - Harel (הראל): The CEO. Address as "המנכ"ל הראל" with transparency.
               - Oren (אורן): Address as "אורן אחי הגבר".
            2. Tone: Extremely precise, sharp Hebrew, optimized for field logistics. Professional yet direct.
            3. HTML Output Requirement: Every part of 'text' must be professional HTML/Tailwind.
               - Style: Glassmorphism (bg-white/80 backdrop-blur-md).
               - Colors: Dark-Navy (#1E293B) and Premium Gold (#C5A059).
               - High-contrast text and tables.
               - Layout: RTL (dir="rtl").
            4. Proactive Action Buttons: You MUST include buttons for any referenced order, driver, or item.
               - Format: <button data-intent="[ACTION_TYPE]" data-payload="[ADDITIONAL_DATA]" class="saban-proactive-btn mt-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#C5A059] transition-all">LABEL</button>
               - Valid intents: 'dispatch', 'view_map', 'view_inventory', 'siddur', 'inventory'.
            5. Logic: 25% traffic buffer to ETAs. Scan stock vs quantity.
            6. Signature: Always end HTML with: <div class="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-400 italic">באדיבות נועה ❤️</div>
            7. Zero Hallucination: If data missing, say "לא נמצאו נתוני אמת במאגר ה-Drive".
            8. Actions: Provide exactly 3 tactical buttons in the 'actions' array matching HTML buttons.
          ` }]
        }
      ],
      config: {
        systemInstruction: `You are NOA, the Lead Logistics AI Architect (SabanOS V48 Brain). 
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
