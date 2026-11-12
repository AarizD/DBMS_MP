import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'food-redistribution-super-secret-key-pes-dbms',
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password');
        }

        const res = await query(
          `SELECT user_id, name, email, password_hash, role, organization_name, reference_id, status
           FROM USERS 
           WHERE email = $1`,
          [credentials.email.toLowerCase().trim()]
        );

        if (res.rowCount === 0) {
          throw new Error('No user account found with this email');
        }

        const user = res.rows[0];

        if (user.status !== 'ACTIVE') {
          throw new Error('This account is currently inactive or suspended');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: String(user.user_id),
          name: user.name,
          email: user.email,
          role: user.role,
          org: user.organization_name,
          referenceId: user.reference_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.org = user.org;
        token.referenceId = user.referenceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as 'ADMIN' | 'DONOR' | 'FOOD_BANK' | 'DRIVER';
        session.user.org = token.org;
        session.user.referenceId = token.referenceId;
      }
      return session;
    },
  },
};

