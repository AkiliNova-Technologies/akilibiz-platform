import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/hooks/useI18n";

export default function SettingsLanguagePage() {
  const { locale, setLocale, t } = useI18n();
  return (
    <>
      <SiteHeader label={t("settings.language.title")} />
      <div className="flex flex-1 flex-col px-4 pb-6 md:px-6">
        <Card className="max-w-2xl">
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold">
                {t("settings.language.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.language.description")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-language">
                {t("settings.language.label")}
              </Label>
              <Select value={locale} onValueChange={() => setLocale("en-UG")}>
                <SelectTrigger id="display-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-UG">
                    {t("settings.language.enUG")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("settings.language.englishOnly")}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
