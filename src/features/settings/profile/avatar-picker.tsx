import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2 } from 'lucide-react'
import { AVATAR_MAX_BYTES } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { resolveMediaUrl } from '@/lib/media-url'
import { useAuthStore } from '@/stores/auth-store'
import { MonogramAvatar } from '@/components/data-grid'
import { userDisplayName } from '@/components/layout/copy'
import { Button } from '@/components/ui/button'
import { uploadAvatar } from '@/services/profile.service'
import { PROFILE_COPY } from '../copy'
import { resizeAvatar } from '../lib/resize-avatar'
import { syncSessionUser } from '../lib/session-user'

/**
 * Photo of the signed-in account. Picking a file resizes it here (256 px
 * WebP), shows it right away and uploads it; the rest of the profile form is
 * independent, so changing the photo never waits on "Guardar cambios".
 */
export function AvatarPicker() {
  const user = useAuthStore((state) => state.auth.user)
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Object URLs hold memory until released.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const resized = await resizeAvatar(file)
      if (resized.size > AVATAR_MAX_BYTES) throw new Error('avatar-too-big')

      setPreview(URL.createObjectURL(resized))
      return uploadAvatar(resized)
    },
    onSuccess: ({ avatarUrl }) => {
      syncSessionUser(queryClient, { avatarUrl })
      toast.success(PROFILE_COPY.avatarUploaded)
    },
    onError: (error: unknown) => {
      setPreview(null)
      toast.error(
        error instanceof Error && error.message === 'avatar-too-big'
          ? PROFILE_COPY.avatarTooBig
          : PROFILE_COPY.avatarFailed
      )
    },
  })

  if (!user) return null

  const name = userDisplayName(user)

  const onPick = (file: File | undefined) => {
    if (input.current) input.current.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(PROFILE_COPY.avatarNotImage)
      return
    }
    upload.mutate(file)
  }

  return (
    <div className='flex items-center gap-5'>
      <div className='relative'>
        <MonogramAvatar
          name={name}
          tintKey={user.id}
          src={preview ?? resolveMediaUrl(user.avatarUrl)}
          className='size-20 text-2xl'
        />
        {upload.isPending ? (
          <span
            role='status'
            className='bg-background/70 absolute inset-0 flex items-center justify-center rounded-full'
          >
            <Loader2 className='size-5 animate-spin motion-reduce:animate-none' />
            <span className='sr-only'>Subiendo foto</span>
          </span>
        ) : null}
      </div>
      <div className='space-y-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={upload.isPending}
          onClick={() => input.current?.click()}
        >
          <Camera className='size-4' />
          {PROFILE_COPY.avatarChange}
        </Button>
        <p className='text-muted-foreground max-w-xs text-[13px]'>
          {PROFILE_COPY.avatarHint}
        </p>
        <input
          ref={input}
          type='file'
          accept='image/*'
          className='sr-only'
          tabIndex={-1}
          aria-label='Elegir una foto de perfil'
          onChange={(event) => onPick(event.target.files?.[0])}
        />
      </div>
    </div>
  )
}
