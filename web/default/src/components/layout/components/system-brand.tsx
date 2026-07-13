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
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeBrandName } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { useSystemConfig } from '@/hooks/use-system-config'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type SystemBrandProps = {
  defaultName?: string
  defaultVersion?: string
  /**
   * Visual layout:
   * - 'sidebar': stacked card style (used inside the sidebar header).
   * - 'inline': compact horizontal pill (used inside the top app bar).
   */
  variant?: 'sidebar' | 'inline'
}

/**
 * System brand component
 * Displays current system logo + name.
 * - inline: compact pill in the top app bar; clicking navigates to home (/)
 * - sidebar: stacked card in the sidebar header (display only)
 */
export function SystemBrand(props: SystemBrandProps) {
  const { t } = useTranslation()
  const { logo, systemName } = useSystemConfig()

  const variant = props.variant ?? 'sidebar'
  const name = normalizeBrandName(systemName || props.defaultName)
  const slogans = useMemo(
    () => [
      t('Night is deep. The service stays awake.'),
      t('Wind moves through logs. The system holds.'),
      t('When requests arrive, I catch them.'),
      t('Complexity fades into the dark. Answers return on time.'),
      t('Bugs play like old songs. They stop here.'),
      t('Dream farther. I will keep now steady.'),
    ],
    [t]
  )
  const [sloganIndex, setSloganIndex] = useState(0)

  useEffect(() => {
    if (variant !== 'sidebar' || slogans.length <= 1) return

    const timer = window.setInterval(() => {
      setSloganIndex((current) => (current + 1) % slogans.length)
    }, 3500)

    return () => window.clearInterval(timer)
  }, [slogans.length, variant])

  if (variant === 'inline') {
    return (
      <Link
        to='/'
        aria-label={t('Go to home')}
        className={cn(
          'text-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium transition-colors outline-none select-none',
          'hover:bg-accent focus-visible:ring-ring/40 focus-visible:ring-2'
        )}
      >
        <div className='flex size-5 items-center justify-center overflow-hidden rounded-md'>
          <img
            src={logo}
            alt={t('Logo')}
            className='size-full rounded-md object-cover'
          />
        </div>
        <span className='max-w-[12rem] truncate'>{name}</span>
      </Link>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='hover:text-sidebar-foreground active:text-sidebar-foreground cursor-default hover:bg-transparent active:bg-transparent'
          render={<div />}
        >
          <div className='flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg'>
            <img
              src={logo}
              alt={t('Logo')}
              className='size-full rounded-lg object-cover'
            />
          </div>
          <div className='grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='truncate font-semibold'>{name}</span>
            <span className='text-sidebar-foreground/70 truncate text-xs'>
              <span className='relative block h-4 overflow-hidden'>
                <span
                  className='absolute inset-x-0 transition-transform duration-500 ease-in-out'
                  style={{
                    transform: `translateY(-${sloganIndex * 100}%)`,
                  }}
                >
                  {slogans.map((slogan) => (
                    <span
                      key={slogan}
                      className='block h-4 truncate leading-4'
                    >
                      {slogan}
                    </span>
                  ))}
                </span>
              </span>
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
