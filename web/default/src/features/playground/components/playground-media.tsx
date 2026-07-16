/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useRef, useState } from 'react'
import {
  DownloadIcon,
  ImageIcon,
  InfoIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  VideoIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GroupSelector, ModelSelector } from '@/components/model-group-selector'
import { sendImageEdit, sendImageGeneration } from '../api'
import type {
  GroupOption,
  ImageGenerationData,
  ImageGenerationRequest,
  ModelOption,
} from '../types'

type MediaMode = 'image' | 'video'

interface PlaygroundMediaProps {
  mode: MediaMode
  models: ModelOption[]
  modelValue: string
  onModelChange: (value: string) => void
  isModelLoading?: boolean
  groups: GroupOption[]
  groupValue: string
  onGroupChange: (value: string) => void
}

interface ReferenceImage {
  id: string
  name: string
  dataUrl: string
  file: File
}

const imageRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const imageResolutions = ['2K', '4K'] as const
const imageCounts = ['1', '2', '4'] as const
const referenceImageModels = ['gpt-image-2', 'gpt-image-1.5'] as const
const maxReferenceImages = 5
const imageRatioDimensions: Record<
  (typeof imageRatios)[number],
  { width: number; height: number }
> = {
  '1:1': { width: 1, height: 1 },
  '16:9': { width: 16, height: 9 },
  '9:16': { width: 9, height: 16 },
  '4:3': { width: 4, height: 3 },
  '3:4': { width: 3, height: 4 },
}
const imageResolutionBase: Record<(typeof imageResolutions)[number], number> = {
  '2K': 2048,
  '4K': 4096,
}
const imageModelHints = [
  'sese-image',
  'image',
  'imagen',
  'dall',
  'gpt-image',
  'flux',
  'stable-diffusion',
  'midjourney',
]

function getImageModels(models: ModelOption[]) {
  return models.filter((model) => {
    const name = model.value.toLowerCase()
    return imageModelHints.some((hint) => name.includes(hint))
  })
}

function getPreferredImageModel(models: ModelOption[], modelValue: string) {
  if (models.some((model) => model.value === modelValue)) {
    return modelValue
  }
  return (
    models.find((model) => model.value === 'sese-image')?.value ||
    models[0]?.value ||
    ''
  )
}

function getImageSize(
  ratio: (typeof imageRatios)[number],
  resolution: (typeof imageResolutions)[number]
) {
  const base = imageResolutionBase[resolution]
  const dimensions = imageRatioDimensions[ratio]
  if (dimensions.width === dimensions.height) {
    return `${base}x${base}`
  }
  if (dimensions.width > dimensions.height) {
    return `${base}x${Math.round((base * dimensions.height) / dimensions.width)}`
  }
  return `${Math.round((base * dimensions.width) / dimensions.height)}x${base}`
}

