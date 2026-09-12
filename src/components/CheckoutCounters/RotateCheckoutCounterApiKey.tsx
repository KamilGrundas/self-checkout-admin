import { useMutation } from "@tanstack/react-query"
import { KeyRound } from "lucide-react"
import { useState } from "react"

import { accessToken } from "@/auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { handleError } from "@/utils"

interface RotateCheckoutCounterApiKeyProps {
  id: string
  onSuccess: () => void
}

const RotateCheckoutCounterApiKey = ({
  id,
  onSuccess,
}: RotateCheckoutCounterApiKeyProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const { showErrorToast } = useCustomToast()
  const { t } = useI18n()

  const close = () => {
    setCreatedKey(null)
    setIsOpen(false)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/checkout-counters/${id}/api-key/rotate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken()}` },
        },
      )
      if (!response.ok)
        throw new Error("Failed to rotate checkout counter API key")
      return response.json() as Promise<{ api_key: string }>
    },
    onSuccess: ({ api_key }) => {
      setCreatedKey(api_key)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setIsOpen(true)
        else close()
      }}
    >
      <DropdownMenuItem
        onSelect={(event) => event.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <KeyRound />
        {t("rotateCounterKey")}
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        {createdKey ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("rotateCounterKey")}</DialogTitle>
              <DialogDescription>{t("apiKeyOnce")}</DialogDescription>
            </DialogHeader>
            <Input value={createdKey} readOnly type="password" />
            <DialogFooter>
              <Button
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([`${createdKey}\n`], { type: "text/plain" }),
                  )
                  const link = document.createElement("a")
                  link.href = url
                  link.download = "self-checkout-counter-api-key.token"
                  link.click()
                  setTimeout(() => URL.revokeObjectURL(url), 1000)
                }}
              >
                {t("apiKeyDownload")}
              </Button>
              <Button variant="outline" onClick={close}>
                {t("apiKeySaved")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("rotateCounterKey")}</DialogTitle>
              <DialogDescription>
                {t("rotateCounterKeyDescription")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <LoadingButton
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {t("rotateCounterKey")}
              </LoadingButton>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default RotateCheckoutCounterApiKey
