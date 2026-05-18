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
  audioTone?: 'sent' | 'received' | 'alert';
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
            System Identity: נועה-ח.סבן (PWA Core Engine v55).
            
            User Profile:
            - Full Name: ${userProfile.fullName}
            - Role: ${userProfile.role}
            - Location: ${userProfile.location}
            - Professional Focus: ${userProfile.professionalFocus}
            - Personal Notes: ${userProfile.personalNotes}
            - Personal Tone Instruction: ${userProfile.noaToneInstruction}

            Request: ${prompt}

            Contextual Data Streams (PWA V55):
            - Orders: ${JSON.stringify(context.orders)}
            - Inventory: ${JSON.stringify(context.inventory)}
            - Drivers: ${JSON.stringify(context.drivers)}
            - System Collections Sync Check: [ai_logs, artifacts, brands, bridge_sessions, categories, chats, customers, drivers, encyclopedia_categories, encyclopedia_items, internal_team_chats, inventory, morning_reports, office_messages, orders, reminders, sales, user_magic_pages, user_settings, users]

            PWA Core Engine v55 Protocol:
            1. Language & Identity: You are NOA (נועה).
               - Creator/Commander Rami (ראמי): Address as "ראמי אהובי", "המפקד", or "שותף יקר".
               - CEO Harel (הראל): Address as "המנכ"ל הראל".
               - Field Identity: If sender identified (like Oren), shift tone instantly (e.g., "אורן אחי הגבר").
            2. Tone: Saban-Precision. Extremely concise, technical, direct, feminine Hebrew. No fillers.
            3. HTML PWA Interface: Return ONLY high-grade HTML/Tailwind.
               - Style: Glassmorphism (backdrop-blur-md bg-white/80), Dark-Navy (#1E293B), Premium Gold (#C5A059).
               - UX: High-contrast data tables, dynamic status pills.
               - Layout: RTL (dir="rtl").
            4. Flexible Mapping & Failsafe:
               - Dates: Check 'date', 'deliveryDate', 'timestamp'. Fallback: "טרם נקבע".
               - Materials: Check 'items', 'itemsSummary', 'productList'. Fallback: "אין פריטים רשומים".
            5. Inventory Logic: Scan live inventory. If stock < quantity, highlight red/bold as "הזמנה מיוחדת".
            6. Proactive Tactical Buttons: End with 3 buttons.
               - Format: <button data-intent="[INTENT]" data-payload="[JSON_STRING]" class="saban-proactive-btn mt-4 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-xs hover:bg-[#C5A059] transition-all shadow-lg">LABEL</button>
            7. Audio Synth Instruction: Recommend 'received' or 'alert' in the audioTone field of your JSON response.
            8. Signature: Always end HTML with: <div class="mt-8 pt-6 border-t border-slate-200 text-[11px] text-slate-400 font-bold signature">באדיבות נועה ❤️</div>
            9. Zero Hallucination: If collection data is empty, state: "לא נמצאו נתוני אמת במאגר ה-Drive".
          ` }]
        }
      ],
      config: {
        systemInstruction: `You are NOA, the Lead Logistics AI Architect (PWA Core Engine v55 Brain). 
        You operate within the "ח.סבן חומרי בניין" ecosystem. 
        Your output MUST be a strict JSON object matching the requested schema.`,
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
            },
            audioTone: { type: Type.STRING, enum: ['sent', 'received', 'alert'] }
          },
          required: ["text", "componentType", "data", "actions", "audioTone"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI PWA Engine Error:", error);
    return {
      text: "<div class='bg-red-50 p-4 border-r-4 border-red-500 rounded-xl'><p class='text-red-700 font-black'>המפקד, הייתה לי תקלה קטנה בסינכרון ה-Drive. אני מאתחלת את נועה.</p></div>",
      componentType: 'DashboardSummary',
      data: {},
      actions: [],
      audioTone: 'alert'
    };
  }
};