function downloadImage(src: string, index: number) {
  const link = document.createElement('a')
  link.href = src
  link.download = `playground-image-${index + 1}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function supportsReferenceImages(model: string) {
  const normalizedModel = model.trim().toLowerCase()
  return referenceImageModels.some(
    (supportedModel) => supportedModel === normalizedModel
  )
}

function createReferenceImageId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function createImageEditFormData(
  payload: ImageGenerationRequest,
  referenceImages: ReferenceImage[]
) {
  const formData = new FormData()
  formData.append('model', payload.model)
  formData.append('prompt', payload.prompt)
  if (payload.group) formData.append('group', payload.group)
  if (payload.n) formData.append('n', String(payload.n))
  if (payload.size) formData.append('size', payload.size)
  if (payload.quality) formData.append('quality', payload.quality)
  referenceImages.forEach((image, index) => {
    formData.append(index === 0 ? 'image' : `image[${index}]`, image.file)
  })
  return formData
}

export function PlaygroundMedia(props: PlaygroundMediaProps) {
  if (props.mode === 'video') {
    return <PlaygroundVideoComingSoon />
  }

  return <PlaygroundImage {...props} />
}

function PlaygroundImage({
  models,
  modelValue,
  onModelChange,
  isModelLoading = false,
  groups,
  groupValue,
  onGroupChange,
}: Omit<PlaygroundMediaProps, 'mode'>) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [imageRatio, setImageRatio] =
    useState<(typeof imageRatios)[number]>('1:1')
  const [imageResolution, setImageResolution] =
    useState<(typeof imageResolutions)[number]>('2K')
  const [imageCount, setImageCount] =
    useState<(typeof imageCounts)[number]>('1')
  const [isGenerating, setIsGenerating] = useState(false)
  const [images, setImages] = useState<ImageGenerationData[]>([])
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])

  const imageModels = useMemo(() => getImageModels(models), [models])
  const selectedModel = getPreferredImageModel(imageModels, modelValue)
  const hasModels = imageModels.length > 0
  const canUseReferenceImages = supportsReferenceImages(selectedModel)
  const isSubmitDisabled = !hasModels || !prompt.trim() || isGenerating

  const handleGenerate = async () => {
    if (!hasModels || !prompt.trim()) return

    setIsGenerating(true)
    try {
      const imageSize = getImageSize(imageRatio, imageResolution)
      const payload: ImageGenerationRequest = {
        model: selectedModel,
        group: groupValue,
        prompt: prompt.trim(),
        n: Number(imageCount),
        size: imageSize,
        aspect_ratio: imageRatio,
        response_format: 'url',
      }
      const response =
        canUseReferenceImages && referenceImages.length > 0
          ? await sendImageEdit(
              createImageEditFormData(payload, referenceImages)
            )
          : await sendImageGeneration(payload)
      setImages(response.data || [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('Image generation failed')
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClear = () => {
    setPrompt('')
    setImages([])
    setReferenceImages([])
  }

  const handleAddReferenceImage = async (file: File | null) => {
    if (!file) return
    if (referenceImages.length >= maxReferenceImages) {
      toast.error(
        t('You can add up to {{count}} reference images', {
          count: maxReferenceImages,
        })
      )
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('Only JPEG, PNG, and WebP images are supported'))
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setReferenceImages((currentImages) =>
        currentImages.length >= maxReferenceImages
          ? currentImages
          : [
              ...currentImages,
              {
                id: createReferenceImageId(),
                name: file.name,
                dataUrl,
                file,
              },
            ]
      )
    } catch {
      toast.error(t('Failed to read image file'))
    }
  }

  const handleRemoveReferenceImage = (id: string) => {
    setReferenceImages((currentImages) =>
      currentImages.filter((image) => image.id !== id)
    )
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='border-b px-4 py-3 md:px-6'>
        <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <ImageIcon className='text-muted-foreground size-4 shrink-0' />
            <span className='truncate text-sm font-medium'>{t('Image')}</span>
          </div>
          <Button
            disabled={
              !prompt && images.length === 0 && referenceImages.length === 0
            }
            onClick={handleClear}
            size='sm'
            variant='ghost'
          >
            <Trash2Icon data-icon='inline-start' />
            <span className='hidden sm:inline'>{t('Clear')}</span>
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-4 py-4 md:px-6'>
        <div className='mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[minmax(23rem,28rem)_minmax(0,1fr)] xl:grid-cols-[minmax(24rem,30rem)_minmax(0,1fr)]'>
          <div className='bg-background grid h-fit gap-4 rounded-lg border p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap'>
                <GroupSelector
                  selectedGroup={groupValue}
                  groups={groups}
                  onGroupChange={onGroupChange}
                  disabled={groups.length === 0 || isGenerating}
                />
                <ModelSelector
                  selectedModel={selectedModel}
                  models={imageModels}
                  onModelChange={onModelChange}
                  disabled={
                    isModelLoading || imageModels.length === 0 || isGenerating
                  }
                />
              </div>
              <SparklesIcon className='text-muted-foreground size-4 shrink-0' />
            </div>

            <div className='grid gap-1.5'>
              <Label className='text-muted-foreground text-xs'>
                {t('Creative prompt')}
              </Label>
              <Textarea
                className='min-h-36 resize-none'
                disabled={isGenerating}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t('Describe the image you want to generate')}
                value={prompt}
              />
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              <MediaSelect
                disabled={isGenerating}
                label={t('Aspect ratio')}
                options={imageRatios}
                value={imageRatio}
                onValueChange={(value) =>
                  setImageRatio(value as typeof imageRatio)
                }
              />
              <MediaSelect
                disabled={isGenerating}
                label={t('Resolution')}
                options={imageResolutions}
                value={imageResolution}
                onValueChange={(value) =>
                  setImageResolution(value as typeof imageResolution)
                }
              />
              <MediaSelect
                disabled={isGenerating}
                label={t('Cards')}
                options={imageCounts}
                value={imageCount}
                onValueChange={(value) =>
                  setImageCount(value as typeof imageCount)
                }
              />
            </div>

            {canUseReferenceImages && (
              <ReferenceImagesInput
                disabled={isGenerating}
                images={referenceImages}
                onAddImage={handleAddReferenceImage}
                onRemoveImage={handleRemoveReferenceImage}
              />
            )}

            {!hasModels && (
              <div className='border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-xs leading-relaxed'>
                {t('Current group has no available models')}
                <span className='ml-1'>
                  {t(
                    'Choose another group or ask an administrator to enable models.'
                  )}
                </span>
              </div>
            )}

            <Button disabled={isSubmitDisabled} onClick={handleGenerate}>
              {isGenerating ? (
                <Spinner data-icon='inline-start' />
              ) : (
                <SendIcon data-icon='inline-start' />
              )}
              {isGenerating ? t('Generating...') : t('Generate image')}
            </Button>
          </div>

          <div className='min-w-0'>
            {isGenerating ? (
              <div className='border-border/70 bg-background flex min-h-[32rem] items-center justify-center rounded-lg border border-dashed p-8 text-center'>
                <div className='flex flex-col items-center gap-3'>
                  <Spinner className='text-primary size-8' />
                  <div className='grid gap-1'>
                    <div className='text-sm font-medium'>
                      {t('Generating images...')}
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      {t('Your image is being generated')}
                    </div>
                  </div>
                </div>
              </div>
            ) : images.length > 0 ? (
              <div
                className={cn(
                  'grid gap-4',
                  images.length === 1
                    ? 'grid-cols-1'
                    : 'sm:grid-cols-2 xl:grid-cols-3'
                )}
              >
                {images.map((image, index) => {
                  const src = image.url
                    ? image.url
                    : image.b64_json
                      ? `data:image/png;base64,${image.b64_json}`
                      : ''
                  return (
                    <div
                      className='bg-background overflow-hidden rounded-lg border shadow-sm'
                      key={`${src}-${index}`}
                    >
                      <div className='flex items-center justify-between gap-3 border-b px-3 py-2'>
                        <div className='text-muted-foreground text-xs font-medium'>
                          {t('Card')} {index + 1}
                        </div>
                        {src && (
                          <div className='flex items-center gap-1.5'>
                            <Button
                              onClick={() => downloadImage(src, index)}
                              size='sm'
                              variant='ghost'
                            >
                              <DownloadIcon data-icon='inline-start' />
                              {t('Download')}
                            </Button>
                          </div>
                        )}
                      </div>
                      {src ? (
                        <div className='bg-muted/20 flex min-h-[34rem] items-center justify-center p-2'>
                          <img
                            alt={image.revised_prompt || prompt}
                            className='max-h-[78vh] w-full object-contain'
                            src={src}
                          />
                        </div>
                      ) : (
                        <div className='border-border/70 flex min-h-[34rem] items-center justify-center border border-dashed'>
                          <ImageIcon className='text-muted-foreground size-8' />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='border-border/70 flex min-h-[32rem] items-center justify-center rounded-lg border border-dashed p-8 text-center'>
                <div className='grid gap-2'>
                  <ImageIcon className='text-muted-foreground mx-auto size-8' />
                  <div className='text-sm font-medium'>
                    {t('No images yet')}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('Generated images will appear here')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaygroundVideoComingSoon() {
  const { t } = useTranslation()

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='border-b px-4 py-3 md:px-6'>
        <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <VideoIcon className='text-muted-foreground size-4 shrink-0' />
            <span className='truncate text-sm font-medium'>{t('Video')}</span>
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-4 py-4 md:px-6'>
        <div className='mx-auto w-full max-w-7xl'>
          <div className='border-border/70 flex min-h-80 items-center justify-center rounded-lg border border-dashed p-8 text-center'>
            <div className='grid gap-2'>
              <VideoIcon className='text-muted-foreground mx-auto size-8' />
              <div className='text-sm font-medium'>
                {t('Under development')}
              </div>
              <div className='text-muted-foreground text-xs'>
                {t('Video tasks will appear here')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MediaSelectProps {
  label: string
  options: readonly string[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

function MediaSelect({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
}: MediaSelectProps) {
  return (
    <div className='grid gap-1.5'>
      <Label className='text-muted-foreground text-xs'>{label}</Label>
      <Select
        disabled={disabled}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue)
        }}
      >
        <SelectTrigger className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

interface ReferenceImagesInputProps {
  images: ReferenceImage[]
  disabled?: boolean
  onAddImage: (file: File | null) => void
  onRemoveImage: (id: string) => void
}

function ReferenceImagesInput({
  images,
  disabled = false,
  onAddImage,
  onRemoveImage,
}: ReferenceImagesInputProps) {
  const { t } = useTranslation()
  const canAddMore = images.length < maxReferenceImages

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <Label className='text-muted-foreground text-xs'>
          {t('Reference images')}
        </Label>
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon className='text-muted-foreground size-4' />
          </TooltipTrigger>
          <TooltipContent>
            {t(
              'gpt-image-2 and gpt-image-1.5 support reference images. Add up to 5 images.'
            )}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className='flex flex-col gap-2'>
        {images.map((image) => (
          <ReferenceImageRow
            key={image.id}
            disabled={disabled}
            image={image}
            onRemove={() => onRemoveImage(image.id)}
          />
        ))}
        {canAddMore && (
          <ReferenceImageRow disabled={disabled} onAddImage={onAddImage} />
        )}
      </div>
    </div>
  )
}

interface ReferenceImageRowProps {
  image?: ReferenceImage
  disabled?: boolean
  onAddImage?: (file: File | null) => void
  onRemove?: () => void
}

function ReferenceImageRow({
  image,
  disabled = false,
  onAddImage,
  onRemove,
}: ReferenceImageRowProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const isSelected = Boolean(image)

  const openFilePicker = () => {
    if (!disabled && !isSelected) {
      inputRef.current?.click()
    }
  }

  return (
    <div className='relative' role='group'>
      <div className='border-border bg-background flex items-center gap-2 rounded-lg border p-1.5 transition-colors'>
        <button
          aria-label={t('Select')}
          className='bg-muted/40 hover:bg-muted flex h-9 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md transition-colors disabled:cursor-not-allowed'
          disabled={disabled}
          onClick={openFilePicker}
          type='button'
        >
          {image ? (
            <img
              alt=''
              className='size-full object-cover'
              src={image.dataUrl}
            />
          ) : (
            <ImageIcon className='text-muted-foreground size-4' />
          )}
        </button>
        <Input
          className='h-8 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0'
          disabled={disabled || isSelected}
          onClick={openFilePicker}
          placeholder={t('Add reference image')}
          readOnly
          value={image?.name || ''}
        />
        <input
          ref={inputRef}
          accept='image/jpeg,image/png,image/webp'
          className='hidden'
          disabled={disabled}
          onChange={(event) => {
            onAddImage?.(event.target.files?.[0] || null)
            event.target.value = ''
          }}
          type='file'
        />
        {image ? (
          <Button
            className='h-8 shrink-0'
            disabled={disabled}
            onClick={onRemove}
            size='sm'
            type='button'
            variant='destructive'
          >
            {t('Delete')}
          </Button>
        ) : (
          <Button
            className='h-8 shrink-0'
            disabled={disabled}
            onClick={openFilePicker}
            size='sm'
            type='button'
            variant='outline'
          >
            {t('Select')}
          </Button>
        )}
      </div>
    </div>
  )
}
