import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "Counter name is required" }),
})

type FormData = z.infer<typeof formSchema>

const AddCheckoutCounter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { t } = useI18n()
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: { name: "" },
  })

  const close = () => {
    setCreatedKey(null)
    setIsOpen(false)
  }

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/checkout-counters/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      )
      if (!response.ok) throw new Error("Failed to create checkout counter")
      return response.json() as Promise<{ api_key: string }>
    },
    onSuccess: ({ api_key }) => {
      showSuccessToast(t("counterCreated"))
      form.reset()
      setCreatedKey(api_key)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-counters"] })
    },
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setIsOpen(true)
        else close()
      }}
    >
      <DialogTrigger asChild>
        <Button className="my-4">
          <Plus className="mr-2" />
          {t("addCounter")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {createdKey ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("apiKeyCreate")}</DialogTitle>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
              <DialogHeader>
                <DialogTitle>{t("addCounter")}</DialogTitle>
                <DialogDescription>{t("counterDescription")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("name")} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Main counter"
                          type="text"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={mutation.isPending}>
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <LoadingButton type="submit" loading={mutation.isPending}>
                  {t("save")}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddCheckoutCounter
