export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}
