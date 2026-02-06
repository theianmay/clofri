export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          friend_code: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          friend_code?: string
          created_at?: string
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'blocked'
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          creator_id: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          creator_id: string
          invite_code?: string
          created_at?: string
        }
        Update: {
          name?: string
          invite_code?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'creator' | 'member'
          muted: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'creator' | 'member'
          muted?: boolean
          joined_at?: string
        }
        Update: {
          role?: 'creator' | 'member'
          muted?: boolean
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          group_id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          text: string
          created_at?: string
        }
        Update: {
          text?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

export type FriendWithProfile = Friendship & {
  friend: Profile
}

export type GroupWithPresence = Group & {
  member_count: number
  online_members: string[]
}
