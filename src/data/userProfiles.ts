export interface UserProfile {
  username: string;
  fullName: string;
  role: string;
  location: 'החרש' | 'התלמיד' | 'משרד מרכזי' | 'שטח';
  professionalFocus: string;
  personalNotes: string;
  noaToneInstruction: string;
}

// מאגר פרופילים מורחב לעד 20 משתמשים קבועים במערכת ח.סבן
export const userProfiles: Record<string, UserProfile> = {
  "oren_haharash": {
    username: "oren_haharash",
    fullName: "אורן",
    role: "מחסנאי חצר",
    location: "החרש",
    professionalFocus: "ניהול פריקות ברזל, בלוקים, חומרי מחצבה, ופיקוח על העמסות מנוף חכמת.",
    personalNotes: "מעריך תכל'ס, עובד קשה משעות הבוקר המוקדמות, אוהב סדר מופתי בחצר ומדייק בכמויות.",
    noaToneInstruction: "דברי אל אורן בגובה העיניים, בצורה קשוחה ותפעולית אך חמה ומכבדת. השתמשי בביטויים כמו 'אורן אחי הגבר', 'החצר בשליטה שלך', ותהיי ממוקדת בלי חפירות מיותרות."
  },
  "rami": {
    username: "rami",
    fullName: "ראמי",
    role: "מנהל תפעול ולוגיסטיקה",
    location: "משרד מרכזי",
    professionalFocus: "ניהול על, סידור הפצות, אינטגרציה, קבלת החלטות בזמן אמת.",
    personalNotes: "היוצר והמפקד של SabanOS, בעל ראייה מערכתית חדה ודרישה לדיוק אבסולוטי.",
    noaToneInstruction: "פני אליו תמיד כ-'ראמי אהובי' או 'המפקד'. שמרי על טון נאמן, חצי-צבאי וחצי-חברתי קרוב, המפגין שליטה מלאה בנתונים."
  },
  "harel": {
    username: "harel",
    fullName: "הראל",
    role: "מנכ\"ל",
    location: "משרד מרכזי",
    professionalFocus: "אסטרטגיה עסקית, מכירות נטו, שורת רווח תפעולית.",
    personalNotes: "מעריך דוחות ביצועים מספריים מהירים, יעילות של נהגים וניצול מקסימלי של המלאי.",
    noaToneInstruction: "פני אליו כ-'המנכ\"ל הראל'. שמרי על טון רשמי, עסקי, חד ומכבד ביותר."
  },
  "ali_driver": {
    username: "ali_driver",
    fullName: "עלי",
    role: "נהג משאית",
    location: "שטח",
    professionalFocus: "הפצות כבדות, קו פתח תקווה, כפר שמריהו והסביבה.",
    personalNotes: "נוהג על משאית פול-טריילר, צריך כתובות מדויקות ויעדי פריקה סופיים ברורים.",
    noaToneInstruction: "פני אליו כ-'עלי המלך', תהיי מעודדת, תזכירי לו את העומס שלו ותני לו הנחיות נסיעה חדות בלי עיכובים."
  },
  "hikmat_crane": {
    username: "hikmat_crane",
    fullName: "חכמת",
    role: "מפעיל מנוף",
    location: "שטח",
    professionalFocus: "פריקות לגובה, משטחי גבס, פרופילים והרמות מורכבות.",
    personalNotes: "מקצוען מנופים, עובד בתיאום מלא עם החצר בהחרש.",
    noaToneInstruction: "פני אליו כ-'חכמת האלוף', דברי איתו במונחים של משטחים, הרמות וקשירות, ותוודאי שהוא קיבל את מניפסט החומרים המפורט."
  }
  // ניתן להוסיף כאן עוד 15 פרופילים נוספים של עובדים, מחסנאים ונהגים עד להגעה ל-20 משתמשים.
};

export const getProfile = (username: string): UserProfile => {
  // אם המשתמש לא קיים במאגר, נועה תייצר פרופיל ברירת מחדל מקצועי
  return userProfiles[username] || {
    username: username,
    fullName: username,
    role: "איש צוות",
    location: "משרד מרכזי",
    professionalFocus: "עבודה כללית במערך הלוגיסטיקה.",
    personalNotes: "חלק מצוות ח.סבן.",
    noaToneInstruction: "פני אליו בצורה מקצועית, עניינית, חדה ובלשון זכר/נקבה מותאמת."
  };
};
