import { v4 as uuidv4 } from 'uuid';
import { User } from './user';
import { GameMessages, PlayerWon, GameStatus, KingStatus, GameResultType } from "@repo/chess/gameStatus";
import { Chess, Move } from 'chess.js';
import { GameTimer } from './gameTimer';
import db from "@repo/db/client";
import { isPromoting } from '@repo/chess/isPromoting';
import { deleteGameIfBothPlayersAreGuests } from '../services/gameService';
import { RedisPubSubManager } from '../pubsub/redisClient';

export class ChessGame {
  public id: string;
  public result: GameResultType | null = null;
  public playerWon: PlayerWon | null = null;
  public player1UserId: string;
  public player2UserId: string;
  public initializeTime: number;
  public gameTimer: GameTimer | null = null;
  private board: Chess;
  private moves: Move[];
  private pieceValues: Record<string, number> = {
    p: 1, // pawn
    n: 3, // knight
    b: 3, // bishop
    r: 5, // rook
    q: 9, // queen
    k: 0  // king (not captured)
  };
  private status: GameStatus;
  private turn: string;

  constructor(player1UserId: string, player2UserId?: string) {
    this.player1UserId = player1UserId;
    this.player2UserId = player2UserId || "";
    this.initializeTime = new Date().getTime();
    this.id = uuidv4();
    this.board = new Chess();
    this.moves = [];
    this.status = GameStatus.NOT_STARTED;
    this.turn = player1UserId;
  }

  async move(user: User, move: Move) {
    console.log("nmove")
    if (this.status !== GameStatus.IN_PROGRESS) {
      console.error(`Cannot move. Game ${this.id} is not in progress`);
      return;
    }

    if (this.board.turn() === 'w' && (user.id !== this.player1UserId)) {
      if (user.userId !== "" && user.userId !== this.player1UserId) {
        console.log("out 1")
        return;
      }
    }

    if (this.board.turn() === "b" && (user.id !== this.player2UserId)) {
      if (user.userId !== "" && user.userId !== this.player2UserId) {
        console.log("out 2")
        return;
      }
    }

    if (this.result) {
      console.error(`Game ${this.id} is already over with result ${this.result}`);
      return;
    }

    this.gameTimer?.switchTurn();

    const { player1RemainingTime, player2RemainingTime } = this.gameTimer?.getPlayerTimes() || {};

    try {
      const response = await db.chessGame.update({
        where: {
          id: this.id,
        },
        data: {
          whitePlayerRemainingTime: player1RemainingTime,
          blackPlayerRemainingTime: player2RemainingTime
        }
      });
    } catch (error) {
      console.log(error);
    }

    // check if the timer is expired both side.
    this.timerEnd(player1RemainingTime, player2RemainingTime);

    // we can do the logic of moving the piece here
    try {
      if (isPromoting(this.board, move.from, move.to)) {
        const moveResult = this.board.move({
          from: move.from,
          to: move.to,
          promotion: 'q'
        });
      } else {
        const moveResult = this.board.move({
          from: move.from,
          to: move.to
        });
      }
    } catch (error) {
      console.error("Erorr in move", error);
      return;
    }

    // add the move to the database
    this.moves.push(move);

    await db.chessMove.create({
      data: {
        gameId: this.id,
        playerId: user.userId,
        move: JSON.stringify(move)
      }
    });

    if (this.board.isCheck()) {
      RedisPubSubManager.getInstance().sendMessage(this.id, JSON.stringify({
        event: GameMessages.KING_STATUS,
        payload: {
          kingStatus: this.board.inCheck() ? KingStatus.CHECKED : this.board.isCheckmate() ? KingStatus.CHECKMATE : KingStatus.SAFE,
          player: this.board.turn()
        }
      }));
    }

    RedisPubSubManager.getInstance().sendMessage(this.id, JSON.stringify({
      event: GameMessages.MOVE,
      payload: {
        move,
        player1RemainingTime,
        player2RemainingTime
      }
    }));

    if (this.board.isGameOver()) {
      const result: boolean = this.board.isDraw();
      if (result) {
        this.result = GameResultType.DRAW;
      } else {
        this.result = GameResultType.WIN;
        this.playerWon = this.board.turn() === "w" ? PlayerWon.BLACK_WINS : PlayerWon.WHITE_WINS;
      }
      this.gameEnded(this.result, this.playerWon);
    }
  }

