import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  type CheckoutCounterPublic,
  CheckoutCountersService,
  type CheckoutCounterUpdate,
} from "@/client"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "Counter name is required" }),
  password: z.string().optional(),
  ml_mode: z.enum(["off", "label", "on"]),
  shelf_camera_device_id: z.string().optional(),
  scale_camera_device_id: z.string().optional(),
  language: z.string().min(2).max(8),
})

type FormData = z.infer<typeof formSchema>

interface EditCheckoutCounterProps {
  counter: CheckoutCounterPublic
  onSuccess: () => void
}

const EditCheckoutCounter = ({
  counter,
  onSuccess,
}: EditCheckoutCounterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { t } = useI18n()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: counter.name,
      password: "",
      ml_mode: counter.ml_mode ?? "off",
      shelf_camera_device_id: counter.shelf_camera_device_id ?? "",
      scale_camera_device_id: counter.scale_camera_device_id ?? "",
      language: counter.language ?? "pl",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const requestBody: CheckoutCounterUpdate = {
        name: data.name,
        password: data.password || undefined,
        ml_mode: data.ml_mode,
        shelf_camera_device_id: data.shelf_camera_device_id?.trim() || null,
        scale_camera_device_id: data.scale_camera_device_id?.trim() || null,
        language: data.language,
      }
      return CheckoutCountersService.updateCheckoutCounter({
        id: counter.id,
        requestBody,
      })
    },
    onSuccess: () => {
      showSuccessToast(t("counterUpdated"))
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-counters"] })
    },
  })

  const onSubmit = (data: FormData) => mutation.mutate(data)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem
        onSelect={(e) => e.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <Pencil />
        {t("editCounter")}
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{t("editCounter")}</DialogTitle>
              <DialogDescription>
                {t("updateCounterDescription")}
              </DialogDescription>
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("newPassword")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t("newPasswordHelp")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ml_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ML mode</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="off">off</SelectItem>
                        <SelectItem value="label">label</SelectItem>
                        <SelectItem value="on">on</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shelf_camera_device_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shelf camera device ID</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scale_camera_device_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scale camera device ID</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pl">pl</SelectItem>
                        <SelectItem value="en">en</SelectItem>
                      </SelectContent>
                    </Select>
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
      </DialogContent>
    </Dialog>
  )
}

export default EditCheckoutCounter
