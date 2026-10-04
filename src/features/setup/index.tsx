import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthLayout } from '@/features/auth/auth-layout'
import { getApiErrorMessage } from '@/lib/api-error'
import { login } from '@/services/auth.service'
import {
  getSetupStatus,
  runSetup,
  type SetupPayload,
  type SetupResult,
} from '@/services/setup.service'
import { SetupWizard } from './components/setup-wizard'

export function SetupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [result, setResult] = useState<SetupResult | null>(null)

  const { data: status, isLoading } = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: getSetupStatus,
    staleTime: 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: async (payload: SetupPayload) => {
      const created = await runSetup(payload)
      // Auto-login con las credenciales que acaba de definir el wizard.
      await login({
        username: payload.admin.username,
        password: payload.admin.password,
      })
      return created
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['setup', 'status'] })

      if (created.whatsapp) {
        setResult(created)
        return
      }

      navigate({ to: '/' })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'No se pudo completar la configuración')
      )
    },
  })

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Configura tu CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !status ? (
            <div
              role='status'
              aria-busy='true'
              aria-live='polite'
              className='flex h-32 items-center justify-center'
            >
              <Loader2
                aria-hidden
                className='text-muted-foreground size-6 animate-spin'
              />
              <span className='sr-only'>Cargando configuración…</span>
            </div>
          ) : (
            <SetupWizard
              status={status}
              isPending={mutation.isPending}
              result={result}
              onSubmit={(payload) => {
                mutation.mutate(payload)
              }}
              onFinish={() => navigate({ to: '/' })}
            />
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
