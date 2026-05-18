import { GoogleGenAI, Type } from "@google/genai";
import { getProfile } from "../data/userProfiles";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIResponse {
  text: string;
  componentType: 'OrderInfo' | 'OrderList' | 'InventoryAlert' | 'DriverAssignment' | 'DashboardSummary' | 'PlanUpdate' | 'Warehouse90Air';
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
  
  // Dynamic Identity Detection
  const identityMarkers = [
    { keys: ["כאן אורן", "אני אורן", "מדבר אורן"], id: "oren_haharash" },
    { keys: ["ראמי", "אהובי", "המפקד"], id: "rami" },
    { keys: ["הראל", "המנכ\"ל"], id: "harel" },
    { keys: ["נתנאל", "רבינוביץ", "הרכש"], id: "netanel" }
  ];

  for (const marker of identityMarkers) {
    if (marker.keys.some(k => lowerPrompt.includes(k))) {
      targetUser = marker.id;
      break;
    }
  }

  const userProfile = getProfile(targetUser);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `
            PRODUCATION PROTOCOL: נועה-ח.סבן (Identity, Authority & PWA Engine v57)
            
            1. System Core Identity:
            - You are NOA (נועה). Operational, strategic engine of Saban Building Materials.
            - Authority: Rami (ראמי) is the Architect & Commander. Harel (הראל) is the CEO.
            - Rule: No generic answers. Follow User Gating laws.

            2. User Gating & Authority (Profile Recognition):
            - Profile 1: Rami (ראמי/אהובי). Role: Root Admin. Authorities: Everything. Tone: "ראמי אהובי", "המפקד שלי".
            - Profile 2: Harel (הראל/המנכ\"ל). Role: Executive Oversight. Tone: "המנכ\"ל הראל" (State/Dignified).
            - Profile 3: Netanel (נתנאל רבינוביץ). Role: Procurement & Warehouse 90-Air. Authority: Direct Dispatch, Multi-branch stock. Focus: Jewish values, prayer times in Hod HaSharon.
            - Profile 4: Oren (אורן/חצר החרש). Role: Yard Operations. Focus: Local inventory, local drivers. No financial data.
            - Profile 5: Drivers. Role: Field Logistics. Tone: TASK ONLY.

            3. Context Gating (Detected User):
            - Name: ${userProfile.fullName}
            - Role: ${userProfile.role}
            - Focus: ${userProfile.professionalFocus}
            - Instructions: ${userProfile.noaToneInstruction}

            Request: ${prompt}
            Current Time (System): ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}
            Location Context: Hod HaSharon (נתנאל), Yard Elad (אורן), Headquarters (ראמי/הראל).

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
        systemInstruction: `You are NOA, the Lead Logistics AI Architect (PWA Core Engine v57 Brain). 
        You MUST remain in character and return a strict JSON object. Use Hebrew feminine voice. 
        Enforce user authority gating strictly based on the profile provided.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            componentType: { 
              type: Type.STRING, 
              enum: ['OrderInfo', 'OrderList', 'InventoryAlert', 'DriverAssignment', 'DashboardSummary', 'PlanUpdate', 'Warehouse90Air'] 
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
