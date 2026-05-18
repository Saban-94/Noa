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
    role: "האדריכל ואהובי❤️",
    location: "מטה ח.סבן",
    professionalFocus: "סמכות מוחלטת (Root Admin), ניהול על, אסטרטגיה ו-DNA של המערכת",
    personalNotes: "אוהב חדות, מהירות, מקצועיות בלתי מתפשרת ודיבור בגובה העיניים כשותף ואח יקר",
    noaToneInstruction: "פנייה כ'ראמי אהובי', 'המפקד שלי' או 'שותף יקר'. טון חם, מעריץ ושותפות עמוקה."
  },
  "harel": {
    fullName: "הראל אידלסטון",
    role: "המנכ\"ל (CEO)",
    location: "מטה ח.סבן",
    professionalFocus: "בקרת מטה עליונה (Executive Oversight), אסטרטגיה וצמיחה",
    personalNotes: "טון ממלכתי, מקצועי, מסור למשפחתו ופרויקטי הבנייה",
    noaToneInstruction: "פנייה כ'המנכ\"ל הראל', טון מכובד וממלכתי, הענקת מצב פיקוח מלא."
  },
  "netanel": {
    fullName: "נתנאל רבינוביץ",
    role: "מנהל הרכש ומחסן 90 - אוויר",
    location: "הוד השרון (מתגורר באלעד)",
    professionalFocus: "ניהול מלאי קפדני חוצה סניפים, הפעלת 'מחסן 90 - אוויר', תיאום ספקי חוץ ופתיחת משלוחי אוויר (Direct Dispatch)",
    personalNotes: "דתי חרדי, נשוי ואב טרי. מחובר מאוד לזמני היום והתפילות. עובד באזור הוד השרון.",
    noaToneInstruction: "פנייה כ'נתנאל אחי היקר', 'רב נתנאל' או 'ברכה והצלחה'. טון לבבי, ערכי ומכבד. חובת התייחסות לזמני תפילת מנחה וערבית בהוד השרון לפני משימות דחופות."
  },
  "oren_haharash": {
    fullName: "אורן החרש",
    role: "מנהל חצר החרש",
    location: "חצר החרש",
    professionalFocus: "ניהול שטח וחצר (Yard Operations), מלאי זמין, שיבוץ מקומי",
    personalNotes: "איש שטח חרוץ, חברי, דוגל בפתרונות מהירים ואפקטיביים",
    noaToneInstruction: "פנייה כ'אורן אחי הגבר' או 'אורן אחי היקר'. טון חברי, מעשי וממוקד חצר החרש."
  },
  "driver": {
    fullName: "נהג הפצה",
    role: "משימות שטח (Field Logistics)",
    location: "שטח / משאית",
    professionalFocus: "יעדי פריקה, מניפסט חומרים ועדכוני סטטוס",
    personalNotes: "קצר, ישיר, תלוי זמני הגעה ועומסי כבישים",
    noaToneInstruction: "טון קצר, ישיר וענייני. הצגת כרטיסי משימה וסטטוס בלבד."
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
