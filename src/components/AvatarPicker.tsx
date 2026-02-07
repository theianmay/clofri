import { useState } from 'react'
import { AVATAR_OPTIONS, AvatarIcon } from './AvatarIcon'
import { X } from 'lucide-react'

interface AvatarPickerProps {
  currentAvatarUrl: string | null
  displayName: string
  onSelect: (avatarUrl: string) => void
  onClose: () => void
}

export function AvatarPicker({ currentAvatarUrl, displayName, onSelect, onClose }: AvatarPickerProps) {
  const [selected, setSelected] = useState(currentAvatarUrl)

  const handleSelect = (id: string) => {
    const value = `icon:${id}`
    setSelected(value)
    onSelect(value)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-80 max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Choose your avatar</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current */}
        <div className="flex items-center gap-3 mb-4 p-2 bg-zinc-800 rounded-lg">
          <AvatarIcon avatarUrl={selected || null} displayName={displayName} size="lg" />
          <div>
            <p className="text-white text-sm font-medium">{displayName}</p>
            <p className="text-zinc-500 text-xs">Preview</p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_OPTIONS.map((opt) => {
            const isSelected = selected === `icon:${opt.id}`
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-blue-600/20 ring-2 ring-blue-500'
                    : 'hover:bg-zinc-800'
                }`}
                title={opt.label}
              >
                <AvatarIcon avatarUrl={`icon:${opt.id}`} displayName="" size="sm" />
                <span className="text-zinc-500 text-[10px]">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
