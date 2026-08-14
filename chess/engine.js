(() => {
  "use strict";

  const FILES = "abcdefgh";
  const START_FEN =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  function cloneState(s) {
    return {
      board: s.board.map((row) => row.slice()),
      turn: s.turn,
      castling: { ...s.castling },
      ep: s.ep ? { ...s.ep } : null,
      halfmove: s.halfmove,
      fullmove: s.fullmove,
      captured: {
        w: s.captured.w.slice(),
        b: s.captured.b.slice(),
      },
      lastMove: s.lastMove ? { ...s.lastMove } : null,
    };
  }

  function parseFen(fen) {
    const [placement, turn, castling, ep, half, full] = fen.split(" ");
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const ranks = placement.split("/");
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const ch of ranks[r]) {
        if (/\d/.test(ch)) {
          c += Number(ch);
        } else {
          board[r][c] = ch;
          c++;
        }
      }
    }
    return {
      board,
      turn: turn === "b" ? "b" : "w",
      castling: {
        K: castling.includes("K"),
        Q: castling.includes("Q"),
        k: castling.includes("k"),
        q: castling.includes("q"),
      },
      ep: ep && ep !== "-" ? algebraicToSq(ep) : null,
      halfmove: Number(half || 0),
      fullmove: Number(full || 1),
      captured: { w: [], b: [] },
      lastMove: null,
    };
  }

  function algebraicToSq(alg) {
    return { r: 8 - Number(alg[1]), c: FILES.indexOf(alg[0]) };
  }

  function sqToAlgebraic(r, c) {
    return FILES[c] + (8 - r);
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function isWhite(piece) {
    return piece === piece.toUpperCase();
  }

  function colorOf(piece) {
    return isWhite(piece) ? "w" : "b";
  }

  function opponent(color) {
    return color === "w" ? "b" : "w";
  }

  function findKing(board, color) {
    const target = color === "w" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === target) return { r, c };
      }
    }
    return null;
  }

  function attackedBy(board, r, c, byColor) {
    const enemyPawn = byColor === "w" ? "P" : "p";
    const enemyKnight = byColor === "w" ? "N" : "n";
    const enemyKing = byColor === "w" ? "K" : "k";
    const enemyBishop = byColor === "w" ? "B" : "b";
    const enemyRook = byColor === "w" ? "R" : "r";
    const enemyQueen = byColor === "w" ? "Q" : "q";

    const pawnDir = byColor === "w" ? 1 : -1;
    for (const dc of [-1, 1]) {
      const pr = r + pawnDir;
      const pc = c + dc;
      if (inBounds(pr, pc) && board[pr][pc] === enemyPawn) return true;
    }

    const knightDeltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightDeltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === enemyKnight) return true;
    }

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] === enemyKing) return true;
      }
    }

    const rays = [
      {
        deltas: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        pieces: [enemyBishop, enemyQueen],
      },
      {
        deltas: [[-1, 0], [1, 0], [0, -1], [0, 1]],
        pieces: [enemyRook, enemyQueen],
      },
    ];
    for (const ray of rays) {
      for (const [dr, dc] of ray.deltas) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          const p = board[nr][nc];
          if (p) {
            if (ray.pieces.includes(p)) return true;
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    }
    return false;
  }

  function isInCheck(board, color) {
    const king = findKing(board, color);
    if (!king) return false;
    return attackedBy(board, king.r, king.c, opponent(color));
  }

  function pushSlide(moves, board, r, c, color, deltas) {
    for (const [dr, dc] of deltas) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (colorOf(target) !== color) moves.push({ r: nr, c: nc, capture: true });
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  function pseudoMoves(s, r, c) {
    const board = s.board;
    const piece = board[r][c];
    if (!piece) return [];
    const color = colorOf(piece);
    const type = piece.toUpperCase();
    const moves = [];

    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const startRank = color === "w" ? 6 : 1;
      const promoRank = color === "w" ? 0 : 7;
      const one = r + dir;
      if (inBounds(one, c) && !board[one][c]) {
        moves.push({ r: one, c, promote: one === promoRank });
        const two = r + 2 * dir;
        if (r === startRank && !board[two][c]) {
          moves.push({ r: two, c, doublePush: true });
        }
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (target && colorOf(target) !== color) {
          moves.push({ r: nr, c: nc, capture: true, promote: nr === promoRank });
        }
        if (s.ep && s.ep.r === nr && s.ep.c === nc && !target) {
          moves.push({ r: nr, c: nc, capture: true, enPassant: true });
        }
      }
    } else if (type === "N") {
      const deltas = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (!target) moves.push({ r: nr, c: nc });
        else if (colorOf(target) !== color) moves.push({ r: nr, c: nc, capture: true });
      }
    } else if (type === "B") {
      pushSlide(moves, board, r, c, color, [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ]);
    } else if (type === "R") {
      pushSlide(moves, board, r, c, color, [
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ]);
    } else if (type === "Q") {
      pushSlide(moves, board, r, c, color, [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ]);
    } else if (type === "K") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target) moves.push({ r: nr, c: nc });
          else if (colorOf(target) !== color) moves.push({ r: nr, c: nc, capture: true });
        }
      }
      const rank = color === "w" ? 7 : 0;
      if (r === rank && c === 4 && !isInCheck(board, color)) {
        if (
          s.castling[color === "w" ? "K" : "k"] &&
          !board[rank][5] &&
          !board[rank][6] &&
          !attackedBy(board, rank, 5, opponent(color)) &&
          !attackedBy(board, rank, 6, opponent(color))
        ) {
          moves.push({ r: rank, c: 6, castle: "king" });
        }
        if (
          s.castling[color === "w" ? "Q" : "q"] &&
          !board[rank][1] &&
          !board[rank][2] &&
          !board[rank][3] &&
          !attackedBy(board, rank, 3, opponent(color)) &&
          !attackedBy(board, rank, 2, opponent(color))
        ) {
          moves.push({ r: rank, c: 2, castle: "queen" });
        }
      }
    }
    return moves;
  }

  function applyMove(s, from, to, promotion) {
    const next = cloneState(s);
    const piece = next.board[from.r][from.c];
    const color = colorOf(piece);
    let captured = next.board[to.r][to.c];

    if (to.enPassant) {
      const capR = from.r;
      captured = next.board[capR][to.c];
      next.board[capR][to.c] = null;
    }

    next.board[to.r][to.c] = piece;
    next.board[from.r][from.c] = null;

    if (to.castle === "king") {
      next.board[from.r][5] = next.board[from.r][7];
      next.board[from.r][7] = null;
    } else if (to.castle === "queen") {
      next.board[from.r][3] = next.board[from.r][0];
      next.board[from.r][0] = null;
    }

    if (to.promote) {
      const promo = (promotion || "q").toLowerCase();
      next.board[to.r][to.c] = color === "w" ? promo.toUpperCase() : promo;
    }

    if (captured) {
      next.captured[color === "w" ? "b" : "w"].push(captured);
    }

    next.ep = null;
    if (to.doublePush) {
      next.ep = { r: (from.r + to.r) / 2, c: from.c };
    }

    if (piece.toUpperCase() === "K") {
      if (color === "w") {
        next.castling.K = false;
        next.castling.Q = false;
      } else {
        next.castling.k = false;
        next.castling.q = false;
      }
    }
    if (piece.toUpperCase() === "R") {
      if (from.r === 7 && from.c === 0) next.castling.Q = false;
      if (from.r === 7 && from.c === 7) next.castling.K = false;
      if (from.r === 0 && from.c === 0) next.castling.q = false;
      if (from.r === 0 && from.c === 7) next.castling.k = false;
    }
    if (captured) {
      if (to.r === 7 && to.c === 0) next.castling.Q = false;
      if (to.r === 7 && to.c === 7) next.castling.K = false;
      if (to.r === 0 && to.c === 0) next.castling.q = false;
      if (to.r === 0 && to.c === 7) next.castling.k = false;
    }

    if (piece.toUpperCase() === "P" || captured) next.halfmove = 0;
    else next.halfmove += 1;

    if (color === "b") next.fullmove += 1;
    next.turn = opponent(color);
    next.lastMove = { from: { ...from }, to: { r: to.r, c: to.c } };
    return next;
  }

  function legalMovesFrom(s, r, c) {
    const piece = s.board[r][c];
    if (!piece || colorOf(piece) !== s.turn) return [];
    const color = s.turn;
    return pseudoMoves(s, r, c).filter((to) => {
      const trial = applyMove(s, { r, c }, to, "q");
      return !isInCheck(trial.board, color);
    });
  }

  function allLegalMoves(s) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        for (const to of legalMovesFrom(s, r, c)) {
          moves.push({ from: { r, c }, to });
        }
      }
    }
    return moves;
  }

  function gameStatus(s) {
    const moves = allLegalMoves(s);
    const check = isInCheck(s.board, s.turn);
    if (moves.length === 0) {
      return check ? "checkmate" : "stalemate";
    }
    if (check) return "check";
    return "ongoing";
  }

  function moveByAlgebraic(s, fromAlg, toAlg, promotion) {
    const from = algebraicToSq(fromAlg);
    const legal = legalMovesFrom(s, from.r, from.c);
    const dest = algebraicToSq(toAlg);
    const to = legal.find((m) => m.r === dest.r && m.c === dest.c);
    if (!to) throw new Error(`Illegal move ${fromAlg}${toAlg}`);
    return applyMove(s, from, to, promotion);
  }

  const api = {
    START_FEN,
    FILES,
    cloneState,
    parseFen,
    algebraicToSq,
    sqToAlgebraic,
    colorOf,
    findKing,
    isInCheck,
    legalMovesFrom,
    allLegalMoves,
    applyMove,
    gameStatus,
    moveByAlgebraic,
  };

  if (typeof window !== "undefined") window.ChessEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
