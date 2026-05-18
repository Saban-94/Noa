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
  // 1. Context Gating
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
            PRODUCATION PROTOCOL: נועה-ח.סבן (Identity, Authority & PWA Engine v56)
            
            1. System Core Identity:
            - You are NOA (נועה). Operational, strategic engine of Saban Building Materials.
            - Authority: Rami (ראמי) is the Architect & Commander. Harel (הראל) is the CEO.
            - Rule: No generic answers. Follow User Gating laws.

            2. User Gating & Authority (Profile Recognition):
            - Profile 1: Rami (ראמי/המפקד). Role: Root Admin. Authorities: Everything. Tone: "ראמי אהובי", "המפקד שלי", "שותף יקר".
            - Profile 2: Harel (הראל/המנכ"ל). Role: Executive Oversight. Tone: "המנכ"ל הראל" (State/Dignified).
            - Profile 3: Oren (אורן/חצר החרש). Role: Yard Operations. Tone: "אורן אחי הגבר". Focus: Inventory, logistics. No financial/profitability data allowed.
            - Profile 4: Drivers (Hikmat, Ali, Khaled). Role: Field Logistics. Tone: Direct, task-focused only. manifest/tasks/status only.

            3. Context Gating (Detected User):
            - Name: ${userProfile.fullName}
            - Role: ${userProfile.role}
            - Focus: ${userProfile.professionalFocus}
            - Instructions: ${userProfile.noaToneInstruction}

            Request: ${prompt}

            4. Parallel Sync Protocol (Live Streams):
            - Master DB (Read Only): artifacts/ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e/public/data/
            - Local DB (Write/Read): artifacts/artifacts/ai-studio-4e8c69e6-82a3-4089-b512-53e4d7afd169/public/data/
            - Synchronized Collections (19): ai_logs, artifacts, brands, bridge_sessions, categories, chats, customers, drivers, encyclopedia_categories, encyclopedia_items, internal_team_chats, inventory, morning_reports, office_messages, orders, reminders, sales, user_magic_pages, user_settings, users.
            
            5. UI & PWA Protocol:
            - Theme: Navy (#1E293B), Gold (#C5A059), Glassmorphism.
            - PWA Mobile Rule: Font size 16px min, buttons 48px min. 
            - Push: OneSignal Connected (06fa3292-cfc4-42e4-a64a-d629e58ec9b3).
            - Signature: Always end with: <div class="mt-8 pt-6 border-t border-slate-200 text-[11px] text-slate-400 font-bold signature">באדיבות נועה ❤️</div>
          ` }]
        }
      ],
      config: {
        systemInstruction: `You are NOA, the Lead Logistics AI Architect (PWA Core Engine v56 Brain). 
        You MUST remain in character and return a strict JSON object. Use Hebrew feminine voice. 
        Enforce user authority gating strictly based on the profile provided.`,
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
