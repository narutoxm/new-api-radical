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

export interface AffiliateStats {
  invited_count: number
  total_topup_money: number
  total_topup_quota: number
  total_used_quota: number
  reward_quota: number
  affiliate_code: string
  affiliate_enabled: boolean
}

export interface AffiliateSite {
  domain: string
  description: string
}

export interface AffiliateUser {
  id: number
  username: string
  display_name: string
  email: string
  group: string
  status: number
  quota: number
  used_quota: number
  created_at: number
}

export interface AffiliateUsersPage {
  page: number
  page_size: number
  total: number
  items: AffiliateUser[]
}

export interface AffiliateOverviewData {
  stats: AffiliateStats
  sites: AffiliateSite[]
  users: AffiliateUsersPage
}

export interface AffiliateOverviewResponse {
  success: boolean
  message?: string
  data?: AffiliateOverviewData
}
