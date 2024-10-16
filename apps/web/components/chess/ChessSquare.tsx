"use client";

import { Color, PieceSymbol, Square } from "chess.js";
import { useRecoilValue } from "recoil";
import { isGameOverAtom } from "@repo/store/chessBoard";

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

  return (
    <div
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        ${isHighlightedSquare ? "bg-yellow-200" : ""}
        ${isHighlighted ? "bg-yellow-400" : ""}
        ${isMainBoxColor ? "bg-gray-400" : "bg-white"}
        w-16 h-16 relative
      `}
    >
      {/* Column label (bottom row if white, top row if flipped for black) */}
      {(isFlipped ? row === 8 : row === 1) && (
        <div className="absolute bottom-0 right-0 text-xs opacity-50 p-1">
          {getColumnLabel()}
        </div>
      )}

      {/* Row label (leftmost column if white, rightmost column if flipped for black) */}
      {(isFlipped ? col === 7 : col === 0) && (
        <div className="absolute top-0 left-0 text-xs opacity-50 p-1">
          {getRowLabel()}
        </div>
      )}

      {square ? (
        <div
          draggable
          className={`
            cursor-grab active:cursor-grabbing
            ${isCaptured ? "bg-red-400" : ""}
            ${isKingChecked ? "bg-red-200" : ""}
            w-full h-full relative flex justify-center items-center
            ${isDragging ? 'opacity-0' : 'opacity-100'}
            transition-opacity duration-200
          `}
        >
          <img
            className={`w-12 pointer-events-none`}
            src={`/cardinal/${square?.color}/${piece}.svg`}
            alt={`${square?.color} ${piece}`}
          />
          {piece === "k" && gameOver.isGameOver && gameOver.playerWon?.[0]?.toLowerCase() === square?.color ? (
            <img className="w-6 absolute top-1 right-1" src={`/crown.svg`} alt="Crown" />
          ) : null}
          {gameOver.isGameOver && piece === "k" && gameOver.playerWon?.[0]?.toLowerCase() !== square?.color && (
            gameOver.playerWon?.[0]?.toLowerCase() !== "w" ? (
              <img className="w-6 absolute top-1 right-1" src={`/black-mate.svg`} alt="Black Mate" />
            ) : (
              <img className="w-6 absolute top-1 right-1" src={`/white-mate.svg`} alt="White Mate" />
            )
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ChessSquare;
