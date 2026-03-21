export function buildMinesweeper() {
  // classic Windows minesweeper colors
  const bgColor = '#c0c0c0';
  const borderLight = '#fff';
  const borderDark = '#808080';
  const revealedBg = '#bdbdbd';
  const numColors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];

  const container = document.createElement('div');
  container.style.cssText = `
    background:${bgColor};
    padding:6px;
    user-select:none;
    border-top:3px solid ${borderLight};
    border-left:3px solid ${borderLight};
    border-bottom:3px solid ${borderDark};
    border-right:3px solid ${borderDark};
  `;

  const rows = 16;
  const cols = 16;
  const mineCount = __TEST_MODE__ ? 1 : 40;
  const statsKey = 'fishtank-minesweeper-stats';

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(statsKey)) || {wins: 0, losses: 0};
    } catch {
      return {wins: 0, losses: 0};
    }
  }

  function saveStats(stats) {
    localStorage.setItem(statsKey, JSON.stringify(stats));
  }

  let board = [];
  let revealed = [];
  let flagged = [];
  let gameOver = false;
  let firstClick = true;
  let timerInterval = null;
  let seconds = 0;

  // sunken panel style (for header displays and grid)
  const sunkenBorder = `border-top:2px solid ${borderDark}; ` +
    `border-left:2px solid ${borderDark}; ` +
    `border-bottom:2px solid ${borderLight}; ` +
    `border-right:2px solid ${borderLight};`;

  // header with mine counter, face button, timer
  const header = document.createElement('div');
  header.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:4px 3px; margin-bottom:6px; ${sunkenBorder}`;

  const ledStyle = `
    background:#000;
    color:#ff0000;
    font-family:'Courier New',monospace;
    font-size:20px;
    font-weight:bold;
    padding:1px 4px;
    letter-spacing:2px;
    min-width:40px;
    text-align:center;
    ${sunkenBorder}
  `;

  const mineCounter = document.createElement('div');
  mineCounter.style.cssText = ledStyle;

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '🙂';
  resetBtn.style.cssText = `
    font-size:20px;
    cursor:pointer;
    background:${bgColor};
    border-top:2px solid ${borderLight};
    border-left:2px solid ${borderLight};
    border-bottom:2px solid ${borderDark};
    border-right:2px solid ${borderDark};
    width:34px;
    height:34px;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:0;
    line-height:1;
  `;
  function setBtnBorder(el, topLeft, bottomRight) {
    el.style.borderTop = `2px solid ${topLeft}`;
    el.style.borderLeft = `2px solid ${topLeft}`;
    el.style.borderBottom = `2px solid ${bottomRight}`;
    el.style.borderRight = `2px solid ${bottomRight}`;
  }
  resetBtn.addEventListener('click', () => initGame());
  resetBtn.addEventListener('mousedown', () =>
    setBtnBorder(resetBtn, borderDark, borderLight));
  resetBtn.addEventListener('mouseup', () =>
    setBtnBorder(resetBtn, borderLight, borderDark));
  resetBtn.addEventListener('mouseleave', () =>
    setBtnBorder(resetBtn, borderLight, borderDark));

  const timerDisplay = document.createElement('div');
  timerDisplay.style.cssText = ledStyle;

  header.appendChild(mineCounter);
  header.appendChild(resetBtn);
  header.appendChild(timerDisplay);
  container.appendChild(header);

  // game grid
  const gridEl = document.createElement('div');
  gridEl.style.cssText = `display:grid; grid-template-columns:repeat(${cols}, 1fr); ${sunkenBorder}`;
  container.appendChild(gridEl);

  function initGame() {
    board = Array.from({length: rows}, () => Array(cols).fill(0));
    revealed = Array.from({length: rows}, () => Array(cols).fill(false));
    flagged = Array.from({length: rows}, () => Array(cols).fill(false));
    gameOver = false;
    firstClick = true;
    seconds = 0;

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    resetBtn.textContent = '🙂';
    render();
  }

  function placeMines(safeR, safeC) {
    if (__TEST_MODE__) {
      board[rows - 1][cols - 1] = -1; // place single mine at bottom-right corner for easy win testing
    } else {
      let placed = 0;

      while (placed < mineCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (board[r][c] === -1) {
          continue;
        }
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) {
          continue;
        }
        board[r][c] = -1;
        placed++;
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] === -1) {
          continue;
        }
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === -1) {
              count++;
            }
          }
        }
        board[r][c] = count;
      }
    }
  }

  function reveal(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || revealed[r][c] || flagged[r][c]) {
      return;
    }
    revealed[r][c] = true;
    if (board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          reveal(r + dr, c + dc);
        }
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c] !== -1 && !revealed[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  function handleClick(r, c) {
    if (gameOver || flagged[r][c] || revealed[r][c]) {
      return;
    }

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      timerInterval = setInterval(() => {
        seconds++;
        timerDisplay.textContent = String(Math.min(seconds, 999)).padStart(3, '0');
      }, 1000);
    }

    if (board[r][c] === -1) {
      gameOver = true;
      revealed[r][c] = true;
      clearInterval(timerInterval);
      resetBtn.textContent = '😵';
      recordResult('losses');
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          if (board[rr][cc] === -1) {
            revealed[rr][cc] = true;
          }
        }
      }
    } else {
      reveal(r, c);
      if (checkWin()) {
        gameOver = true;
        clearInterval(timerInterval);
        resetBtn.textContent = '😎';
        recordResult('wins');
      }
    }
    render();
  }

  function handleRightClick(e, r, c) {
    e.preventDefault();
    if (gameOver || revealed[r][c]) {
      return;
    }
    flagged[r][c] = !flagged[r][c];
    render();
  }

  function render() {
    const flagCount = flagged.flat().filter(Boolean).length;
    mineCounter.textContent = String(mineCount - flagCount).padStart(3, '0');
    timerDisplay.textContent = String(Math.min(seconds, 999)).padStart(3, '0');
    gridEl.replaceChildren();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');

        if (revealed[r][c]) {
          // flat revealed cell
          cell.style.cssText = `aspect-ratio:1; display:flex; ` +
            `align-items:center; justify-content:center; ` +
            `font-size:13px; font-weight:900; cursor:default; ` +
            `line-height:1; background:${revealedBg}; ` +
            `border:1px solid #808080;`;

          if (board[r][c] === -1) {
            cell.textContent = '💣';
            cell.style.background = '#ff0000';
          } else if (board[r][c] > 0) {
            cell.textContent = board[r][c];
            cell.style.color = numColors[board[r][c]];
          }

        } else {
          // raised unrevealed cell (classic 3D button look)
          cell.style.cssText = `aspect-ratio:1; display:flex; ` +
            `align-items:center; justify-content:center; ` +
            `font-size:12px; font-weight:bold; cursor:pointer; ` +
            `line-height:1; background:${bgColor}; ` +
            `border-top:2px solid ${borderLight}; ` +
            `border-left:2px solid ${borderLight}; ` +
            `border-bottom:2px solid ${borderDark}; ` +
            `border-right:2px solid ${borderDark};`;

          if (flagged[r][c]) {
            cell.textContent = '🚩';
          }
          cell.addEventListener('click', () => handleClick(r, c));
          cell.addEventListener('contextmenu', (e) => handleRightClick(e, r, c));
        }
        gridEl.appendChild(cell);
      }
    }
  }

  // stats bar
  const statsBar = document.createElement('div');
  statsBar.style.cssText = `display:flex; justify-content:space-between; ` +
    `align-items:center; margin-top:4px; padding:2px 4px; ` +
    `font-family:'Courier New',monospace; font-size:11px; ` +
    `color:#000; background:${bgColor};`;

  const statsText = document.createElement('span');
  const clearStatsBtn = document.createElement('button');
  clearStatsBtn.textContent = 'Reset Stats';
  clearStatsBtn.title = 'Reset win/loss stats';
  clearStatsBtn.style.cssText = `font-family:inherit; font-size:10px; ` +
    `cursor:pointer; background:${bgColor}; ` +
    `border-top:1px solid ${borderLight}; ` +
    `border-left:1px solid ${borderLight}; ` +
    `border-bottom:1px solid ${borderDark}; ` +
    `border-right:1px solid ${borderDark}; padding:1px 4px;`;
  clearStatsBtn.addEventListener('click', () => {
    saveStats({wins: 0, losses: 0});
    renderStats();
  });

  statsBar.appendChild(statsText);
  statsBar.appendChild(clearStatsBtn);
  container.appendChild(statsBar);

  function renderStats() {
    const s = loadStats();
    const total = s.wins + s.losses;
    const pct = total > 0 ? Math.round((s.wins / total) * 100) : 0;
    statsText.textContent = `W:${s.wins} L:${s.losses} | ${pct}%`;
  }

  function recordResult(field) {
    const s = loadStats();
    s[field]++;
    saveStats(s);
    renderStats();
  }

  initGame();
  renderStats();
  return container;
}
