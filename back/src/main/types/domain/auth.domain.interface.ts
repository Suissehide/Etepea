import type { MeResponse } from '../../utils/me-mapper'

export type SignInResponse = {
  accessToken: string
  refreshToken: string
  me: MeResponse
}
export type SignOutResponse = {
  success: boolean
}

export interface AuthDomainInterface {
  signIn: (email: string, password: string) => Promise<SignInResponse>
  refresh: (refreshToken: string) => Promise<SignInResponse>
  signOut: () => SignOutResponse
}
