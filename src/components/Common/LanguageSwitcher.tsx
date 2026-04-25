import { Languages } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Language, useI18n } from "@/i18n"

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="px-2 group-data-[collapsible=icon]:px-0">
      <Select
        value={language}
        onValueChange={(value) => setLanguage(value as Language)}
      >
        <SelectTrigger
          aria-label={t("language")}
          className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
        >
          <Languages className="size-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="pl">Polski</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
