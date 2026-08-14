const assert = require("assert");
const {
  parseFen,
  allLegalMoves,
  legalMovesFrom,
  moveByAlgebraic,
  gameStatus,
  algebraicToSq,
  START_FEN,
} = require("./engine.js");

function fromSquare(s, alg) {
  const { r, c } = algebraicToSq(alg);
  return legalMovesFrom(s, r, c).map(
    (m) => String.fromCharCode(97 + m.c) + (8 - m.r)
  );
}

let s = parseFen(START_FEN);
assert.strictEqual(allLegalMoves(s).length, 20, "start: 20 legal moves");

s = moveByAlgebraic(s, "e2", "e4");
assert.strictEqual(s.turn, "b");
assert.ok(s.ep && s.ep.r === 5 && s.ep.c === 4, "ep square after e4");

s = moveByAlgebraic(s, "e7", "e5");
s = moveByAlgebraic(s, "g1", "f3");
s = moveByAlgebraic(s, "b8", "c6");
s = moveByAlgebraic(s, "f1", "c4");
s = moveByAlgebraic(s, "g8", "f6");
assert.ok(
  fromSquare(s, "e1").includes("g1"),
  "white can castle kingside"
);
s = moveByAlgebraic(s, "e1", "g1");
assert.strictEqual(s.board[7][6], "K");
assert.strictEqual(s.board[7][5], "R");
assert.strictEqual(s.board[7][4], null);
assert.strictEqual(s.board[7][7], null);

// Fool's mate
s = parseFen(START_FEN);
s = moveByAlgebraic(s, "f2", "f3");
s = moveByAlgebraic(s, "e7", "e5");
s = moveByAlgebraic(s, "g2", "g4");
s = moveByAlgebraic(s, "d8", "h4");
assert.strictEqual(gameStatus(s), "checkmate", "fool's mate");

// Stalemate: king vs king+queen classic
s = parseFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
assert.strictEqual(gameStatus(s), "stalemate", "stalemate position");

// En passant
s = parseFen("rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3");
assert.ok(fromSquare(s, "e5").includes("f6"), "en passant available");
s = moveByAlgebraic(s, "e5", "f6");
assert.strictEqual(s.board[2][5], "P");
assert.strictEqual(s.board[3][5], null, "ep captured pawn removed");

// Promotion
s = parseFen("8/4P3/8/8/8/8/8/4k2K w - - 0 1");
s = moveByAlgebraic(s, "e7", "e8", "q");
assert.strictEqual(s.board[0][4], "Q");

// Cannot move into check
s = parseFen("k7/8/8/8/8/8/6r1/7K w - - 0 1");
const kingMoves = fromSquare(s, "h1");
assert.ok(!kingMoves.includes("g1"), "king cannot step into rook file");
assert.ok(!kingMoves.includes("h2"), "king cannot step into rook rank");
assert.ok(kingMoves.includes("g2"), "king may capture unprotected rook");
console.log("All chess engine tests passed.");
