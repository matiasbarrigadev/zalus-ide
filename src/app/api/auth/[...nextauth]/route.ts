import NextAuth, { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

interface GithubProfile {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

// Custom Vercel OAuth Provider
const VercelProvider = {
  id: 'vercel',
  name: 'Vercel',
  type: 'oauth' as const,
  authorization: {
    url: 'https://vercel.com/integrations/new',
    params: {
      redirect_uri: process.env.NEXTAUTH_URL + '/api/auth/callback/vercel',
    },
  },
  token: 'https://api.vercel.com/v2/oauth/access_token',
  userinfo: 'https://api.vercel.com/v2/user',
  clientId: process.env.VERCEL_CLIENT_ID,
  clientSecret: process.env.VERCEL_CLIENT_SECRET,
  profile(profile: { user: { uid: string; email: string; name: string; avatar: string } }) {
    return {
      id: profile.user.uid,
      name: profile.user.name,
      email: profile.user.email,
      image: profile.user.avatar,
    }
  },
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
    // Vercel provider is optional - only added if configured
    ...(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET
      ? [VercelProvider]
      : []),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        if (account.provider === 'github') {
          token.accessToken = account.access_token
          const githubProfile = profile as GithubProfile | undefined
          token.githubId = githubProfile?.id?.toString()
        } else if (account.provider === 'vercel') {
          token.vercelAccessToken = account.access_token
        }
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.vercelAccessToken = token.vercelAccessToken as string | undefined
      session.user.id = token.githubId as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }