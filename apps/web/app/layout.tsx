import "@repo/ui/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@repo/ui/context/ThemeContext";
import { AuthProvider } from "@/context/AuthProvider";
import { Toaster } from "@repo/ui/components/ui/sonner";
import RecoilContextProvider from "@/components/Provider";
import { GithubRepository } from "@/components/ui/GithubRepository";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chess Royal",
  description: "Chess game for royal players",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <RecoilContextProvider>
              {children}
              <GithubRepository
                className="z-50 fixed bottom-10 right-10"
                link="https://github.com/imkeanserna/chess-game"
              />
            </RecoilContextProvider>
          </AuthProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
