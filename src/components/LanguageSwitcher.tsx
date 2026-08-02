import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ml", name: "മലയാളം" }
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
      <SelectTrigger className="w-[110px] h-9 bg-background/50 border-border/50 text-xs font-semibold focus:ring-1 focus:ring-primary">
        <div className="flex items-center gap-1.5">
          <Globe size={14} className="text-muted-foreground" />
          <SelectValue placeholder="Language" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-xs font-semibold">
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
