import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { supabaseAdmin } from './supabase'

// Super admin email - only this email has admin access
export const ADMIN_EMAIL = 'alejdgallubja@icloud.com' // UPDATE THIS TO YOUR EMAIL

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, name, password, role, is_banned, email_verified')
          .eq('email', credentials.email)
          .single()

        if (error || !user || !user.password) {
          throw new Error('Invalid credentials')
        }

        // Check if user is banned
        if ((user as any).is_banned) {
          throw new Error('Your account has been suspended')
        }

        // Check if email is verified
        if (!(user as any).email_verified) {
          throw new Error('Please verify your email address before signing in')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        // Update last login
        await supabaseAdmin
          .from('users')
          .update({
            last_login_at: new Date().toISOString(),
            login_count: (user as any).login_count ? (user as any).login_count + 1 : 1,
          })
          .eq('id', user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          is_banned: user.is_banned,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign in
      if (account?.provider === 'google') {
        try {
          // Check if user already exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role, is_banned')
            .eq('email', user.email)
            .single()

          if (existingUser) {
            // Check if user is banned
            if (existingUser.is_banned) {
              return false // Block sign in
            }

            // User exists, update their info
            user.id = existingUser.id
            user.role = existingUser.role || 'user'
            user.is_banned = existingUser.is_banned

            // Update last login
            await supabaseAdmin
              .from('users')
              .update({
                last_login_at: new Date().toISOString(),
                login_count: (existingUser as any).login_count ? (existingUser as any).login_count + 1 : 1,
              })
              .eq('id', existingUser.id)

            return true
          }

          // Create new user for Google OAuth
          const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert([
              {
                email: user.email,
                name: user.name || user.email?.split('@')[0],
                password: null, // No password for OAuth users
                role: 'user',
                email_verified: true, // Google OAuth emails are pre-verified
                last_login_at: new Date().toISOString(),
                login_count: 1,
              },
            ])
            .select()
            .single()

          if (error || !newUser) {
            console.error('Error creating Google user:', error)
            return false
          }

          user.id = newUser.id
          user.role = 'user'
          return true
        } catch (error) {
          console.error('Google sign in error:', error)
          return false
        }
      }

      return true
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'user'
        token.isBanned = user.is_banned || false
      }

      // Refresh user data on token refresh
      if (trigger === 'update' || !token.role) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('role, is_banned')
          .eq('id', token.id)
          .single()

        if (userData) {
          token.role = userData.role || 'user'
          token.isBanned = userData.is_banned || false
        }
      }

      if (account?.provider === 'google') {
        token.provider = 'google'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.isBanned = token.isBanned as boolean
      }
      return session
    },
  },
}
