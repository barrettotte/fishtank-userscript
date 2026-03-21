// ======== NEW SITE ========

import { roomNames } from './common.js';
import { buildMinesweeper } from './minesweeper.js';
import { buildSolitaire } from './solitaire.js';

// Initializes new site (www.fishtank.live)
export function initNew() {

  // alternate cameras: switch to parent first, then click transition polygon
  // xyRatio is the first X / first Y of the polygon's points (scale-invariant across screen sizes)
  const polygonTolerance = 0.15;
  const altCameras = {
    'Bar Alternate': {parent: 'Bar', xyRatio: 9.19},
    'Dorm Alternate': {parent: 'Dorm', xyRatio: 390},
    'Market Alternate': {parent: 'Market', xyRatio: 263},
  };

  const altBtnMarker = 'data-userscript-alt';
  let activeRoom = null;

  // Finds a camera tile button in site's camera grid by matching its room name text
  function findCameraGridButton(roomName) {
    for (const btn of document.querySelectorAll('button')) {
      if (btn.hasAttribute(altBtnMarker)) {
        continue;
      }
      for (const div of btn.querySelectorAll('div')) {
        if (div.children.length === 0 && div.textContent.trim() === roomName) {
          return btn;
        }
      }
    }
    return null;
  }

  // Scans DOM for a visible stream overlay and returns the room name of the active camera, or null
  function detectActiveCamera() {
    for (const overlay of document.querySelectorAll('div.fixed')) {
      if (!overlay.querySelector('video, button[class*="close"], button[aria-label*="close" i]')) {
        continue;
      }
      for (const el of overlay.querySelectorAll('div.absolute')) {
        const text = el.textContent?.trim();
        if (text && roomNames.includes(text)) {
          return text;
        }
      }
    }
    return null;
  }

  // Switches to a camera, handling alt cameras via polygon transition
  function switchCamera(roomName) {
    const altCamera = altCameras[roomName];

    if (altCamera) {
      // find matching transition polygon by scale-invariant X/Y ratio

      const findAltPolygon = () => {
        const polygons = document.querySelectorAll('polygon');
        return Array.from(polygons).find(p => {
          const pts = p.getAttribute('points');
          if (!pts) {
            return false;
          }
          const coords = pts.split(',').map(Number);
          if (coords.length < 2 || coords[1] === 0) {
            return false;
          }
          const ratio = coords[0] / coords[1];
          return Math.abs(ratio - altCamera.xyRatio) / altCamera.xyRatio < polygonTolerance;
        });
      };

      // click the center of a polygon for reliable hit detection
      const clickPolygon = (polygon) => {
        const rect = polygon.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        polygon.dispatchEvent(new MouseEvent('click', {
          bubbles: true, clientX: cx, clientY: cy,
        }));

        activeRoom = roomName;
        console.log(`fishtank-userscript: switched to ${roomName}`);
      };
      const alreadyOnParent = activeRoom === altCamera.parent;

      // if already on the parent stream, try clicking the polygon immediately
      if (alreadyOnParent) {
        const polygon = findAltPolygon();
        if (polygon) {
          clickPolygon(polygon);
          return;
        }
      }

      // poll for the polygon (skip parent switch + delay if already on it)
      if (!alreadyOnParent) {
        switchCamera(altCamera.parent);
      }
      console.log(`fishtank-userscript: waiting for transition polygon to switch to ${roomName}`);

      const pollForPolygon = (attempts = 0) => {
        const match = findAltPolygon();
        if (match) {
          clickPolygon(match);
        } else if (attempts < 60) {
          setTimeout(() => pollForPolygon(attempts + 1), 500);
        } else {
          console.warn(`fishtank-userscript: transition polygon not found for ${roomName}`);
        }
      };
      setTimeout(() => pollForPolygon(), alreadyOnParent ? 0 : 2000);
      return;
    }

    const gridBtn = findCameraGridButton(roomName);
    if (gridBtn) {
      console.log(`fishtank-userscript: switching to camera ${roomName}`);
      gridBtn.click();
      activeRoom = roomName;
    } else {
      console.warn(`fishtank-userscript: camera button not found for ${roomName}`);
    }
  }

  // Creates an alt camera button matching the official grid's styling
  function createAltGridButton(roomName, parentBtn) {
    const offline = parentBtn && (parentBtn.classList.contains('opacity-60') || parentBtn.classList.contains('cursor-not-allowed'));

    const btn = document.createElement('button');
    btn.setAttribute(altBtnMarker, '');

    const baseBtnClass = 'p-[2px] select-none group hover:brightness-105 ' +
      'hover:outline-1 hover:outline-tertiary bg-gradient-to-b from-dark-400/75 to-dark-500/75';
    const baseInnerClass = 'px-[1px] py-0.5 text-[11px] 3xl:text-xs font-medium ' +
      'tracking-tighter 3xl:tracking-normal whitespace-nowrap overflow-hidden text-ellipsis ' +
      'text-center border leading-tight group-hover:!text-link bg-gradient-to-t from-dark-300 ' +
      'to-dark-400';
    btn.className = offline
      ? `${baseBtnClass} cursor-not-allowed opacity-60`
      : `${baseBtnClass} cursor-pointer`;

    const inner = document.createElement('div');
    inner.className = offline
      ? `${baseInnerClass} text-light-text/30 border-light/25`
      : `${baseInnerClass} text-light-text text-shadow-md border-light/25`;
    inner.textContent = roomName;

    btn.appendChild(inner);
    if (!offline) {
      btn.addEventListener('click', () => switchCamera(roomName));
    }
    return btn;
  }

  // Finds the official camera grid (not the contestant grid)
  function findCameraGrid() {
    const grids = document.querySelectorAll('.grid.grid-cols-5');
    for (const g of grids) {
      if (g.className.includes('3xl:grid-cols-4')) {
        return g;
      }
    }
    return null;
  }

  // Mutes UI sounds (click/hover sfx) by silencing Audio.play()
  // Stream audio uses <video> elements, not Audio, so it's unaffected
  function muteUISounds() {
    const origPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function() {
      this.volume = 0;
      return origPlay.call(this);
    };
    console.log('fishtank-userscript: muted UI sounds');
  }

  // Injects alt camera buttons into the official camera grid, after their parent buttons
  let altInjectTimer = null;
  function injectAltButtons() {
    const grid = findCameraGrid();
    if (!grid || grid.querySelector(`[${altBtnMarker}]`) || altInjectTimer) {
      return;
    }
    altInjectTimer = setTimeout(() => { altInjectTimer = null; }, 500);

    // insert alt buttons after their parent buttons
    for (const [altName, config] of Object.entries(altCameras)) {
      const parentBtn = Array.from(grid.children).find(el => {
        const div = el.querySelector('div');
        return div && div.textContent.trim() === config.parent;
      });
      if (parentBtn) {
        const altBtn = createAltGridButton(altName, parentBtn);
        parentBtn.after(altBtn);
      }
    }
    console.log('fishtank-userscript: injected alt camera buttons');
  }

  const TAB_BASE_BTN = 'p-0.5 pb-0 rounded-t-md cursor-pointer ' +
    'select-none transition-[filter,box-shadow,transform] ' +
    'duration-150 ease-spring hover:brightness-105 hover:shadow-sm';
  const TAB_BASE_INNER = 'px-2.5 py-1 rounded-t-sm border-2 ' +
    'border-b-0 leading-none flex items-center justify-center ' +
    'text-light-text';

  const TAB_INACTIVE_BTN = `${TAB_BASE_BTN} z-0 translate-y-[4px] ` +
    'hover:translate-y-0 bg-gradient-to-r from-secondary-500 ' +
    'to-secondary-600/75';
  const TAB_INACTIVE_INNER = `${TAB_BASE_INNER} bg-gradient-to-t ` +
    'from-secondary-400 to-secondary-500 border-light/25';
  const TAB_ACTIVE_BTN = `${TAB_BASE_BTN} outline-2 outline-tertiary ` +
    'z-10 bg-gradient-to-r from-tertiary-500 to-tertiary-600/75';
  const TAB_ACTIVE_INNER = `${TAB_BASE_INNER} bg-gradient-to-t ` +
    'from-tertiary-400 to-tertiary-500 border-light/25';

  // Creates a tab button (default secondary, 'tertiary' for games tab)
  function createTabButton(svgHtml, title, variant) {
    const isTertiary = variant === 'tertiary';
    const tab = document.createElement('button');
    tab.className = isTertiary
      ? `${TAB_ACTIVE_BTN.replace('z-10', 'z-0')} translate-y-[4px] hover:translate-y-0`
      : TAB_INACTIVE_BTN;
    tab.title = title;

    const inner = document.createElement('div');
    inner.className = isTertiary
      ? TAB_ACTIVE_INNER : TAB_INACTIVE_INNER;
    inner.innerHTML = svgHtml;

    tab.appendChild(inner);
    return tab;
  }

  function setTabActive(tab, active) {
    tab.className = active ? TAB_ACTIVE_BTN : TAB_INACTIVE_BTN;
    tab.firstElementChild.className = active
      ? TAB_ACTIVE_INNER : TAB_INACTIVE_INNER;
  }

  // Finds the camera grid section inside the chat panel
  function findCamSection() {
    const grid = findCameraGrid();
    return grid?.closest('[class*="shrink-0"]') || grid?.parentElement?.parentElement;
  }

  // ======== GAMES TAB ========

  let gamesEl = null;
  let gamesActive = false;
  let gamesTabRef = null;
  let activeGame = 'solitaire';
  const gameInstances = {};

  // Finds the content area inside the chat panel (parent of cam/contestant sections)
  function findContentArea() {
    const camSection = findCamSection();
    if (camSection) {
      return camSection.parentElement;
    }
    // fallback: find the flex column container inside the chat inner panel
    const chatPanel = document.querySelector('div.fixed.bottom-0.right-0');
    return chatPanel?.querySelector('div.flex.flex-col.h-full');
  }

  // Finds swappable sections (camera grid, contestant panel) — not the chat
  function findSwappableSections() {
    const contentArea = findContentArea();
    if (!contentArea) {
      return [];
    }
    return Array.from(contentArea.children).filter(el =>
      el !== gamesEl && el.className?.includes('shrink-0')
    );
  }

  // Deactivates the site's currently-active tab visually
  function deactivateSiteTabs() {
    const tabBar = document.querySelector(
      'div.absolute.bottom-full div.flex.items-end'
    );
    if (!tabBar) {
      return;
    }
    const siteTabs = tabBar.querySelectorAll(
      'button:not([data-userscript-tab])'
    );
    for (const tab of siteTabs) {
      if (tab.className.includes('z-10')) {
        tab.dataset.wasActive = tab.className;
        tab.firstElementChild.dataset.wasActive =
          tab.firstElementChild.className;
        // switch to secondary/inactive style
        tab.className = TAB_INACTIVE_BTN;
        tab.firstElementChild.className = TAB_INACTIVE_INNER;
      }
    }
  }

  // Restores site tabs to their saved active state
  function restoreSiteTabs() {
    const tabBar = document.querySelector(
      'div.absolute.bottom-full div.flex.items-end'
    );
    if (!tabBar) {
      return;
    }
    const siteTabs = tabBar.querySelectorAll(
      'button:not([data-userscript-tab])'
    );
    for (const tab of siteTabs) {
      if (tab.dataset.wasActive) {
        tab.className = tab.dataset.wasActive;
        delete tab.dataset.wasActive;
      }
      if (tab.firstElementChild?.dataset.wasActive) {
        tab.firstElementChild.className =
          tab.firstElementChild.dataset.wasActive;
        delete tab.firstElementChild.dataset.wasActive;
      }
    }
  }

  function showGames() {
    if (!gamesEl) {
      gamesEl = buildGamesPanel();
    }

    // hide swappable sections (cam grid, contestant panel), not chat
    for (const section of findSwappableSections()) {
      section.dataset.hiddenByGames = section.style.display;
      section.style.display = 'none';
    }

    const contentArea = findContentArea();
    if (contentArea && !gamesEl.parentElement) {
      contentArea.prepend(gamesEl);
    }

    gamesEl.style.display = '';
    gamesActive = true;
    deactivateSiteTabs();
    if (gamesTabRef) {
      // active: tertiary, raised, no translate
      gamesTabRef.className = TAB_ACTIVE_BTN;
      gamesTabRef.firstElementChild.className = TAB_ACTIVE_INNER;
    }
  }

  function hideGames() {
    // restore sections hidden by showGames
    const contentArea = findContentArea();
    if (contentArea) {
      for (const child of contentArea.children) {
        if (child.dataset.hiddenByGames !== undefined) {
          child.style.display = child.dataset.hiddenByGames;
          delete child.dataset.hiddenByGames;
        }
      }
    }

    if (gamesEl) {
      gamesEl.style.display = 'none';
    }
    gamesActive = false;
    restoreSiteTabs();
    if (gamesTabRef) {
      setTabActive(gamesTabRef, false);
    }
  }

  function toggleGames() {
    if (gamesActive) {
      hideGames();
    } else {
      showGames();
    }
  }

  function switchGame(name) {
    activeGame = name;

    const container = gamesEl?.querySelector('[data-game-content]');
    if (!container) {
      return;
    }

    // hide all, show selected
    for (const [key, el] of Object.entries(gameInstances)) {
      el.style.display = key === name ? '' : 'none';
    }

    // lazy-create game on first switch
    if (!gameInstances[name]) {
      const builders = {
        minesweeper: buildMinesweeper,
        solitaire: buildSolitaire,
      };
      if (builders[name]) {
        gameInstances[name] = builders[name]();
        container.appendChild(gameInstances[name]);
      }
    }

    // update selector buttons
    gamesEl?.querySelectorAll('[data-game-btn]').forEach(btn => {
      const isActive = btn.dataset.gameBtn === name;
      btn.style.borderTop = isActive ? '2px solid #808080' : '2px solid #fff';
      btn.style.borderLeft = isActive ? '2px solid #808080' : '2px solid #fff';
      btn.style.borderBottom = isActive ? '2px solid #fff' : '2px solid #808080';
      btn.style.borderRight = isActive ? '2px solid #fff' : '2px solid #808080';
      btn.style.fontWeight = isActive ? 'bold' : 'normal';
    });
  }

  function buildGamesPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = 'shrink:0;';

    // game selector toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `display:flex; gap:2px; padding:2px 4px; background:#c0c0c0; border-bottom:2px solid #808080;`;

    const games = [
      {id: 'solitaire', label: 'Solitaire'},
      {id: 'minesweeper', label: 'Minesweeper'},
    ];
    for (const game of games) {
      const btn = document.createElement('button');
      btn.dataset.gameBtn = game.id;
      btn.textContent = game.label;
      btn.style.cssText = 'font-family:inherit; font-size:11px; ' +
        'padding:2px 8px; cursor:pointer; background:#c0c0c0; ' +
        'border-top:2px solid #fff; border-left:2px solid #fff; ' +
        'border-bottom:2px solid #808080; border-right:2px solid #808080;';
      btn.addEventListener('click', () => switchGame(game.id));
      toolbar.appendChild(btn);
    }
    panel.appendChild(toolbar);

    // game content area
    const content = document.createElement('div');
    content.dataset.gameContent = '';
    panel.appendChild(content);

    // create default game
    gameInstances.solitaire = buildSolitaire();
    content.appendChild(gameInstances.solitaire);

    // set initial active state
    requestAnimationFrame(() => switchGame(activeGame));

    return panel;
  }

  // Injects custom tab buttons into the chat panel tab bar
  function injectTabs() {
    const tabBar = document.querySelector('div.absolute.bottom-full div.flex.items-end');
    if (!tabBar || tabBar.querySelector('[data-userscript-tab]')) {
      return;
    }

    // games tab (chess knight icon)
    const gamesSvg = '<svg width="18" height="18" viewBox="0 0 45 45" ' +
      'fill="currentColor" class="drop-shadow-[2px_2px_1px_rgba(0,0,0,0.25)]">' +
      '<path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 ' +
      'C 15,30 25,32.5 23,18"/>' +
      '<path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 ' +
      'C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 ' +
      '11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 ' +
      '6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 ' +
      'C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 ' +
      '16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 ' +
      'C 22,7 22,10 22,10"/></svg>';
    const gamesTab = createTabButton(gamesSvg, 'Games');
    gamesTab.setAttribute('data-userscript-tab', 'games');
    gamesTabRef = gamesTab;
    gamesTab.addEventListener('click', () => toggleGames());
    tabBar.appendChild(gamesTab);

    // classic site tab
    const classicSvg = '<svg width="18" height="18" viewBox="0 0 24 24" ' +
      'fill="currentColor" class="drop-shadow-[2px_2px_1px_rgba(0,0,0,0.25)]">' +
      '<path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2' +
      'v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
    const classicTab = createTabButton(classicSvg, 'Open classic site');
    classicTab.setAttribute('data-userscript-tab', 'classic');
    classicTab.addEventListener('click', () => window.open('https://classic.fishtank.live/', '_blank'));
    tabBar.appendChild(classicTab);

    // when site tabs are clicked, hide games and show camera grid
    const siteTabs = tabBar.querySelectorAll('button:not([data-userscript-tab])');
    siteTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (gamesActive) {
          hideGames();
        }
      });
    });

    // restore games state if active before React re-render
    if (gamesActive) {
      setTabActive(gamesTab, true);
      requestAnimationFrame(() => showGames());
    }

    console.log('fishtank-userscript: injected custom tabs');
  }

  // Watches for DOM changes to detect active camera and re-inject buttons if React re-renders
  function setupObserver() {
    let detectTimeout = null;
    const observer = new MutationObserver(() => {
      // re-inject if React re-rendered the grid
      injectAltButtons();
      injectTabs();

      // debounced active camera detection
      if (detectTimeout) {
        return;
      }

      detectTimeout = setTimeout(() => {
        detectTimeout = null;
        const detected = detectActiveCamera();
        if (detected !== activeRoom) {
          console.log(`fishtank-userscript: active camera changed ${activeRoom || 'none'} -> ${detected || 'none'}`);
          activeRoom = detected;
        }
      }, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  // The camera grid and tab bar are inside a 2xl-only container (hidden below 1536px).
  // Set up the observer immediately, and let it handle injection when elements appear.
  setupObserver();

  // mute UI hover/click sounds (does not affect stream audio)
  muteUISounds();

  // also try injecting immediately in case elements already exist
  injectAltButtons();
  injectTabs();

  console.log('fishtank-userscript: initialized for new site');
}
