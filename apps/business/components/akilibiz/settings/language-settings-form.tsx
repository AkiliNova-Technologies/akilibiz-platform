"use client";

import { toast } from "sonner";
import { Languages } from "lucide-react";

import { type SupportedLocale } from "@/components/akilibiz/settings/language-settings-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  isDirty: boolean;
  loading: boolean;
  locale: SupportedLocale;
  onReset: () => void;
  onSave: () => Promise<void>;
  onSelect: (locale: SupportedLocale) => void;
};

export function LanguageSettingsForm({
  isDirty,
  loading,
  locale,
  onReset,
  onSave,
  onSelect,
}: Props) {
  const save = async () => {
    await onSave();
    toast.success("Language preference saved");
  };
  return (
    <Card className="max-w-2xl">
      <CardContent className="space-y-5">
        <div className="flex gap-3">
          <Languages className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">Language</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the language used by AkiliBiz on this device.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-language">Display language</Label>
          <Select
            value={locale}
            onValueChange={(value) => onSelect(value as SupportedLocale)}>
            <SelectTrigger id="display-language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-UG">English (Uganda)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          English is the only production language currently available.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading || !isDirty}
            onClick={() => {
              onReset();
              toast.info("Language preference reset");
            }}>
            Reset
          </Button>
          <Button
            type="button"
            disabled={loading || !isDirty}
            onClick={() => void save()}>
            {loading ? "Saving…" : "Apply language"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
