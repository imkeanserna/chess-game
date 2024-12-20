import { ReactNode } from "react";
import { SocketContextProvider } from "@repo/ui/socket/SocketContextProvider";
import SocketError from "@/components/SocketError";
import { currentUser } from "@/lib";

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <SocketContextProvider user={user}>
      <SocketError>
        {children}
      </SocketError>
    </SocketContextProvider>
  );
}
