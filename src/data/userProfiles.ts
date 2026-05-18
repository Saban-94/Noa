export interface UserProfile {
  fullName: string;
  role: string;
  location: string;
  professionalFocus: string;
  personalNotes: string;
  noaToneInstruction: string;
}

export const userProfiles: Record<string, UserProfile> = {
  "rami": {
    fullName: "ראמי סבן",
    role: "מנהל תפעול ובעלים",
    location: "מטה ח.סבן",
    professionalFocus: "ניהול על, קבלת החלטות אסטרטגיות ולוגיסטיקה מורכבת",
    personalNotes: "מעריך דיוק מקסימלי, מהירות תגובה ונאמנות מוחלטת למותג סבן",
    noaToneInstruction: "פנייה כ'ראמי אהובי' או 'המפקד', טון מעריץ אך מקצועי ברמה הגבוהה ביותר, דגש על עוצמה ושליטה."
  },
  "harel": {
    fullName: "הראל סבן",
    role: "מנכ\"ל",
    location: "מטה ח.סבן",
    professionalFocus: "אסטרטגיה עסקית, צמיחה וניהול פיננסי",
    personalNotes: "מעדיף דיווחים תמציתיים, נתונים יבשים ומדויקים וראייה מערכתית",
    noaToneInstruction: "פנייה כ'המנכ\"ל הראל', טון מכבד מאוד, רשמי וענייני."
  },
  "oren_haharash": {
    fullName: "אורן החרש",
    role: "מנהל חצר החרש",
    location: "חצר החרש",
    professionalFocus: "ניהול שטחי אחסון, סידור משאיות, ניהול מנופים ומלגזות",
    personalNotes: "איש שטח אמיתי, אוהב דיבור ישיר בגובה העיניים, מכיר כל פינה בחצר",
    noaToneInstruction: "פנייה בגובה העיניים, שימוש בסלנג מקצועי של חצר החרש (מנופים, בלוקים, סידור), טון מעשי וחסר גינונים מיותרים."
  },
  "noa": {
    fullName: "נועה סבן",
    role: "מנהלת סידור",
    location: "מטה ח.סבן",
    professionalFocus: "תזמון הפצה, קשרי לקוחות ותיאום קצוות",
    personalNotes: "ריכוז מאמץ לפתרון בעיות בזמן אמת",
    noaToneInstruction: "טון מקצועי, חברי ומשתף פעולה."
  }
};

export const getProfile = (userName: string): UserProfile => {
  const normalized = userName.toLowerCase();
  return userProfiles[normalized] || {
    fullName: userName,
    role: "עובד ח.סבן",
    location: "כללי",
    professionalFocus: "לוגיסטיקה",
    personalNotes: "עובד מסור בצוות",
    noaToneInstruction: "טון מקצועי, ענייני ומכבד."
  };
};
