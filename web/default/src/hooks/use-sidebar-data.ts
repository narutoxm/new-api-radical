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
import {
  Activity,
  Box,
  CreditCard,
  FileText,
  FlaskConical,
  Key,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Radio,
  Settings,
  Share2,
  Ticket,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type SidebarData } from '@/components/layout/types'
import { useTopupInfo } from '@/features/wallet/hooks'
import { DEFAULT_REDEMPTION_CODE_PURCHASE_URL } from '@/features/wallet/constants'

/**
 * Root navigation groups for the application sidebar.
 *
 * These are shown when the URL does not match any nested sidebar view
 * registered in `layout/lib/sidebar-view-registry.ts`.
 */
export function useSidebarData(): SidebarData {
  const { t } = useTranslation()
  const { topupInfo } = useTopupInfo()
  const redemptionCodePurchaseUrl =
    topupInfo?.topup_link?.trim() || DEFAULT_REDEMPTION_CODE_PURCHASE_URL

  return {
    navGroups: [
      {
        id: 'chat',
        title: t('Chat'),
        items: [
          {
            title: t('Playground'),
            url: '/playground',
            icon: FlaskConical,
            iconClassName: 'text-violet-500',
          },
          {
            title: t('Chat'),
            icon: MessageSquare,
            iconClassName: 'text-sky-500',
            type: 'chat-presets',
          },
        ],
      },
      {
        id: 'general',
        title: t('General'),
        items: [
          {
            title: t('Overview'),
            url: '/dashboard/overview',
            icon: Activity,
            iconClassName: 'text-green-500',
          },
          {
            title: t('Dashboard'),
            url: '/dashboard/models',
            icon: LayoutDashboard,
            iconClassName: 'text-blue-500',
          },
          {
            title: t('API Keys'),
            url: '/keys',
            icon: Key,
            iconClassName: 'text-orange-500',
          },
          {
            title: t('Usage Logs'),
            url: '/usage-logs/common',
            icon: FileText,
            iconClassName: 'text-gray-500',
          },
          {
            title: t('Task Logs'),
            url: '/usage-logs/task',
            activeUrls: ['/usage-logs/drawing'],
            configUrls: ['/usage-logs/drawing', '/usage-logs/task'],
            icon: ListTodo,
            iconClassName: 'text-teal-500',
          },
        ],
      },
      {
        id: 'personal',
        title: t('Personal'),
        items: [
          {
            title: t('Wallet'),
            url: '/wallet',
            icon: Wallet,
            iconClassName: 'text-amber-500',
          },
          {
            title: t('Referral Program'),
            url: '/affiliate',
            icon: Share2,
            iconClassName: 'text-pink-500',
          },
          {
            title: t('Profile'),
            url: '/profile',
            icon: User,
            iconClassName: 'text-slate-500',
          },
          {
            title: t('Card Top-up'),
            url: redemptionCodePurchaseUrl,
            external: true,
            configUrls: ['/wallet'],
            icon: CreditCard,
            iconClassName: 'text-emerald-500',
          },
        ],
      },
      {
        id: 'admin',
        title: t('Admin'),
        items: [
          {
            title: t('Channels'),
            url: '/channels',
            icon: Radio,
            iconClassName: 'text-cyan-500',
          },
          {
            title: t('Models'),
            url: '/models/metadata',
            icon: Box,
            iconClassName: 'text-purple-500',
          },
          {
            title: t('Users'),
            url: '/users',
            icon: Users,
            iconClassName: 'text-rose-500',
          },
          {
            title: t('Redemption Codes'),
            url: '/redemption-codes',
            icon: Ticket,
            iconClassName: 'text-lime-600',
          },
          {
            title: t('Subscription Management'),
            url: '/subscriptions',
            icon: CreditCard,
            iconClassName: 'text-yellow-500',
          },
          {
            title: t('System Settings'),
            url: '/system-settings/site',
            activeUrls: ['/system-settings'],
            icon: Settings,
            iconClassName: 'text-slate-500',
          },
        ],
      },
    ],
  }
}
