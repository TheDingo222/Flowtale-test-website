'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Bell, LogOut, User, Settings } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavbarProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export default function Navbar({ user }: NavbarProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const navLinks = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/expenses', label: t('expenses') },
    { href: '/approvals', label: t('approvals') },
    { href: '/reports', label: t('reports') },
    { href: '/archive', label: t('archive') },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <nav className="bg-[#1a3a4a] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Left: Logo + nav links */}
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg tracking-tight whitespace-nowrap">
            Receipt App
          </span>
          <div className="flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap ${
                  isActive(link.href)
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user.role === 'OWNER' && (
              <Link
                href="/settings/users"
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  isActive('/settings')
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings size={14} />
                {t('settings')}
              </Link>
            )}
          </div>
        </div>

        {/* Right: language switcher, bell, avatar */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button className="text-white/70 hover:text-white p-1">
            <Bell size={18} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarFallback className="bg-[#00a8c8] text-white text-xs font-medium">
                    {user.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.location.href = '/profile'}
                className="flex items-center gap-2 cursor-pointer"
              >
                <User size={14} />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut size={14} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
