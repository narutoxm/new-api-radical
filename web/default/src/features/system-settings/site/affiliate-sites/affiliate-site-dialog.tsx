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
import { useEffect } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../../components/settings-form-layout'
import {
  useCreateAffiliateSite,
  useUpdateAffiliateSite,
} from './hooks'
import {
  affiliateSiteFormSchema,
  type AffiliateSite,
  type AffiliateSiteFormValues,
} from './types'

type AffiliateSiteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  site?: AffiliateSite | null
}

export function AffiliateSiteDialog(props: AffiliateSiteDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!props.site
  const createSite = useCreateAffiliateSite()
  const updateSite = useUpdateAffiliateSite()

  const form = useForm<AffiliateSiteFormValues>({
    resolver: zodResolver(
      affiliateSiteFormSchema
    ) as unknown as Resolver<AffiliateSiteFormValues>,
    defaultValues: {
      domain: '',
      inviter_id: 0,
      description: '',
      enabled: true,
    },
  })

  useEffect(() => {
    if (!props.open) return
    form.reset({
      domain: props.site?.domain ?? '',
      inviter_id: props.site?.inviter_id ?? 0,
      description: props.site?.description ?? '',
      enabled: props.site?.enabled ?? true,
    })
  }, [form, props.open, props.site])

  const onSubmit = async (values: AffiliateSiteFormValues) => {
    const payload = {
      domain: values.domain,
      inviter_id: values.inviter_id,
      description: values.description ?? '',
      enabled: values.enabled,
    }
    const res =
      isEditing && props.site
        ? await updateSite.mutateAsync({ id: props.site.id, ...payload })
        : await createSite.mutateAsync(payload)
    if (res.success) props.onOpenChange(false)
  }

  const isPending = createSite.isPending || updateSite.isPending

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('Edit Affiliate Site') : t('Add Affiliate Site')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Bind a domain to a user. Registrations from that domain will be counted as that user referrals.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name='domain'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Domain')}</FormLabel>
                  <FormControl>
                    <Input placeholder='agent.example.com' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Enter the domain without path. Protocol is optional.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='inviter_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Bound User ID')}</FormLabel>
                  <FormControl>
                    <Input type='number' min={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('New users from this domain will use this user as inviter.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Description')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('Optional note')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='enabled'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enabled')}</FormLabel>
                    <FormDescription>
                      {t('Use this domain for referral attribution.')}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </SettingsSwitchItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => props.onOpenChange(false)}
                disabled={isPending}
              >
                {t('Cancel')}
              </Button>
              <Button type='submit' disabled={isPending}>
                {isEditing ? t('Save Changes') : t('Create')}
              </Button>
            </DialogFooter>
          </SettingsForm>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
