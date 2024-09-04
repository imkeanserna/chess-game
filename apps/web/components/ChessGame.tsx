"use client";

import { GameStatus } from "@repo/chess/gameStatus";
import { gameMetadataAtom, remoteGameIdAtom } from "@repo/store/gameMetadata";
import { Button } from "@repo/ui/components/ui/button";
import { useSocketContext } from "@repo/ui/context/socketContext";
import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { Players } from "./ChessMenu";
import ChessBoard from "./ChessBoard";
import { Chess } from "chess.js";

interface ChessGameProps {
  gameId: string
}

const ChessGame: React.FC<ChessGameProps> = ({ gameId }) => {
  const { socket, sendMessage } = useSocketContext();
  const gameMetadataState = useRecoilValue<Players>(gameMetadataAtom);
  const remoteGameId = useRecoilValue(remoteGameIdAtom);
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());

  useEffect(() => {
    if (!socket) {
      console.log("no socket");
      return;
    }

    socket.onmessage = (messageEvent) => {
      const { event, payload } = JSON.parse(messageEvent.data);
      switch (event) {
        case GameStatus.MOVE:
          // do something
          console.log("move", payload.move);
          chess.move(payload.move);
          setBoard(chess.board());
          break;
        case GameStatus.GAME_OVER:
          // do something
          break;
        case GameStatus.WAITING:
          // do something
          break;
        default:
          break;
      }
    };
  }, [socket]);

  const moveHandler = () => {
    if (!socket) {
      console.log("no socket");
      return
    }
    sendMessage("move", {
      gameId: gameId,
      move: {
        from: "e2",
        to: "e4"
      }
    });
  };

  return (
    <div>
      <Button onClick={moveHandler}>Move</Button>
      <Button onClick={() => console.log(gameMetadataState)}>Testing</Button>
      <ChessBoard
        setBoard={setBoard}
        gameId={gameId}
        board={board}
        chess={chess}
        socket={socket!}
        sendMessage={sendMessage}
      />
    </div>
  )
}

export default ChessGame;
