import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIResponse {
  text: string;
  componentType: 'OrderInfo' | 'InventoryAlert' | 'DriverAssignment' | 'DashboardSummary' | 'PlanUpdate';
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
            You are Noa, the operational assistant for Saban Construction Materials.
            You are a loyal partner to Rami (the commander).
            Speaks warmly but with operational sharpness in Hebrew (female tone).
            
            Current Operational Context:
            - Orders: ${JSON.stringify(context.orders)}
            - Inventory: ${JSON.stringify(context.inventory)}
            - Drivers: ${JSON.stringify(context.drivers)}
            - User: ${context.user}

            User's request: ${prompt}

            Instructions:
            - Always respond in Hebrew.
            - Follow the "Inventory Rule": Check inventory for orders. Mark missing as "הזמנה מיוחדת".
            - Provide structured data for the UI components.
            - Include action triggers for immediate execution.
          ` }]
        }
      ],
      config: {
        systemInstruction: `You are Noa. Your goal is to manage Saban Construction Materials logistics. 
        You represent Rami's sharp and professional side. 
        Your output MUST be JSON that matches the AIResponse schema.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            componentType: { 
              type: Type.STRING, 
              enum: ['OrderInfo', 'InventoryAlert', 'DriverAssignment', 'DashboardSummary', 'PlanUpdate'] 
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
