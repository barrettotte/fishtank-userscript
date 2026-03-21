// ======== SOLITAIRE ========

export function buildSolitaire() {
  const suits = ['♠', '♥', '♦', '♣'];
  const suitColors = ['#000', '#e00', '#e00', '#000'];
  const valueNames = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const cardH = 62;
  const overlapFaceDown = 10;
  const overlapFaceUp = 22;
  const faviconUrl = 'https://www.fishtank.live/favicon.ico';
  const solStatsKey = 'fishtank-solitaire-stats';

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(solStatsKey)) || {wins: 0, losses: 0};
    } catch {
      return {wins: 0, losses: 0};
    }
  }

  function saveStats(stats) {
    localStorage.setItem(solStatsKey, JSON.stringify(stats));
  }

  let stock = [];
  let waste = [];
  let foundations = [[], [], [], []];
  let tableau = [[], [], [], [], [], [], []];
  let selected = null;
  let moveCount = 0;

  const container = document.createElement('div');
  container.style.cssText = `background:linear-gradient(135deg, #1b6b3a, #2d8f4e, #1b6b3a); padding:6px; user-select:none; border-radius:4px;`;

  const topRow = document.createElement('div');
  topRow.style.cssText = `display:flex; gap:4px; margin-bottom:8px; align-items:flex-start;`;
  container.appendChild(topRow);

  const tableauRow = document.createElement('div');
  tableauRow.style.cssText = 'display:flex; gap:4px;';
  container.appendChild(tableauRow);

  const statusBar = document.createElement('div');
  statusBar.style.cssText = `display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11px; color:#d4edda;`;

  const moveText = document.createElement('span');
  moveText.style.cssText = 'opacity:0.8;';

  const newGameBtn = document.createElement('button');
  newGameBtn.textContent = 'New Game';
  newGameBtn.style.cssText = 'font-size:10px; cursor:pointer; ' +
    'background:rgba(255,255,255,0.15); color:#fff; ' +
    'border:1px solid rgba(255,255,255,0.3); ' +
    'border-radius:3px; padding:2px 8px; ' +
    'transition:background 0.15s;';
  newGameBtn.addEventListener('mouseenter', () => newGameBtn.style.background = 'rgba(255,255,255,0.25)');
  newGameBtn.addEventListener('mouseleave', () => newGameBtn.style.background = 'rgba(255,255,255,0.15)');
  let gameStarted = false;
  newGameBtn.addEventListener('click', () => {
    // count abandoning an in-progress game as a loss
    if (gameStarted && !checkWin()) {
      recordResult('losses');
    }
    initSolitaire();
  });
  statusBar.appendChild(moveText);
  container.appendChild(statusBar);

  // stats bar
  const solStatsBar = document.createElement('div');
  solStatsBar.style.cssText = 'display:flex; ' +
    'justify-content:space-between; align-items:center; ' +
    'margin-top:2px; font-size:10px; color:#d4edda; ' +
    'opacity:0.8;';

  const solStatsText = document.createElement('span');
  const solBtnGroup = document.createElement('div');
  solBtnGroup.style.cssText = 'display:flex; gap:4px;';

  const clearSolStatsBtn = document.createElement('button');
  clearSolStatsBtn.textContent = 'Reset Stats';
  clearSolStatsBtn.title = 'Reset win/loss stats';
  clearSolStatsBtn.style.cssText = 'font-size:9px; ' +
    'cursor:pointer; background:rgba(255,255,255,0.1); ' +
    'color:#fff; border:1px solid rgba(255,255,255,0.2); ' +
    'border-radius:2px; padding:1px 4px;';
  clearSolStatsBtn.addEventListener('click', () => {
    saveStats({wins: 0, losses: 0});
    renderStats();
  });

  // match New Game button style to Reset
  newGameBtn.style.cssText = 'font-size:9px; ' +
    'cursor:pointer; background:rgba(255,255,255,0.1); ' +
    'color:#fff; border:1px solid rgba(255,255,255,0.2); ' +
    'border-radius:2px; padding:1px 4px;';

  solBtnGroup.appendChild(newGameBtn);
  solBtnGroup.appendChild(clearSolStatsBtn);
  solStatsBar.appendChild(solStatsText);
  solStatsBar.appendChild(solBtnGroup);
  container.appendChild(solStatsBar);

  function renderStats() {
    const s = loadStats();
    const total = s.wins + s.losses;
    const pct = total > 0 ? Math.round((s.wins / total) * 100) : 0;
    solStatsText.textContent = `W:${s.wins} L:${s.losses} | ${pct}%`;
  }

  function recordResult(field) {
    const s = loadStats();
    s[field]++;
    saveStats(s);
    renderStats();
  }

  function createDeck() {
    const deck = [];
    for (let s = 0; s < 4; s++) {
      for (let v = 1; v <= 13; v++) {
        deck.push({suit: s, value: v, faceUp: false});
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function isRed(suit) {
    return suit === 1 || suit === 2;
  }

  function canPlaceOnTableau(card, col) {
    const pile = tableau[col];
    if (pile.length === 0) {
      return card.value === 13;
    }
    const top = pile[pile.length - 1];
    return top.faceUp &&
      isRed(card.suit) !== isRed(top.suit) &&
      card.value === top.value - 1;
  }

  function canPlaceOnFoundation(card, fIdx) {
    const pile = foundations[fIdx];
    if (pile.length === 0) {
      // only aces on empty foundations, and check no other foundation already has this suit
      if (card.value !== 1) {
        return false;
      }
      return !foundations.some(f => f.length > 0 && f[0].suit === card.suit);
    }
    const top = pile[pile.length - 1];
    return card.suit === top.suit && card.value === top.value + 1;
  }

  function tryAutoFoundation(card, source, pile, cardIdx) {
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, f)) {
        if (source === 'waste') {
          waste.pop();
        } else if (source === 'tableau') {
          tableau[pile].splice(cardIdx);
          flipTopCard(pile);
        }
        foundations[f].push(card);
        moveCount++; gameStarted = true;
        return true;
      }
    }
    return false;
  }

  function flipTopCard(col) {
    const pile = tableau[col];
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true;
    }
  }

  function handleSelect(source, pile, cardIdx) {
    if (selected) {
      if (source === 'tableau') {
        const sel = selected;
        let cards;

        if (sel.source === 'waste') {
          cards = [waste[waste.length - 1]];
        } else if (sel.source === 'tableau') {
          cards = tableau[sel.pile].slice(sel.cardIdx);
        }

        if (cards && cards.length > 0 && canPlaceOnTableau(cards[0], pile)) {
          if (sel.source === 'waste') {
            waste.pop();
          } else if (sel.source === 'tableau') {
            tableau[sel.pile].splice(sel.cardIdx);
            flipTopCard(sel.pile);
          }
          tableau[pile].push(...cards);
          moveCount++; gameStarted = true;
          selected = null;
          render();
          return;
        }
      } else if (source === 'foundation') {
        const sel = selected;
        let card;

        if (sel.source === 'waste') {
          card = waste[waste.length - 1];
        } else if (sel.source === 'tableau') {
          const cards = tableau[sel.pile].slice(sel.cardIdx);
          if (cards.length === 1) {
            card = cards[0];
          }
        }

        if (card && canPlaceOnFoundation(card, pile)) {
          if (sel.source === 'waste') {
            waste.pop();
          } else if (sel.source === 'tableau') {
            tableau[sel.pile].splice(sel.cardIdx);
            flipTopCard(sel.pile);
          }
          foundations[pile].push(card);
          moveCount++; gameStarted = true;
          selected = null;
          render();
          if (checkWin()) {
            moveText.textContent = `You win! Moves: ${moveCount}`;
            recordResult('wins');
            gameStarted = false;
          }
          return;
        }
      }
      selected = null;
      render();
      return;
    }

    if (source === 'waste' && waste.length > 0) {
      selected = {source: 'waste', pile: 0, cardIdx: 0};
    } else if (source === 'tableau') {
      selected = {source, pile, cardIdx};
    }
    render();
  }

  function handleDblClick(source, pile, cardIdx) {
    let card;
    if (source === 'waste' && waste.length > 0) {
      card = waste[waste.length - 1];
    } else if (source === 'tableau') {
      const p = tableau[pile];
      if (cardIdx === p.length - 1) {
        card = p[cardIdx];
      }
    }

    if (card) {
      if (tryAutoFoundation(card, source, pile, cardIdx)) {
        selected = null;
        render();
        if (checkWin()) {
          moveText.textContent = `You win! Moves: ${moveCount}`;
          recordResult('wins');
          gameStarted = false;
        }
      }
    }
  }

  function drawStock() {
    gameStarted = true;
    selected = null;

    if (stock.length === 0) {
      stock = waste.reverse().map(c => {
        c.faceUp = false;
        return c;
      });
      waste = [];
    } else {
      const card = stock.pop();
      card.faceUp = true;
      waste.push(card);
    }
    render();
  }

  function checkWin() {
    return foundations.every(f => f.length === 13);
  }

  function initSolitaire() {
    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];
    selected = null;
    moveCount = 0;
    gameStarted = false;

    if (__TEST_MODE__) {
      // fill foundations to Q, put Kings in tableau for easy win
      for (let s = 0; s < 4; s++) {
        for (let v = 1; v <= 12; v++) {
          foundations[s].push({suit: s, value: v, faceUp: true});
        }
        tableau[s].push({suit: s, value: 13, faceUp: true});
      }
    } else {
      const deck = createDeck();
      let idx = 0;
      for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
          const card = deck[idx++];
          card.faceUp = (row === col);
          tableau[col].push(card);
        }
      }
      for (; idx < deck.length; idx++) {
        deck[idx].faceUp = false;
        stock.push(deck[idx]);
      }
    }
    render();
  }

  function renderCard(card, isSel) {
    const el = document.createElement('div');
    const color = suitColors[card.suit];
    const val = valueNames[card.value];
    const suit = suits[card.suit];

    el.style.cssText = 'width:100%; height:' + cardH + 'px; ' +
      'position:relative; border-radius:4px; ' +
      'background:#fff; cursor:pointer; flex-shrink:0; ' +
      'box-shadow:0 1px 3px rgba(0,0,0,0.3); ' +
      'overflow:hidden; ' +
      (isSel ? 'outline:2px solid #3498db; outline-offset:-1px;' : 'border:1px solid #ccc;');

    // top-left value + suit
    const topLabel = document.createElement('div');
    topLabel.style.cssText = `position:absolute; top:1px; ` +
      `left:3px; font-size:10px; font-weight:bold; ` +
      `line-height:1.1; color:${color};`;
    topLabel.innerHTML = `${val}<br>${suit}`;
    el.appendChild(topLabel);

    // center suit
    const centerSuit = document.createElement('div');
    centerSuit.style.cssText = 'position:absolute; ' +
      'top:50%; left:50%; transform:translate(-50%,-50%); ' +
      `font-size:18px; color:${color}; opacity:0.6;`;
    centerSuit.textContent = suit;
    el.appendChild(centerSuit);

    return el;
  }

  function renderCardBack() {
    const el = document.createElement('div');
    el.style.cssText = 'width:100%; height:' + cardH + 'px; ' +
      'border-radius:4px; flex-shrink:0; ' +
      'box-shadow:0 1px 3px rgba(0,0,0,0.3); ' +
      'border:1px solid #1a3a5c; overflow:hidden; ' +
      'background:linear-gradient(135deg, #1a3a7c, #2855a0); ' +
      'position:relative; display:flex; ' +
      'align-items:center; justify-content:center; ' +
      'overflow:hidden;';

    // inner border
    const inner = document.createElement('div');
    inner.style.cssText = 'position:absolute; inset:3px; ' +
      'border:1px solid rgba(255,255,255,0.2); ' +
      'border-radius:2px;';
    el.appendChild(inner);

    // favicon
    const icon = document.createElement('img');
    icon.src = faviconUrl;
    icon.style.cssText = 'width:20px; height:20px; image-rendering:pixelated; opacity:0.7;';
    el.appendChild(icon);
    return el;
  }

  function renderEmptySlot(label) {
    const el = document.createElement('div');
    el.style.cssText = 'width:100%; height:' + cardH + 'px; ' +
      'border:2px solid rgba(255,255,255,0.15); ' +
      'border-radius:4px; flex-shrink:0; ' +
      'display:flex; align-items:center; ' +
      'justify-content:center; font-size:14px; ' +
      'color:rgba(255,255,255,0.2);';
    if (label) {
      el.textContent = label;
    }
    return el;
  }

  function render() {
    topRow.replaceChildren();
    tableauRow.replaceChildren();
    if (!checkWin()) {
      moveText.textContent = `Moves: ${moveCount}`;
    }
    const colStyle = 'flex:1; min-width:0;';

    // stock
    const stockEl = document.createElement('div');
    stockEl.style.cssText = colStyle;
    if (stock.length > 0) {
      const back = renderCardBack();
      back.style.cursor = 'pointer';
      back.addEventListener('click', drawStock);
      stockEl.appendChild(back);
    } else {
      const empty = renderEmptySlot('↻');
      empty.style.cursor = 'pointer';
      empty.addEventListener('click', drawStock);
      stockEl.appendChild(empty);
    }
    topRow.appendChild(stockEl);

    // waste
    const wasteEl = document.createElement('div');
    wasteEl.style.cssText = colStyle;
    if (waste.length > 0) {
      const card = waste[waste.length - 1];
      const isSel = selected?.source === 'waste';

      const cel = renderCard(card, isSel);
      cel.addEventListener('click', () => handleSelect('waste', 0, 0));
      cel.addEventListener('dblclick', () => handleDblClick('waste', 0, 0));
      wasteEl.appendChild(cel);
    } else {
      wasteEl.appendChild(renderEmptySlot());
    }
    topRow.appendChild(wasteEl);

    // spacer
    const spacer = document.createElement('div');
    spacer.style.cssText = colStyle;
    topRow.appendChild(spacer);

    // foundations
    for (let f = 0; f < 4; f++) {
      const fEl = document.createElement('div');
      fEl.style.cssText = colStyle;

      if (foundations[f].length > 0) {
        const card = foundations[f][foundations[f].length - 1];
        fEl.appendChild(renderCard(card, false));
      } else {
        const empty = renderEmptySlot(suits[f]);
        empty.addEventListener('click', () => handleSelect('foundation', f, 0));
        fEl.appendChild(empty);
      }
      fEl.addEventListener('click', () => handleSelect('foundation', f, 0));
      topRow.appendChild(fEl);
    }

    // tableau
    for (let col = 0; col < 7; col++) {
      const colEl = document.createElement('div');
      colEl.style.cssText = colStyle + ' display:flex; flex-direction:column;';
      const pile = tableau[col];

      if (pile.length === 0) {
        const empty = renderEmptySlot();
        empty.addEventListener('click', () =>
          handleSelect('tableau', col, 0));
        colEl.appendChild(empty);
      } else {
        for (let i = 0; i < pile.length; i++) {
          const card = pile[i];
          let cel;
          if (!card.faceUp) {
            cel = renderCardBack();
          } else {
            const isSel = selected?.source === 'tableau' && selected.pile === col && i >= selected.cardIdx;
            cel = renderCard(card, isSel);
            cel.addEventListener('click', () => handleSelect('tableau', col, i));
            cel.addEventListener('dblclick', () => handleDblClick('tableau', col, i));
          }
          if (i > 0) {
            const gap = card.faceUp
              ? overlapFaceUp : overlapFaceDown;
            cel.style.marginTop = '-' + (cardH - gap) + 'px';
          }
          colEl.appendChild(cel);
        }
      }
      tableauRow.appendChild(colEl);
    }
  }

  initSolitaire();
  renderStats();
  return container;
}
