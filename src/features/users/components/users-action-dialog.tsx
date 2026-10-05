import { z } from 'zod'
import type { AxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { editUser, saveUser } from '@/services/user.service'
import { isValidPhoneNumber } from 'react-phone-number-input'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { PasswordInput } from '@/components/input-password'
import { SelectDropdown } from '@/components/select-dropdown'
import { roles } from '@/features/users/data/data'
import { MemberRoleSchema, type UserResponse } from '@chat-crm/contracts'

// v2: `users` is identity only (no role). The form keeps the role selector
// until user management moves to `company-members`; the value is omitted
// from /users payloads (the API strips unknown keys).
type User = UserResponse & {
  role?: z.infer<typeof MemberRoleSchema>
  status?: string
}

const formSchema = z
  .object({
    firstName: z.string().min(1, 'First Name is required.'),
    lastName: z.string().min(1, 'Last Name is required.'),
    username: z.string().min(1, 'Username is required.'),
    phoneNumber: z.string().min(1, 'Phone number is required.'),
    email: z.email({
      error: (iss) => (iss.input === '' ? 'Email is required.' : undefined),
    }),
    password: z.string().transform((pwd) => pwd?.trim()),
    role: MemberRoleSchema,
    confirmPassword: z.string().transform((pwd) => pwd.trim()),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isEdit && !data.password) return true
      return data.password.length > 0
    },
    {
      message: 'Password is required.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, phoneNumber }) => {
      if (isEdit) return true
      return phoneNumber.trim().length > 0
    },
    {
      message: 'Phone number is required.',
      path: ['phoneNumber'],
    }
  )
  .refine(
    ({ phoneNumber }) => {
      if (phoneNumber.charAt(0) !== '+') {
        phoneNumber = `+${phoneNumber}`
      }
      return isValidPhoneNumber(`${phoneNumber}`)
    },
    {
      message: 'Not is a valid number phone',
      path: ['phoneNumber'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return password.length >= 8
    },
    {
      message: 'Password must be at least 8 characters long.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /[a-z]/.test(password)
    },
    {
      message: 'Password must contain at least one lowercase letter.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /\d/.test(password)
    },
    {
      message: 'Password must contain at least one number.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password, confirmPassword }) => {
      if (isEdit && !password) return true
      return password === confirmPassword
    },
    {
      message: "Passwords don't match.",
      path: ['confirmPassword'],
    }
  )

type UserForm = z.infer<typeof formSchema>

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow
  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          firstName: currentRow.firstName ?? '',
          lastName: currentRow.lastName ?? '',
          username: currentRow.username,
          phoneNumber: currentRow.phoneNumber ?? '',
          email: currentRow.email ?? '',
          password: '',
          role: currentRow.role ?? 'agent',
          confirmPassword: '',
          isEdit,
        }
      : {
          firstName: '',
          lastName: '',
          username: '',
          phoneNumber: '',
          email: '',
          password: '',
          role: 'agent',
          confirmPassword: '',
          isEdit,
        },
  })

  const onSubmit = (data: UserForm) => {
    const toastConfig = {
      error: (err: AxiosError) => {
        if (import.meta.env.DEV) console.log('ERROR [DEV]: ', err)
        const responseData = err.response?.data as {
          error: string
          message: string | string[]
          statusCode: number
        }
        return Array.isArray(responseData.message)
          ? responseData.message[0]
          : responseData.message
      },
    }

    let fn: Promise<any>
    let successMessage: string
    let loadingMessage: string

    if (isEdit) {
      const dirtyFields = form.formState.dirtyFields
      const valuesToSend: Partial<
        Omit<UserForm, 'confirmPassword' | 'isEdit'>
      > = {}

      for (const key in dirtyFields) {
        if (dirtyFields[key as keyof UserForm]) {
          const fieldKey = key as keyof UserForm
          // v2: role lives in company-members, not /users. Skip it here.
          if (
            fieldKey !== 'confirmPassword' &&
            fieldKey !== 'isEdit' &&
            fieldKey !== 'role'
          ) {
            ;(valuesToSend as any)[fieldKey] = data[fieldKey]
          }
        }
      }

      if (Object.keys(valuesToSend).length === 0) {
        toast.info('No hay cambios para guardar.')
        onOpenChange(false)
        return
      }

      fn = editUser(currentRow.id, valuesToSend)
      loadingMessage = 'Actualizando...'
      successMessage = 'El usuario se actualizó correctamente'
    } else {
      const valuesToSend = {
        ...data,
      }
      delete (valuesToSend as any).confirmPassword
      // v2: role lives in company-members, not /users.
      delete (valuesToSend as any).role
      delete (valuesToSend as any).isEdit

      fn = saveUser(valuesToSend)
      loadingMessage = 'Guardando...'
      successMessage = 'El usuario se guardo correctamente'
    }

    toast.promise(fn, {
      loading: loadingMessage,
      success: (_data) => {
        form.reset()
        queryClient.invalidateQueries({
          queryKey: ['users', 'table'],
        })
        onOpenChange(false)
        return successMessage
      },
      ...toastConfig,
    })
  }

  const isPasswordTouched = !!form.formState.dirtyFields.password

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the user here. ' : 'Create new user here. '}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className='h-fit w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='John'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Doe'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john-doe'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john.doe@gmail.com'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex flex-col justify-between gap-4 sm:grid sm:grid-cols-5'>
                <FormField
                  control={form.control}
                  name='phoneNumber'
                  render={({ field }) => {
                    const valueInE164 = field.value
                      ? field.value.startsWith('+')
                        ? field.value
                        : `+${field.value}`
                      : undefined

                    return (
                      <FormItem className='col-span-3'>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={valueInE164}
                            onChange={field.onChange ?? ''}
                            className='w-full'
                            defaultCountry='PE'
                            international={false}
                            placeholder='987 654 321'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name='role'
                  render={({ field }) => (
                    <FormItem className='col-span-2'>
                      <FormLabel>Role</FormLabel>
                      <SelectDropdown
                        defaultValue={roles.agent.value}
                        onValueChange={field.onChange}
                        placeholder='Select a role'
                        className='w-full'
                        items={Object.values(roles).map(
                          ({ label, value }, i) => ({
                            key: `${value}-${i}`,
                            label,
                            value,
                          })
                        )}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder='e.g., S3cur3P@ssw0rd'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        disabled={!isPasswordTouched}
                        placeholder='e.g., S3cur3P@ssw0rd'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form'>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
