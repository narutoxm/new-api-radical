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
import * as z from 'zod'

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface AffiliateSite {
  id: number
  domain: string
  inviter_id: number
  description: string
  enabled: boolean
  created_at: number
  updated_at: number
}

export interface AffiliateSitePayload {
  domain: string
  inviter_id: number
  description: string
  enabled: boolean
}

export const affiliateSiteFormSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  inviter_id: z.coerce.number().int().positive('User ID is required'),
  description: z.string().optional().default(''),
  enabled: z.boolean().default(true),
})

export type AffiliateSiteFormValues = z.infer<typeof affiliateSiteFormSchema>
