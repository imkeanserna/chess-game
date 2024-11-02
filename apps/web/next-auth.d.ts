import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
  }
}
