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
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import dayjs from '@/lib/dayjs'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { SettingsSection } from '../../components/settings-section'
import { AffiliateSiteDialog } from './affiliate-site-dialog'
import { useAffiliateSites, useDeleteAffiliateSite } from './hooks'
import type { AffiliateSite } from './types'

export function AffiliateSitesSection() {
  const { t } = useTranslation()
  const { data: sites = [], isLoading } = useAffiliateSites()
  const deleteSite = useDeleteAffiliateSite()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<AffiliateSite | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AffiliateSite | null>(null)

  const handleCreate = () => {
    setEditingSite(null)
    setDialogOpen(true)
  }

  const handleEdit = (site: AffiliateSite) => {
    setEditingSite(site)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteSite.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <SettingsSection title={t('Affiliate Sites')}>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-muted-foreground text-sm'>
          {t('Bind domains to normal users for referral attribution.')}
        </p>
        <Button size='sm' onClick={handleCreate}>
          <Plus data-icon='inline-start' />
          {t('Add Affiliate Site')}
        </Button>
      </div>

      {isLoading ? (
        <div className='text-muted-foreground rounded-lg border px-4 py-8 text-center text-sm'>
          {t('Loading...')}
        </div>
      ) : sites.length === 0 ? (
        <EmptyState
          title={t('No affiliate sites')}
          description={t('Add a domain and bind it to a user first.')}
          bordered
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Domain')}</TableHead>
              <TableHead>{t('Bound User ID')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Description')}</TableHead>
              <TableHead>{t('Updated At')}</TableHead>
              <TableHead className='text-right'>{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell>
                  <StatusBadge
                    label={site.domain}
                    variant='neutral'
                    copyText={`https://${site.domain}`}
                  />
                </TableCell>
                <TableCell className='font-mono'>{site.inviter_id}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={site.enabled ? t('Enabled') : t('Disabled')}
                    variant={site.enabled ? 'success' : 'neutral'}
                    copyable={false}
                  />
                </TableCell>
                <TableCell className='text-muted-foreground max-w-[220px] truncate'>
                  {site.description || '-'}
                </TableCell>
                <TableCell>
                  {site.updated_at
                    ? dayjs(site.updated_at * 1000).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => handleEdit(site)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => setDeleteTarget(site)}
                    >
                      <Trash2 className='text-destructive' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AffiliateSiteDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingSite(null)
        }}
        site={editingSite}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('Delete Affiliate Site')}
        desc={t('Are you sure you want to delete "{{domain}}"?', {
          domain: deleteTarget?.domain || '',
        })}
        confirmText={t('Delete')}
        destructive
        handleConfirm={handleDelete}
        isLoading={deleteSite.isPending}
      />
    </SettingsSection>
  )
}
