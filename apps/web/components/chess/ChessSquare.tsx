"use client";

import { Color, PieceSymbol, Square } from "chess.js";
import { useRecoilValue } from "recoil";
import { isGameOverAtom } from "@repo/store/chessBoard";
import Image from "next/image";

interface ChessSquareProps {
  isKingChecked: boolean;
  isCaptured: boolean;
  isHighlightedSquare: boolean;
  isHighlighted: boolean;
  isMainBoxColor: boolean;
  piece: PieceSymbol;
  square: {
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  row: number;
  col: number;
  isFlipped: boolean;
}

const ChessSquare: React.FC<ChessSquareProps> = ({
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isKingChecked,
  isCaptured,
  isHighlightedSquare,
  isHighlighted,
  isMainBoxColor,
  piece,
  square,
  isDragging,
  row,
  col,
  isFlipped
}) => {
  const gameOver = useRecoilValue(isGameOverAtom);

  // Determine the column label based on whether the board is flipped
  const getColumnLabel = () => {
    return String.fromCharCode(97 + col);
  };

  // Determine the row label based on whether the board is flipped
  const getRowLabel = () => {
    return row;
  };

  const woodTexture = isMainBoxColor
    ? 'bg-blackPlayer'
    : 'bg-whitePlayer';

  return (
    <div
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        ${woodTexture}
        ${isHighlightedSquare ? "bg-yellow-500" : ""}
        w-20 h-20 relative
      `}
    >
      {isHighlighted && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-gray-950 shadow-md rounded-full opacity-40" />
      )}

      {/* Column label (bottom row if white, top row if flipped for black) */}
      {(isFlipped ? row === 8 : row === 1) && (
        <div className="absolute bottom-0 right-0 text-lg text-boardBackground font-semibold opacity-50 p-1">
          {getColumnLabel()}
        </div>
      )}

      {/* Row label (leftmost column if white, rightmost column if flipped for black) */}
      {(isFlipped ? col === 7 : col === 0) && (
        <div className="absolute top-0 left-0 text-lg text-boardBackground font-semibold opacity-50 p-1">
          {getRowLabel()}
        </div>
      )}

      {square ? (
        <div
          draggable
          className={`
            cursor-grab active:cursor-grabbing
            ${isKingChecked ? "bg-red-600" : ""}
            w-full h-full relative flex justify-center items-center
            ${isDragging ? 'opacity-0' : 'opacity-100'}
            transition-opacity duration-200
          `}
        >
          {isCaptured && (
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="w-8 h-8 bg-red-400 rounded-full shadow-md animate-pulse opacity-70" />
            </div>
          )}
          <Image
            src={`/cardinal/${square?.color}/${piece}.svg`}
            alt={`${square?.color} ${piece}`}
            width={72}
            height={72}
            className="pointer-events-none"
          />
          {piece === "k" && gameOver.isGameOver && gameOver.playerWon?.[0]?.toLowerCase() === square?.color ? (
            <Image
              src="/crown.svg"
              alt="Crown for winner king"
              width={24}
              height={24}
              className="absolute top-1 right-1"
            />
          ) : null}
          {gameOver.isGameOver && piece === "k" && gameOver.playerWon?.[0]?.toLowerCase() !== square?.color && (
            gameOver.playerWon?.[0]?.toLowerCase() !== "w" ? (
              <Image
                src="/black-mate.svg"
                alt="Black mate icon"
                width={24}
                height={24}
                className="absolute top-1 right-1"
              />
            ) : (
              <Image
                src="/white-mate.svg"
                alt="White mate icon"
                width={24}
                height={24}
                className="absolute top-1 right-1"
              />
            )
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ChessSquare;
