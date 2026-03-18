'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function LanguageSwitcher() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function switchLanguage(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1 text-xs text-white/60">
      <button
        onClick={() => switchLanguage('en')}
        disabled={isPending}
        className="hover:text-white transition-colors px-1"
      >
        EN
      </button>
      <span className="text-white/30">|</span>
      <button
        onClick={() => switchLanguage('da')}
        disabled={isPending}
        className="hover:text-white transition-colors px-1"
      >
        DA
      </button>
    </div>
  )
}
