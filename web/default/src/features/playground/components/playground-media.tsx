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
import { useMemo, useState } from 'react'
import {
  ImageIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  VideoIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { GroupSelector, ModelSelector } from '@/components/model-group-selector'
import { sendImageGeneration } from '../api'
import type {
  GroupOption,
  ImageGenerationData,
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

const imageRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const imageResolutions = ['2K', '4K'] as const
const imageCounts = ['1', '2', '4'] as const
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
  const [imageRatio, setImageRatio] = useState<(typeof imageRatios)[number]>(
    '1:1'
  )
  const [imageResolution, setImageResolution] =
    useState<(typeof imageResolutions)[number]>('2K')
  const [imageCount, setImageCount] = useState<(typeof imageCounts)[number]>('1')
  const [isGenerating, setIsGenerating] = useState(false)
  const [images, setImages] = useState<ImageGenerationData[]>([])

  const imageModels = useMemo(() => getImageModels(models), [models])
  const selectedModel = getPreferredImageModel(imageModels, modelValue)
  const hasModels = imageModels.length > 0
  const isSubmitDisabled = !hasModels || !prompt.trim() || isGenerating

  const handleGenerate = async () => {
    if (!hasModels || !prompt.trim()) return

    setIsGenerating(true)
    try {
      const imageSize = getImageSize(imageRatio, imageResolution)
      const response = await sendImageGeneration({
        model: selectedModel,
        group: groupValue,
        prompt: prompt.trim(),
        n: Number(imageCount),
        size: imageSize,
        aspect_ratio: imageRatio,
        response_format: 'url',
      })
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
            disabled={!prompt && images.length === 0}
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
          <div className='grid h-fit gap-4 rounded-lg border bg-background p-4'>
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
                  disabled={isModelLoading || imageModels.length === 0 || isGenerating}
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
                label={t('Aspect ratio')}
                options={imageRatios}
                value={imageRatio}
                onValueChange={(value) => setImageRatio(value as typeof imageRatio)}
              />
              <MediaSelect
                label={t('Resolution')}
                options={imageResolutions}
                value={imageResolution}
                onValueChange={(value) =>
                  setImageResolution(value as typeof imageResolution)
                }
              />
              <MediaSelect
                label={t('Cards')}
                options={imageCounts}
                value={imageCount}
                onValueChange={(value) =>
                  setImageCount(value as typeof imageCount)
                }
              />
            </div>

            {!hasModels && (
              <div className='border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-xs leading-relaxed'>
                {t('Current group has no available models')}
                <span className='ml-1'>
                  {t('Choose another group or ask an administrator to enable models.')}
                </span>
              </div>
            )}

            <Button disabled={isSubmitDisabled} onClick={handleGenerate}>
              <SendIcon data-icon='inline-start' />
              {isGenerating ? t('Generating...') : t('Generate image')}
            </Button>
          </div>

          <div className='min-w-0'>
            {images.length > 0 ? (
              <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                {images.map((image, index) => {
                  const src = image.url
                    ? image.url
                    : image.b64_json
                      ? `data:image/png;base64,${image.b64_json}`
                      : ''
                  return (
                    <div
                      className='overflow-hidden rounded-lg border bg-background shadow-sm'
                      key={`${src}-${index}`}
                    >
                      <div className='border-b px-3 py-2 text-xs font-medium text-muted-foreground'>
                        {t('Card')} {index + 1}
                      </div>
                      {src ? (
                        <div className='flex min-h-[28rem] items-center justify-center bg-muted/20 p-2'>
                          <img
                            alt={image.revised_prompt || prompt}
                            className='max-h-[72vh] w-full object-contain'
                            src={src}
                          />
                        </div>
                      ) : (
                        <div className='border-border/70 flex min-h-[28rem] items-center justify-center border border-dashed'>
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
                  <div className='text-sm font-medium'>{t('No images yet')}</div>
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
}

function MediaSelect({
  label,
  options,
  value,
  onValueChange,
}: MediaSelectProps) {
  return (
    <div className='grid gap-1.5'>
      <Label className='text-muted-foreground text-xs'>{label}</Label>
      <Select
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
