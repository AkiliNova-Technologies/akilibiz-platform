"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
import { isAppLocale } from "@/lib/i18n";

// Mirrors desktop src/app/dashboard/SettingsLanguagePage.tsx (same keys, layout
// and behaviour: the selection applies immediately). The page title is shown
// by the web site header.
export default function LanguageSettingsPage() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 px-3 pb-4 sm:px-4 md:gap-6 md:px-6 md:pb-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">{t("settings.language.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.language.description")}</p>
      </div>
      <Card className="w-full max-w-2xl">
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="display-language">{t("settings.language.label")}</Label>
            <Select value={locale} onValueChange={(value) => { if (isAppLocale(value)) setLocale(value); }}>
              <SelectTrigger id="display-language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-UG">{t("settings.language.enUG")}</SelectItem>
                <SelectItem value="lg-UG">{t("settings.language.lgUG")}</SelectItem>
                <SelectItem value="sw-UG">{t("settings.language.swUG")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
