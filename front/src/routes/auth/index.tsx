import { createFileRoute, useNavigate } from '@tanstack/react-router'

import {
  AUTH_CARD_CLASS,
  AuthLayout,
} from '../../components/custom/authLayout.tsx'
import { Button } from '../../components/ui/button.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useLogin } from '../../queries/useAuth.ts'

export const Route = createFileRoute('/auth/')({
  component: Index,
})

function Index() {
  const navigate = useNavigate()

  const { loginMutation, isPending: isLoginPending } = useLogin()
  // Form de connexion
  const loginForm = useAppForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: ({ value }) => {
      loginMutation(
        { email: value.email, password: value.password },
        {
          onSuccess: async () => {
            const redirect = new URLSearchParams(window.location.search).get(
              'redirect',
            )
            // `/dashboard` a demenage sous /e/:establishmentId/s/:serviceId ;
            // `/` redirige vers le tableau de bord du
            // contexte par defaut sans avoir a le connaitre ici.
            await navigate({ to: redirect || '/' })
          },
        },
      )
    },
  })

  return (
    <AuthLayout>
      <div className={`${AUTH_CARD_CLASS} sm:right-8`}>
        <h2 className="text-left w-full text-2xl font-bold mb-8">
          S'identifier
        </h2>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await loginForm.handleSubmit()
          }}
          className="w-full flex flex-col gap-2"
        >
          <loginForm.AppField name="email">
            {(field) => <field.Input type="email" label="Email" />}
          </loginForm.AppField>

          <loginForm.AppField name="password">
            {(field) => <field.Password label="Mot de passe" />}
          </loginForm.AppField>

          <div className="w-full text-right -mt-2">
            <button
              type="button"
              onClick={() => navigate({ to: '/auth/forgot-password' })}
              className="cursor-pointer text-sm text-text-light hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={isLoginPending}
          >
            {isLoginPending ? 'Connexion...' : "S'identifier"}
          </Button>
        </form>

        <p className="text-sm text-text-light mt-4 text-center">
          Accès sur invitation de votre établissement.
        </p>
      </div>
    </AuthLayout>
  )
}
