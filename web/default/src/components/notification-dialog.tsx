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
import { Bell, Megaphone, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAnnouncementColorClass } from '@/lib/colors'
import { formatDateTimeObject } from '@/lib/time'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Markdown } from '@/components/ui/markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AnnouncementItem {
  type?: string
  content?: string
  extra?: string
  publishDate?: string | Date
}

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notice: string
  announcements: AnnouncementItem[]
  loading: boolean
  onCloseToday: () => void
}

type NotificationDialogTab = 'notice' | 'announcements' | 'price-changes'

function EmptyState(props: { icon: React.ReactNode; title: string }) {
  return (
    <Empty className='min-h-64 border-0 p-4'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{props.icon}</EmptyMedia>
        <EmptyTitle>{props.title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

function AnnouncementDot({ type }: { type?: string }) {
  return (
    <span
      className={cn(
        'mt-1.5 inline-block size-2 shrink-0 rounded-full',
        getAnnouncementColorClass(type)
      )}
    />
  )
}

function NoticePanel(props: {
  notice: string
  loading: boolean
  emptyText: string
  loadingText: string
}) {
  if (props.loading) {
    return <EmptyState icon={<Bell />} title={props.loadingText} />
  }

  if (!props.notice) {
    return <EmptyState icon={<Bell />} title={props.emptyText} />
  }

  return (
    <ScrollArea className='h-[50vh] pr-4'>
      <Markdown>{props.notice}</Markdown>
    </ScrollArea>
  )
}

function AnnouncementsPanel(props: {
  announcements: AnnouncementItem[]
  loading: boolean
  emptyText: string
  loadingText: string
}) {
  if (props.loading) {
    return <EmptyState icon={<Megaphone />} title={props.loadingText} />
  }

  if (props.announcements.length === 0) {
    return <EmptyState icon={<Megaphone />} title={props.emptyText} />
  }

  return (
    <ScrollArea className='h-[50vh] pr-4'>
      <div className='flex flex-col'>
        {props.announcements.map((item, idx) => {
          const publishDate = item.publishDate ? new Date(item.publishDate) : null
          const publishTime =
            publishDate && !Number.isNaN(publishDate.getTime())
              ? formatDateTimeObject(publishDate)
              : ''

          return (
            <div key={idx}>
              <div className='py-3'>
                <div className='flex items-start gap-3'>
                  <AnnouncementDot type={item.type} />
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <div className='text-sm'>
                      <Markdown>{item.content || ''}</Markdown>
                    </div>
                    {item.extra ? (
                      <div className='text-muted-foreground text-xs'>
                        <Markdown>{item.extra}</Markdown>
                      </div>
                    ) : null}
                    {publishTime ? (
                      <div className='text-muted-foreground text-xs'>
                        {publishTime}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {idx < props.announcements.length - 1 ? <Separator /> : null}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

export function NotificationDialog(props: NotificationDialogProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] =
    useState<NotificationDialogTab>('notice')

  const initialTab = useMemo<NotificationDialogTab>(() => {
    if (props.notice) return 'notice'
    if (props.announcements.length > 0) return 'announcements'
    return 'notice'
  }, [props.notice, props.announcements.length])

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setActiveTab(initialTab)
    }
    props.onOpenChange(open)
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-hidden sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('System Announcements')}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as NotificationDialogTab)
          }
          className='gap-2'
        >
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='notice' className='gap-1.5'>
              <Bell className='size-3.5' />
              {t('Notice')}
            </TabsTrigger>
            <TabsTrigger value='announcements' className='gap-1.5'>
              <Megaphone className='size-3.5' />
              {t('Timeline')}
            </TabsTrigger>
            <TabsTrigger value='price-changes' className='gap-1.5'>
              <TrendingUp className='size-3.5' />
              {t('Price Changes')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='notice' className='mt-4'>
            <NoticePanel
              notice={props.notice}
              loading={props.loading}
              emptyText={t('No announcements at this time')}
              loadingText={t('Loading...')}
            />
          </TabsContent>
          <TabsContent value='announcements' className='mt-4'>
            <AnnouncementsPanel
              announcements={props.announcements}
              loading={props.loading}
              emptyText={t('No system announcements')}
              loadingText={t('Loading...')}
            />
          </TabsContent>
          <TabsContent value='price-changes' className='mt-4'>
            <EmptyState
              icon={<TrendingUp />}
              title={t('No price changes at this time')}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant='outline' onClick={props.onCloseToday}>
            {t('Close Today')}
          </Button>
          <Button onClick={() => props.onOpenChange(false)}>
            {t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
