import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'DONOR' | 'FOOD_BANK' | 'DRIVER';
      referenceId?: number | null;
      org?: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'ADMIN' | 'DONOR' | 'FOOD_BANK' | 'DRIVER';
    referenceId?: number | null;
    org?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'ADMIN' | 'DONOR' | 'FOOD_BANK' | 'DRIVER';
    referenceId?: number | null;
    org?: string | null;
  }
}

