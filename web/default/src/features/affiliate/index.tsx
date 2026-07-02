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
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CircleDollarSign,
  Link,
  Share2,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import dayjs from '@/lib/dayjs'
import { formatCurrencyUSD, formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { getAffiliateOverview } from './api'
import type { AffiliateOverviewData } from './types'

const PAGE_SIZE = 10

function getReferralLink(code: string) {
  if (!code) return ''
  return `${window.location.origin}/sign-up?aff=${code}`
}

export function Affiliate() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AffiliateOverviewData | null>(null)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getAffiliateOverview(page, PAGE_SIZE)
      if (response.success && response.data) {
        setData(response.data)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const stats = data?.stats
  const users = data?.users
  const referralLink = useMemo(
    () => getReferralLink(stats?.affiliate_code ?? ''),
    [stats?.affiliate_code]
  )
  const totalPages = Math.max(1, Math.ceil((users?.total ?? 0) / PAGE_SIZE))

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('My Referrals')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-7xl flex-col gap-4'>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
              title={t('Invited Users')}
              value={stats?.invited_count ?? 0}
              icon={Users}
              loading={loading}
            />
            <MetricCard
              title={t('Top-up Amount')}
              value={formatCurrencyUSD(stats?.total_topup_money ?? 0)}
              icon={CircleDollarSign}
              loading={loading}
            />
            <MetricCard
              title={t('Used Quota')}
              value={formatQuota(stats?.total_used_quota ?? 0)}
              icon={WalletCards}
              loading={loading}
            />
            <MetricCard
              title={t('Display Revenue')}
              value={formatQuota(stats?.reward_quota ?? 0)}
              icon={Share2}
              loading={loading}
            />
          </div>

          <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.55fr)]'>
            <Card>
              <CardHeader>
                <CardTitle>{t('Referral Link')}</CardTitle>
                <CardDescription>
                  {t('Users who register through this link are bound to you.')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className='h-10 rounded-lg' />
                ) : referralLink ? (
                  <div className='flex items-center gap-2'>
                    <div className='bg-muted min-w-0 flex-1 truncate rounded-lg border px-3 py-2 font-mono text-xs'>
                      {referralLink}
                    </div>
                    <CopyButton value={referralLink} />
                  </div>
                ) : (
                  <div className='text-muted-foreground rounded-lg border px-3 py-2 text-sm'>
                    {t('Invite code is not enabled for this account.')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Bound Domains')}</CardTitle>
                <CardDescription>
                  {t('Users who register from these domains are bound to you.')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className='flex flex-col gap-2'>
                    <Skeleton className='h-7 rounded-md' />
                    <Skeleton className='h-7 rounded-md' />
                  </div>
                ) : data?.sites.length ? (
                  <div className='flex flex-wrap gap-2'>
                    {data.sites.map((site) => (
                      <StatusBadge
                        key={site.domain}
                        icon={Link}
                        label={site.domain}
                        variant='neutral'
                        copyText={`https://${site.domain}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className='text-muted-foreground rounded-lg border px-3 py-2 text-sm'>
                    {t('No bound domains yet.')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('Referred Users')}</CardTitle>
              <CardDescription>
                {t('Only users directly bound to your account are shown.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='flex flex-col gap-2'>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className='h-10 rounded-md' />
                  ))}
                </div>
              ) : users?.items.length ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('User')}</TableHead>
                        <TableHead>{t('Group')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                        <TableHead>{t('Used Quota')}</TableHead>
                        <TableHead>{t('Registered At')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.items.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className='min-w-0'>
                              <div className='truncate font-medium'>
                                {user.display_name || user.username}
                              </div>
                              <div className='text-muted-foreground truncate text-xs'>
                                {user.email || user.username}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge label={user.group} variant='neutral' />
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              label={
                                user.status === 1 ? t('Enabled') : t('Disabled')
                              }
                              variant={user.status === 1 ? 'success' : 'danger'}
                              copyable={false}
                            />
                          </TableCell>
                          <TableCell>{formatQuota(user.used_quota)}</TableCell>
                          <TableCell>
                            {user.created_at
                              ? dayjs(user.created_at * 1000).format(
                                  'YYYY-MM-DD HH:mm'
                                )
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className='mt-4 flex items-center justify-end gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page <= 1}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      {t('Previous')}
                    </Button>
                    <span className='text-muted-foreground text-sm tabular-nums'>
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      {t('Next')}
                    </Button>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Users}
                  title={t('No referred users')}
                  description={t('New users will appear here after registration.')}
                  bordered
                />
              )}
            </CardContent>
          </Card>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

function MetricCard(props: {
  title: string
  value: number | string
  icon: LucideIcon
  loading: boolean
}) {
  const Icon = props.icon
  return (
    <Card size='sm'>
      <CardContent className='flex items-center gap-3'>
        <div className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg border'>
          <Icon className='text-muted-foreground size-4' />
        </div>
        <div className='min-w-0'>
          <div className='text-muted-foreground truncate text-xs'>
            {props.title}
          </div>
          {props.loading ? (
            <Skeleton className='mt-1 h-5 w-24' />
          ) : (
            <div
              className={cn(
                'mt-0.5 truncate text-lg font-semibold tabular-nums'
              )}
            >
              {props.value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
