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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import { toast } from 'sonner'
import {
  createAffiliateSite,
  deleteAffiliateSite,
  getAffiliateSites,
  updateAffiliateSite,
} from './api'
import type { AffiliateSitePayload } from './types'

const affiliateSitesQueryKey = ['affiliate-sites']

export function useAffiliateSites() {
  return useQuery({
    queryKey: affiliateSitesQueryKey,
    queryFn: async () => {
      const res = await getAffiliateSites()
      return res.data ?? []
    },
  })
}

function useInvalidateAffiliateSites() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: affiliateSitesQueryKey })
}

export function useCreateAffiliateSite() {
  const invalidate = useInvalidateAffiliateSites()
  return useMutation({
    mutationFn: (data: AffiliateSitePayload) => createAffiliateSite(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('Affiliate site created successfully'))
        invalidate()
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to create affiliate site'))
    },
  })
}

export function useUpdateAffiliateSite() {
  const invalidate = useInvalidateAffiliateSites()
  return useMutation({
    mutationFn: (data: AffiliateSitePayload & { id: number }) =>
      updateAffiliateSite(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('Affiliate site updated successfully'))
        invalidate()
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to update affiliate site'))
    },
  })
}

export function useDeleteAffiliateSite() {
  const invalidate = useInvalidateAffiliateSites()
  return useMutation({
    mutationFn: (id: number) => deleteAffiliateSite(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('Affiliate site deleted successfully'))
        invalidate()
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to delete affiliate site'))
    },
  })
}
