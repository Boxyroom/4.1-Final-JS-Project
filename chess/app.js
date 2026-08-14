(() => {
  "use strict";

  const {
    START_FEN,
    FILES,
    parseFen,
    cloneState,
    sqToAlgebraic,
    colorOf,
    findKing,
    isInCheck,
    legalMovesFrom,
    applyMove,
    gameStatus,
  } = window.ChessEngine;

  const PIECES = {
    K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
  };

  const boardEl = document.getElementById("board");
  const turnLabel = document.getElementById("turn-label");
  const messageEl = document.getElementById("message");
  const capturedBlackEl = document.getElementById("captured-black");
  const capturedWhiteEl = document.getElementById("captured-white");
  const btnUndo = document.getElementById("btn-undo");
  const btnFlip = document.getElementById("btn-flip");
  const btnNew = document.getElementById("btn-new");
  const promoteDialog = document.getElementById("promote-dialog");

  let state = null;
  let selected = null;
  let legalTargets = new Map();
  let flipped = false;
  let history = [];

  function keyOf(r, c) {
    return `${r},${c}`;
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    for (let displayR = 0; displayR < 8; displayR++) {
      for (let displayC = 0; displayC < 8; displayC++) {
        const r = flipped ? 7 - displayR : displayR;
        const c = flipped ? 7 - displayC : displayC;
        const sq = document.createElement("button");
        sq.type = "button";
        sq.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
        sq.dataset.r = String(r);
        sq.dataset.c = String(c);
        sq.setAttribute("aria-label", sqToAlgebraic(r, c));

        if (selected && selected.r === r && selected.c === c) {
          sq.classList.add("selected");
        }
        if (state.lastMove) {
          const { from, to } = state.lastMove;
          if ((from.r === r && from.c === c) || (to.r === r && to.c === c)) {
            sq.classList.add("last-move");
          }
        }
        const legal = legalTargets.get(keyOf(r, c));
        if (legal) {
          sq.classList.add("legal");
          if (legal.capture || state.board[r][c]) sq.classList.add("capture");
        }

        const king = findKing(state.board, state.turn);
        if (
          king &&
          king.r === r &&
          king.c === c &&
          isInCheck(state.board, state.turn)
        ) {
          sq.classList.add("in-check");
        }

        const piece = state.board[r][c];
        if (piece) {
          const span = document.createElement("span");
          span.className = "piece";
          span.textContent = PIECES[piece];
          sq.appendChild(span);
        }

        if (displayR === 7) {
          const lab = document.createElement("span");
          lab.className = "file-label";
          lab.textContent = FILES[c];
          sq.appendChild(lab);
        }
        if (displayC === 0) {
          const lab = document.createElement("span");
          lab.className = "rank-label";
          lab.textContent = String(8 - r);
          sq.appendChild(lab);
        }

        sq.addEventListener("click", () => onSquareClick(r, c));
        boardEl.appendChild(sq);
      }
    }
  }

  function renderCaptured() {
    const order = "QRBNP";
    const sortPieces = (arr) =>
      arr
        .slice()
        .sort(
          (a, b) =>
            order.indexOf(a.toUpperCase()) - order.indexOf(b.toUpperCase())
        );

    capturedBlackEl.textContent = sortPieces(state.captured.b)
      .map((p) => PIECES[p])
      .join("");
    capturedWhiteEl.textContent = sortPieces(state.captured.w)
      .map((p) => PIECES[p])
      .join("");
  }

  function renderStatus() {
    const status = gameStatus(state);
    const side = state.turn === "w" ? "White" : "Black";
    if (status === "checkmate") {
      turnLabel.textContent = `${side === "White" ? "Black" : "White"} wins`;
      messageEl.textContent = "Checkmate";
    } else if (status === "stalemate") {
      turnLabel.textContent = "Draw";
      messageEl.textContent = "Stalemate";
    } else {
      turnLabel.textContent = `${side} to move`;
      messageEl.textContent = status === "check" ? "Check" : "";
    }
    btnUndo.disabled = history.length === 0;
  }

  function render() {
    renderBoard();
    renderCaptured();
    renderStatus();
  }

  function clearSelection() {
    selected = null;
    legalTargets = new Map();
  }

  function selectSquare(r, c) {
    const piece = state.board[r][c];
    if (!piece || colorOf(piece) !== state.turn) {
      clearSelection();
      render();
      return;
    }
    selected = { r, c };
    legalTargets = new Map();
    for (const to of legalMovesFrom(state, r, c)) {
      legalTargets.set(keyOf(to.r, to.c), to);
    }
    render();
  }

  function askPromotion() {
    return new Promise((resolve) => {
      const onClose = () => {
        promoteDialog.removeEventListener("close", onClose);
        resolve(promoteDialog.returnValue || "q");
      };
      promoteDialog.returnValue = "";
      promoteDialog.addEventListener("close", onClose);
      promoteDialog.showModal();
    });
  }

  async function tryMove(r, c) {
    const to = legalTargets.get(keyOf(r, c));
    if (!to || !selected) return false;

    let promotion = null;
    if (to.promote) {
      promotion = await askPromotion();
    }

    history.push(cloneState(state));
    state = applyMove(state, selected, to, promotion);
    clearSelection();
    render();
    return true;
  }

  async function onSquareClick(r, c) {
    const status = gameStatus(state);
    if (status === "checkmate" || status === "stalemate") return;

    if (selected && legalTargets.has(keyOf(r, c))) {
      await tryMove(r, c);
      return;
    }
    if (selected && selected.r === r && selected.c === c) {
      clearSelection();
      render();
      return;
    }
    selectSquare(r, c);
  }

  function newGame() {
    state = parseFen(START_FEN);
    history = [];
    clearSelection();
    render();
  }

  function undo() {
    if (!history.length) return;
    state = history.pop();
    clearSelection();
    render();
  }

  btnNew.addEventListener("click", newGame);
  btnUndo.addEventListener("click", undo);
  btnFlip.addEventListener("click", () => {
    flipped = !flipped;
    render();
  });

  newGame();
})();
