"use client";

import { GameMessages } from "@repo/chess/gameStatus";
import { Button } from "@repo/ui/components/ui/button";
import { useSocketContext } from "@repo/ui/context/socketContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import WaitingForOpponent from "./WaitingForOpponent";
import { Player } from "@repo/chess/playerTypes";
import { useRecoilState, useSetRecoilState } from "recoil";
import { gameMetadataAtom, remoteGameIdAtom } from "@repo/store/gameMetadata";
import { userAtom } from "@repo/store/user";

export interface Players {
  blackPlayer: Player;
  whitePlayer: Player;
}

const ChessMenu: React.FC = () => {
  const { socket, sendMessage } = useSocketContext();
  const router = useRouter();

  const setgameMetadataAtom = useSetRecoilState<Players>(gameMetadataAtom);
  const setRemoteGameIdAtom = useSetRecoilState(remoteGameIdAtom);
  const setUser = useSetRecoilState(userAtom);
  const [isWaiting, setIsWaiting] = useState(false);

  const handleGameAdded = useCallback(({ gameId }: { gameId: string }) => {
    setRemoteGameIdAtom(gameId);
  }, []);

  const handleGameInit = useCallback((payload: any) => {
    setIsWaiting(false);

    const user: { id: string } | null = JSON.parse(localStorage.getItem("user") as string);
    if (!user || user.id !== payload.whitePlayer.id) {
      // set the second player as a black player
      setUser({
        id: payload.blackPlayer.id
      })
    }

    setgameMetadataAtom({
      whitePlayer: {
        id: payload.whitePlayer.id,
        name: payload.whitePlayer.name,
        isGuest: true,
        remainingTime: payload.whitePlayer.remainingTime
      },
      blackPlayer: {
        id: payload.blackPlayer.id,
        name: payload.blackPlayer.name,
        isGuest: true,
        remainingTime: payload.blackPlayer.remainingTime
      }
    });

    // let say they initialize it into 10 minutes
    router.push(`/play/${payload.gameId}`);
  }, []);

  useEffect(() => {
    if (!socket) {
      console.log("no socket");
      return;
    }

    socket.onmessage = (messageEvent) => {
      const { event, payload } = JSON.parse(messageEvent.data);

      switch (event) {
        case GameMessages.INIT_GAME:
          // an id and initialize those store/atoms
          setRemoteGameIdAtom(payload.gameId);
          handleGameInit(payload);
          break;
        case GameMessages.GAME_ADDED:
          // setUser({
          //   id: payload.userId
          // })
          // initialize the firstPlayer which is white player
          setUser({
            id: payload.userId
          })
          setIsWaiting(true);
          handleGameAdded({ gameId: payload.gameId });
          break;
        default:
          break;
      }
    }
  }, [socket]);

  const handleFindGame = () => {
    if (!socket) {
      console.log("no socket");
      return
    }
    sendMessage(GameMessages.INIT_GAME);
  }

  return (
    <div>
      <WaitingForOpponent isWaiting={isWaiting} />
      <Button>
        Create Game
      </Button>
      <Button disabled={isWaiting} onClick={handleFindGame}>
        Play as Guest
      </Button>
    </div>
  )
}

export default ChessMenu;
