import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Languages, Pencil } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { CategoriesService, type CategoryPublic } from "@/client"
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
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "Category name is required" }),
  name_en: z.string(),
  name_pl: z.string(),
})

type FormData = z.infer<typeof formSchema>

interface EditCategoryProps {
  category: CategoryPublic
  onSuccess: () => void
}

const EditCategory = ({ category, onSuccess }: EditCategoryProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showTranslations, setShowTranslations] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { language, t } = useI18n()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: category.name,
      name_en: category.name_en ?? "",
      name_pl: category.name_pl ?? "",
    },
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }
    form.reset({
      name: category.name,
      name_en: category.name_en ?? "",
      name_pl: category.name_pl ?? "",
    })
    setShowTranslations(false)
  }, [category, form, isOpen])

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const categoryUpdate = {
        ...(form.formState.dirtyFields.name ? { name: data.name } : {}),
        ...(showTranslations
          ? { name_en: data.name_en || null, name_pl: data.name_pl || null }
          : {}),
      }
      return CategoriesService.updateCategory({
        id: category.id,
        categoryUpdate,
        language,
      })
    },
    onSuccess: () => {
      showSuccessToast(t("categoryUpdated"))
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
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
        {t("editCategory")}
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{t("editCategory")}</DialogTitle>
              <DialogDescription>
                {t("updateCategoryDescription")}
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
                      <Input placeholder="Fruit" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                className="w-fit"
                type="button"
                variant="outline"
                onClick={() => setShowTranslations(true)}
              >
                <Languages className="mr-2" />
                {t("addTranslation")}
              </Button>
              {showTranslations && (
                <div className="grid gap-4 rounded-md border p-4">
                  <p className="text-sm font-medium">{t("translations")}</p>
                  <FormField
                    control={form.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("english")}</FormLabel>
                        <FormControl>
                          <Input placeholder="Fruit" type="text" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name_pl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("polish")}</FormLabel>
                        <FormControl>
                          <Input placeholder="Owoce" type="text" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
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

export default EditCategory
