import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (!user?.email) return session;

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { family: true },
      });

      if (dbUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).userId = dbUser.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).familyId = dbUser.familyId;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;