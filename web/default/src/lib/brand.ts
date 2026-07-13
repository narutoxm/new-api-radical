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
  DEFAULT_LOGO,
  DEFAULT_SYSTEM_NAME,
  DOGCHAT_LOGO,
  DOGCHAT_SYSTEM_NAME,
} from './constants'

export function normalizeBrandName(
  name: unknown,
  fallback = DEFAULT_SYSTEM_NAME
): string {
  if (typeof name !== 'string') return fallback
  const trimmed = name.trim()
  if (!trimmed) return fallback
  return trimmed.toLowerCase() === 'dogchat' ? DOGCHAT_SYSTEM_NAME : trimmed
}

export function normalizeBrandLogo(
  logo: unknown,
  fallback = DEFAULT_LOGO
): string {
  if (typeof logo !== 'string') return fallback
  const trimmed = logo.trim()
  if (!trimmed) return fallback
  if (trimmed === '/logo.png' || trimmed === 'logo.png') return DOGCHAT_LOGO

  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(trimmed, window.location.href)
      if (
        parsed.origin === window.location.origin &&
        parsed.pathname === '/logo.png'
      ) {
        return DOGCHAT_LOGO
      }
    } catch {
      /* Ignore malformed URLs and keep the original value. */
    }
  }

  return trimmed
}

export function normalizeStatusBranding<T extends Record<string, unknown>>(
  status: T | null | undefined
): T {
  if (!status) return {} as T
  return {
    ...status,
    system_name: normalizeBrandName(status.system_name),
    logo: normalizeBrandLogo(status.logo),
  }
}
