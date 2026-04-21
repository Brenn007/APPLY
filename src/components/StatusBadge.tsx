import React from 'react'
import type { ApplicationStatus } from '../store/applyStore'

interface StatusBadgeProps {
  status: ApplicationStatus | string
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-dark-700 text-dark-300 border border-dark-600' },
  sent: { label: 'Envoyée', className: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
  seen: { label: 'Vue', className: 'bg-purple-900/40 text-purple-300 border border-purple-700/50' },
  interview: { label: 'Entretien', className: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50' },
  rejected: { label: 'Refusée', className: 'bg-red-900/40 text-red-300 border border-red-700/50' },
  accepted: { label: 'Acceptée', className: 'bg-green-900/40 text-green-300 border border-green-700/50' },
  new: { label: 'Nouveau', className: 'bg-primary-900/40 text-primary-300 border border-primary-700/50' },
  viewed: { label: 'Consulté', className: 'bg-dark-700 text-dark-300 border border-dark-600' },
  applied: { label: 'Postulé', className: 'bg-green-900/40 text-green-300 border border-green-700/50' }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-dark-700 text-dark-400 border border-dark-600' }

  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  )
}

export const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'bg-[#0077b5]/20 text-[#38bdf8] border border-[#0077b5]/30',
  indeed: 'bg-[#2164f3]/20 text-blue-300 border border-[#2164f3]/30',
  hellowork: 'bg-[#ff6b2b]/20 text-orange-300 border border-[#ff6b2b]/30',
  météojob: 'bg-[#6a0dad]/20 text-purple-300 border border-[#6a0dad]/30',
  meteojob: 'bg-[#6a0dad]/20 text-purple-300 border border-[#6a0dad]/30'
}

interface PlatformBadgeProps {
  platform: string
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({ platform }) => {
  const key = platform.toLowerCase()
  const className = PLATFORM_COLORS[key] ?? 'bg-dark-700 text-dark-300 border border-dark-600'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {platform}
    </span>
  )
}