  async addSecondPlayer(player2UserId: string) {
    if (this.status !== GameStatus.NOT_STARTED) {
      console.error(`Cannot add second player. Game ${this.id} is not completed`);
      return;
    }

    if (this.player2UserId !== "") {
      console.error("Game already has two players.");
      return;
    }

    this.player2UserId = player2UserId;
    this.status = GameStatus.IN_PROGRESS;

    // after the initialization the whitePlayer should start the time (let test the 10mins)
    this.gameTimer = new GameTimer(10 * 60 * 1000, 10 * 60 * 1000);
    const { player1RemainingTime, player2RemainingTime } = this.gameTimer?.getPlayerTimes() || {};

    try {
      const response = await db.chessGame.create({
        data: {
          id: this.id,
          status: this.status,
          moves: { create: [] },
          currentBoard: this.board.fen(),
          turn: this.turn,
          whitePlayerRemainingTime: player1RemainingTime || 0,
          blackPlayerRemainingTime: player2RemainingTime || 0,
          players: {
            create: [
              {
                id: this.player1UserId,
                name: "Player 1",
                isGuest: true,
                // chessGameId: this.id
              },
              {
                id: this.player2UserId,
                name: "Player 2",
                isGuest: true,
                // chessGameId: this.id
              }
            ]
          }
        }
      });
    } catch (error) {
      console.error("Error in addSecondPlayer", error);
      return;
    }

    RedisPubSubManager.getInstance().sendMessage(
      this.id,
      JSON.stringify({
        event: GameMessages.INIT_GAME,
        payload: {
          gameId: this.id,
          whitePlayer: {
            id: this.player1UserId,
            name: "Guest",
            isGuest: true,
            remainingTime: player1RemainingTime
          },
          blackPlayer: {
            id: this.player2UserId,
            name: "Guest",
            isGuest: true,
            remainingTime: player2RemainingTime
          },
          fen: this.board.fen(),
          moves: [],
        },
      })
    )
  }

  public timerEnd(player1RemainingTime?: number, player2RemainingTime?: number) {
    if (player1RemainingTime! <= 0 || player2RemainingTime! <= 0) {
      const { whiteScore, blackScore } = this.calculateMaterialDifference(this.board);

      if (whiteScore < blackScore) {
        this.gameEnded(GameResultType.TIMEOUT, PlayerWon.WHITE_WINS);
      } else if (blackScore < whiteScore) {
        this.gameEnded(GameResultType.TIMEOUT, PlayerWon.BLACK_WINS);
      } else {
        this.gameEnded(GameResultType.DRAW, null);
      }
      return;
    }
  }

  public exitGame(user: User) {
    this.gameEnded(GameResultType.RESIGNATION, user.userId === this.player1UserId ? PlayerWon.BLACK_WINS : PlayerWon.WHITE_WINS);
  }

  private calculateMaterialDifference(game: Chess): {
    whiteScore: number;
    blackScore: number;
  } {
    const board = game.board();
    let whiteScore = 0;
    let blackScore = 0;

    board.forEach((row) => {
      row.forEach((square) => {
        if (square !== null) {
          const piece = square.type;
          const color = square.color;
          const pieceValues = this.pieceValues[piece] || 0;

          if (color === 'w') {
            whiteScore += pieceValues;
          } else {
            blackScore += pieceValues;
          }
        }
      });
    });

    const totalPieceValue = 39;
    return {
      whiteScore: totalPieceValue - whiteScore,
      blackScore: totalPieceValue - blackScore,
    }
  };

  getMoves() {
    return this.moves;
  }

  public async gameEnded(status: GameResultType, result: PlayerWon | null) {
    if (this.status !== GameStatus.IN_PROGRESS) {
      console.error(`Cannot end game. Game ${this.id} is not in progress.`);
      return;
    }
    this.status = GameStatus.COMPLETED;

    try {
      const response = await db.chessResult.upsert({
        where: {
          gameId: this.id,
        },
        update: {
          winnerId: result === PlayerWon.WHITE_WINS
            ? this.player1UserId
            : result === PlayerWon.BLACK_WINS
              ? this.player2UserId
              : null,
          resultType: status,
        },
        create: {
          gameId: this.id,
          winnerId: result === PlayerWon.WHITE_WINS
            ? this.player1UserId
            : result === PlayerWon.BLACK_WINS
              ? this.player2UserId
              : null,
          resultType: status,
        },
      });

      await db.chessGame.update({
        where: {
          id: this.id
        },
        data: {
          status: this.status
        }
      });

      await deleteGameIfBothPlayersAreGuests(this.id, this.player1UserId, this.player2UserId);
    } catch (error) {
      console.error("Error in gameEnded", error);
      return;
    }

    RedisPubSubManager.getInstance().sendMessage(this.id, JSON.stringify({
      event: GameMessages.GAME_ENDED,
      payload: {
        result,
        status,
        whitePlayer: {
          id: this.player1UserId,
          name: "Guest",
          isGuest: true
        },
        blackPlayer: {
          id: this.player2UserId,
          name: "Guest",
          isGuest: true
        }
      }
    }));
  }
}
