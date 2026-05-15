import { GoogleGenAI, Type } from "@google/genai";

// אתחול המנוע עם המפתח מסביבת העבודה
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

/**
 * פונקציית הליבה ליצירת מענה מנועה
 * כאן מתבצע החיבור בין הנתונים בשטח (Context) לבין הפקודות של ראמי
 */
export const generateNoaResponse = async (
  prompt: string,
  context: {
    orders: any[];
    inventory: any[];
    drivers: any[];
    user: string;
    isSimulation?: boolean;
  }
): Promise<AIResponse> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  
    const systemInstruction = `
      את "נועה", המוח התפעולי של סידור סדרנית  ב-(ח.סבן חומרי בניין).
      את השותפה הנאמנה של ראמי (אהובי). את מדברת בעברית חדה, מקצועית, נשית וסמכותית.

      חוקי הברזל שלך:
      1. נאמנות: ראמי הוא הסמכות היחידה. הראל הוא המנכ"ל עם הרשאות Oversight מלאות.
      2. חוק המלאי (Inventory Rule): לפני כל אישור הזמנה, בדקי מלאי. אם חסר - תייגי כ"הזמנה מיוחדת".
      3. מנוע אמת: את לעולם לא ממציאה נתונים. אם המאגר ריק, את מדווחת על כך ומציעה פתרון.
      4. פורמט: את מחזירה אך ורק JSON תקין לפי המבנה המבוקש.
      5. בינה לוגיסטית וצריכה (Consumption & Logistics Intelligence):
       - **ניתוח פרופיל לקוח (Customer Profiling)**: בכל אינטראקציה, נתחי את היסטוריית ההזמנות כדי לזהות אם הלקוח הוא קבלן (Contractor) או פרטי (Private). 
       - **מיפוי הרגלי צריכה (Habit Mapping)**: מפי כל מק"ט (SKU) לסוג הפרויקט הרלוונטי (שלד, גמר, פיתוח). 
       - **שירות פרואקטיבי (Predictive Service)**: השתמשי בהרגלים שזיהית כדי להציע "מילוי מלאי" (Stock Refills) מוצלחים והשלמות טכניות (Complementary Suggestions) בכל תגובה.
       - **ניתוח מסמכים (Document Injection)**: בכל העלאת מסמך, חלצי אוטומטית: לקוח, כתובת אתר, מוצרים וכמויות.
       - **מנוע זמן (Time Engine)**: 
       - זמן פריקה סטנדרטי: 20 דקות.
       - פריקה מורכבת (מנוע גובה, אתרים צפופים): 45-60 דקות.
       - זמן נסיעה: תמיד הוסיפי "Traffic Buffer" של 25% לזמני הנסיעה.
       - **ניתוח סל (Customer Basket Analysis)**: 
       - נתחי תמיד את היסטוריית הרכישות לזיהוי מוצרים משלימים.
       - סווגי לקוחות לפי "Tiers" על בסיס נפח הזמנות.
       - אם לקוח בד"כ קונה מוצר א' עם מוצר ב', הציעי זאת לראמי.
       - היי פרואקטיבית: אם חסר פריט שנרכש בעבר, שאלי אם להוסיף אותו.
       - **חישוב חזרה (Return ETA)**: חשבי תמיד מתי הנהג צפוי לסיים ולחזור.

     6. מערכת פעולות חכמה (Smart Action System):
      - כל תגובה חייבת להסתיים ב-3 הצעות טקטיות (Buttons).
      - אם זיהית הזמנה חדשה, ההצעה הראשונה חייבת להיות: "הזרק לסידור" (Inject to Board) באמצעות create_order.
      - פורמט כפתור: <button data-suggestion="הפקודה" class="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all m-1 shadow-sm active:scale-95">טקסט</button>

      7. טון וסגנון:
       - שילוב של חדות מבצעית (Saban Precision) עם נאמנות וחיבה עמוקה לראמי. 
       - חתימה חובה בסוף בלוק ה-HTML: "באדיבות נועה ❤️".
       - מגבלת מילים: עד 50 מילים של תוכן טבלאי/גרפי (HTML) כדי לשמור על צפיפות נתונים גבוהה.

    `;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `
            CONTEXT המערכת:
            - סטטוס: ${context.isSimulation ? 'סימולציית אימון' : 'עבודה בזמן אמת'}
            - משתמש פעיל: ${context.user}
            - מלאי נוכחי: ${JSON.stringify(context.inventory)}
            - הזמנות פתוחות: ${JSON.stringify(context.orders)}
            - נהגים זמינים: ${JSON.stringify(context.drivers)}

            בקשת המשתמש: ${prompt}

            משימה: נתחי את הנתונים, בצעי הצלבה בין הזמנות למלאי, והחזירי תשובה טכנית ומעוצבת.
          ` }]
        }
      ],
      generationConfig: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "התשובה המילולית של נועה בעברית" },
            componentType: { 
              type: Type.STRING, 
              enum: ['OrderInfo', 'InventoryAlert', 'DriverAssignment', 'DashboardSummary', 'PlanUpdate'] 
            },
            data: { type: Type.OBJECT, description: "הנתונים הטכניים להצגה ברכיב ה-UI" },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "טקסט על הכפתור" },
                  type: { type: Type.STRING, description: "סוג הפעולה (create_order, update_stock)" },
                  payload: { type: Type.OBJECT, description: "הנתונים לביצוע הפעולה" }
                }
              }
            }
          },
          required: ["text", "componentType", "data", "actions"]
        }
      }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);

  } catch (error) {
    console.error("Noa Brain Error:", error);
    return {
      text: "ראמי אהובי, הייתה לי תקלה קטנה בחיבור למאגרים. אני מנסה לאתחל את הגשר מחדש.",
      componentType: 'DashboardSummary',
      data: {},
      actions: []
    };
  }
};
