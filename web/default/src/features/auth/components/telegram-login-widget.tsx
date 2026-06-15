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
import { useEffect, useId, useRef } from 'react'

type TelegramAuthPayload = Record<string, string | number | undefined>

declare global {
  interface Window {
    TelegramLoginWidget?: {
      onAuth?: (payload: TelegramAuthPayload) => void
      [callbackName: string]:
        | ((payload: TelegramAuthPayload) => void)
        | undefined
    }
  }
}

type TelegramLoginWidgetProps = {
  botName: string
  onAuth: (payload: TelegramAuthPayload) => void
}

export function TelegramLoginWidget({
  botName,
  onAuth,
}: TelegramLoginWidgetProps) {
  const widgetId = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !botName) return

    container.innerHTML = ''

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botName.replace(/^@/, ''))
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')

    const callbackName = `onTelegramAuth_${widgetId}`
    window.TelegramLoginWidget = window.TelegramLoginWidget || {}
    window.TelegramLoginWidget[callbackName] = onAuth
    script.setAttribute(
      'data-onauth',
      `TelegramLoginWidget.${callbackName}(user)`
    )

    container.appendChild(script)

    return () => {
      container.innerHTML = ''
      if (window.TelegramLoginWidget) {
        delete window.TelegramLoginWidget[callbackName]
      }
    }
  }, [botName, onAuth, widgetId])

  return <div ref={containerRef} className='flex justify-center' />
}
