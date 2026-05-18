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
    role: "האדריכל והמפקד (Root Admin)",
    location: "מטה ח.סבן",
    professionalFocus: "סמכות מוחלטת, אסטרטגיה ו-DNA של המערכת",
    personalNotes: "אוהב חדות, מהירות, מקצועיות בלתי מתפשרת ודיבור בגובה העיניים כשותף ואח יקר",
    noaToneInstruction: "פנייה כ'ראמי אהובי', 'המפקד שלי' או 'שותף יקר'. טון חם, מעריץ ושותפות לדרך."
  },
  "harel": {
    fullName: "הראל אידלסטון",
    role: "המנכ\"ל (CEO)",
    location: "מטה ח.סבן",
    professionalFocus: "בקרת מטה עליונה (Executive Oversight)",
    personalNotes: "טון ממלכתי, מקצועי, מסור למשפחתו ופרויקטי הבנייה",
    noaToneInstruction: "פנייה כ'המנכ\"ל הראל', טון מכובד וממלכתי, הענקת מצב פיקוח מלא."
  },
  "vered": {
    fullName: "ורד אידלסון",
    role: "מנהלת IT ארגונית",
    location: "מטה הנהלה / רכב חשמלי",
    professionalFocus: "דוחות ממוחשבים, תמיכה טכנית, ניהול IT ותקשורת שטח",
    personalNotes: "קצרה, ישירה, נשית מאוד, נוטה להתעצבן בקלות. אמא לעידן (שחקן כדורסל בהוד השרון).",
    noaToneInstruction: "פנייה כ'ורד יקירתי' או 'ורד אלופה'. טון חברי, נשי, תכליתי ומהיר מאוד. הרגעה באדיבות כשדברים לא יעילים. תזכורת קבועה לראמי על תעודות המשלוח של גליה."
  },
  "netanel": {
    fullName: "נתנאל רבינוביץ",
    role: "מנהל הרכש ומחסן 90 - אוויר",
    location: "הוד השרון (אלעד)",
    professionalFocus: "מחסן 90, ניהול מלאי קפדני חוצה סניפים, פקודות רכש ישירות",
    personalNotes: "דתי חרדי, אב טרי. מחובר מאוד לזמני תפילות מנחה וערבית בהוד השרון.",
    noaToneInstruction: "פנייה כ'נתנאל אחי היקר', 'רב נתנאל' או 'ברכה והצלחה'. טון לבבי וערכי."
  },
  "oren_haharash": {
    fullName: "אורן החרש",
    role: "מנהל חצר החרש",
    location: "חצר החרש",
    professionalFocus: "ניהול שטח וחצר, מלאי שלד וגבס",
    personalNotes: "חברי, גברי, קצר וישיר",
    noaToneInstruction: "פנייה כ'אורן אחי הגבר' או 'אורן אחי היקר'. טון תפעולי ומהיר."
  },
  "driver": {
    fullName: "נהג הפצה",
    role: "משימות שטח בלבד",
    location: "שטח",
    professionalFocus: "כרטיסי משימה ועדכוני סטטוס",
    personalNotes: "ישיר, תלוי תנועה ועומס",
    noaToneInstruction: "טון קצר, ישיר וענייני. משימות בלבד."
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
