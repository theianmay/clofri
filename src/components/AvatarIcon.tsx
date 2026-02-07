import {
  Bird, Bug, Cat, Dog, Fish, Rabbit, Snail, Squirrel, Turtle,
  Ghost, Bot, Skull, Flame, Zap, Heart, Star, Moon, Sun,
  Flower2, TreePine, Mountain, Anchor, Rocket, Gamepad2, Music,
  type LucideIcon,
} from 'lucide-react'

export const AVATAR_OPTIONS: { id: string; icon: LucideIcon; label: string; bg: string }[] = [
  { id: 'cat', icon: Cat, label: 'Cat', bg: 'bg-orange-600' },
  { id: 'dog', icon: Dog, label: 'Dog', bg: 'bg-amber-700' },
  { id: 'bird', icon: Bird, label: 'Bird', bg: 'bg-sky-600' },
  { id: 'fish', icon: Fish, label: 'Fish', bg: 'bg-cyan-600' },
  { id: 'rabbit', icon: Rabbit, label: 'Rabbit', bg: 'bg-pink-600' },
  { id: 'turtle', icon: Turtle, label: 'Turtle', bg: 'bg-emerald-600' },
  { id: 'squirrel', icon: Squirrel, label: 'Squirrel', bg: 'bg-amber-600' },
  { id: 'snail', icon: Snail, label: 'Snail', bg: 'bg-lime-600' },
  { id: 'bug', icon: Bug, label: 'Bug', bg: 'bg-red-600' },
  { id: 'ghost', icon: Ghost, label: 'Ghost', bg: 'bg-violet-600' },
  { id: 'bot', icon: Bot, label: 'Bot', bg: 'bg-blue-600' },
  { id: 'skull', icon: Skull, label: 'Skull', bg: 'bg-zinc-600' },
  { id: 'flame', icon: Flame, label: 'Flame', bg: 'bg-red-500' },
  { id: 'zap', icon: Zap, label: 'Zap', bg: 'bg-yellow-500' },
  { id: 'heart', icon: Heart, label: 'Heart', bg: 'bg-pink-500' },
  { id: 'star', icon: Star, label: 'Star', bg: 'bg-amber-500' },
  { id: 'moon', icon: Moon, label: 'Moon', bg: 'bg-indigo-600' },
  { id: 'sun', icon: Sun, label: 'Sun', bg: 'bg-yellow-600' },
  { id: 'flower', icon: Flower2, label: 'Flower', bg: 'bg-rose-500' },
  { id: 'tree', icon: TreePine, label: 'Tree', bg: 'bg-green-600' },
  { id: 'mountain', icon: Mountain, label: 'Mountain', bg: 'bg-slate-600' },
  { id: 'anchor', icon: Anchor, label: 'Anchor', bg: 'bg-blue-700' },
  { id: 'rocket', icon: Rocket, label: 'Rocket', bg: 'bg-purple-600' },
  { id: 'gamepad', icon: Gamepad2, label: 'Gamepad', bg: 'bg-teal-600' },
  { id: 'music', icon: Music, label: 'Music', bg: 'bg-fuchsia-600' },
]

function getAvatarOption(avatarUrl: string | null) {
  if (!avatarUrl?.startsWith('icon:')) return null
  const id = avatarUrl.slice(5)
  return AVATAR_OPTIONS.find((a) => a.id === id) || null
}

interface AvatarIconProps {
  avatarUrl: string | null
  displayName: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

export function AvatarIcon({ avatarUrl, displayName, size = 'md', className = '' }: AvatarIconProps) {
  const option = getAvatarOption(avatarUrl)

  if (option) {
    const Icon = option.icon
    return (
      <div className={`${sizeClasses[size]} rounded-full ${option.bg} flex items-center justify-center ${className}`}>
        <Icon className={`${iconSizes[size]} text-white`} />
      </div>
    )
  }

  if (avatarUrl && !avatarUrl.startsWith('icon:')) {
    return <img src={avatarUrl} alt="" className={`${sizeClasses[size]} rounded-full ${className}`} />
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-medium ${className}`}>
      {displayName?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
