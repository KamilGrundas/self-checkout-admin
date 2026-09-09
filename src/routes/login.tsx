import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { authConfig, startOidcLogin } from "@/auth"
import type { BodyLoginLoginAccessToken as AccessToken } from "@/client"
import { AuthLayout } from "@/components/Common/AuthLayout"
import { Button } from "@/components/ui/button"
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
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { useI18n } from "@/i18n"

const formSchema = z.object({
  username: z.email(),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
}) satisfies z.ZodType<AccessToken>

type FormData = z.infer<typeof formSchema>

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Log In - Self Checkout Admin",
      },
    ],
  }),
})

function Login() {
  const { loginMutation } = useAuth()
  const { t } = useI18n()
  const [ssoError, setSsoError] = useState(false)
  const config = useQuery({ queryKey: ["authConfig"], queryFn: authConfig })
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit = (data: FormData) => {
    if (loginMutation.isPending) return
    loginMutation.mutate(data)
  }

  if (!config.data)
    return (
      <AuthLayout>
        <p role="status">
          {config.isError ? t("ssoConfigFailed") : t("ssoCompleting")}
        </p>
      </AuthLayout>
    )
  if (config.data.mode === "oidc")
    return (
      <AuthLayout>
        <h1 className="text-2xl font-bold">{t("ssoTitle")}</h1>
        {ssoError && <p role="alert">{t("ssoFailed")}</p>}
        <Button
          onClick={() => void startOidcLogin().catch(() => setSsoError(true))}
        >
          {t("ssoSignIn")} {config.data.oidc?.label}
        </Button>
      </AuthLayout>
    )

  return (
    <AuthLayout>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Login to your account</h1>
          </div>

          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="email-input"
                      placeholder="user@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Password</FormLabel>
                    <RouterLink
                      to="/recover-password"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </RouterLink>
                  </div>
                  <FormControl>
                    <PasswordInput
                      data-testid="password-input"
                      placeholder="Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <LoadingButton type="submit" loading={loginMutation.isPending}>
              Log In
            </LoadingButton>
          </div>

          {config.data.signup_enabled && (
            <div className="text-center text-sm">
              Don't have an account yet?{" "}
              <RouterLink to="/signup" className="underline underline-offset-4">
                Sign up
              </RouterLink>
            </div>
          )}
        </form>
      </Form>
    </AuthLayout>
  )
}
