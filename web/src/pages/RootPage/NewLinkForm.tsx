import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/Toast/useToast'
import { useCreateLinkMutation } from '../../hooks/useLinksApi'
import { ApiError } from '../../lib/api-client'

const SLUG_REGEX = /^[a-zA-Z0-9-_]{1,60}$/

function normalizeOriginalUrl(value: string): string | null {
  const trimmed = value.trim()
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    new URL(candidate)
    return candidate
  } catch {
    return null
  }
}

const formSchema = z.object({
  originalUrl: z
    .string()
    .min(1, 'Informe o link original.')
    .refine((value) => normalizeOriginalUrl(value) !== null, {
      message: 'Informe uma URL válida.',
    }),
  shortUrl: z
    .string()
    .min(1, 'Informe o link encurtado.')
    .regex(
      SLUG_REGEX,
      'Use apenas letras, números, hífen e underline (máx. 60 caracteres).',
    ),
})

type NewLinkFormValues = z.infer<typeof formSchema>

export function NewLinkForm() {
  const shortUrlInputId = useId()
  const { show } = useToast()
  const createLinkMutation = useCreateLinkMutation()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<NewLinkFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: { originalUrl: '', shortUrl: '' },
  })

  const originalUrl = watch('originalUrl')
  const shortUrl = watch('shortUrl')
  const isEmpty = !originalUrl?.trim() || !shortUrl?.trim()
  const isDisabled = isEmpty || !isValid || createLinkMutation.isPending

  function onSubmit(values: NewLinkFormValues) {
    const normalizedUrl = normalizeOriginalUrl(values.originalUrl)

    if (!normalizedUrl) {
      return
    }

    createLinkMutation.mutate(
      { originalUrl: normalizedUrl, shortUrl: values.shortUrl },
      {
        onSuccess: () => {
          reset()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setError('shortUrl', { message: error.message })
            return
          }

          show(
            error instanceof Error ? error.message : 'Erro ao criar link.',
            'error',
          )
        },
      },
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <h2 className="text-lg font-bold text-gray-600">Novo link</h2>

      <Input
        label="Link original"
        placeholder="www.exemplo.com.br"
        error={errors.originalUrl?.message}
        {...register('originalUrl')}
      />

      <div className="flex flex-col gap-2">
        <label
          htmlFor={shortUrlInputId}
          className={`text-xs font-semibold uppercase ${
            errors.shortUrl ? 'text-danger' : 'text-gray-500'
          }`}
        >
          Link encurtado
        </label>
        <div
          className={`flex items-center rounded-lg border px-4 py-3 focus-within:border-blue-base ${
            errors.shortUrl ? 'border-danger' : 'border-gray-300'
          }`}
        >
          <span className="text-md text-gray-400">brev.ly/</span>
          <input
            id={shortUrlInputId}
            className="w-full text-md text-gray-600 outline-none"
            {...register('shortUrl')}
          />
        </div>
        {errors.shortUrl && (
          <span className="text-sm text-danger">{errors.shortUrl.message}</span>
        )}
      </div>

      <Button type="submit" disabled={isDisabled}>
        Salvar link
      </Button>
    </form>
  )
}
