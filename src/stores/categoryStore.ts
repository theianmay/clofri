import { create } from 'zustand'

const STORAGE_KEY = 'clofri-friend-categories'
const ASSIGNMENTS_KEY = 'clofri-friend-assignments'

export interface FriendCategory {
  id: string
  name: string
  color: string
}

const DEFAULT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-red-500', 'bg-emerald-500',
]

interface CategoryState {
  categories: FriendCategory[]
  assignments: Record<string, string> // friendshipId -> categoryId
  addCategory: (name: string) => FriendCategory
  removeCategory: (categoryId: string) => void
  renameCategory: (categoryId: string, name: string) => void
  assignFriend: (friendshipId: string, categoryId: string | null) => void
  getCategoryForFriend: (friendshipId: string) => FriendCategory | null
}

function loadCategories(): FriendCategory[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function loadAssignments(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY) || '{}')
  } catch { return {} }
}

function saveCategories(categories: FriendCategory[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
}

function saveAssignments(assignments: Record<string, string>) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: loadCategories(),
  assignments: loadAssignments(),

  addCategory: (name: string) => {
    const categories = get().categories
    const color = DEFAULT_COLORS[categories.length % DEFAULT_COLORS.length]
    const cat: FriendCategory = {
      id: crypto.randomUUID(),
      name,
      color,
    }
    const updated = [...categories, cat]
    set({ categories: updated })
    saveCategories(updated)
    return cat
  },

  removeCategory: (categoryId: string) => {
    const categories = get().categories.filter((c) => c.id !== categoryId)
    const assignments = { ...get().assignments }
    // Remove all assignments for this category
    for (const key in assignments) {
      if (assignments[key] === categoryId) delete assignments[key]
    }
    set({ categories, assignments })
    saveCategories(categories)
    saveAssignments(assignments)
  },

  renameCategory: (categoryId: string, name: string) => {
    const categories = get().categories.map((c) =>
      c.id === categoryId ? { ...c, name } : c
    )
    set({ categories })
    saveCategories(categories)
  },

  assignFriend: (friendshipId: string, categoryId: string | null) => {
    const assignments = { ...get().assignments }
    if (categoryId) {
      assignments[friendshipId] = categoryId
    } else {
      delete assignments[friendshipId]
    }
    set({ assignments })
    saveAssignments(assignments)
  },

  getCategoryForFriend: (friendshipId: string) => {
    const catId = get().assignments[friendshipId]
    if (!catId) return null
    return get().categories.find((c) => c.id === catId) || null
  },
}))
