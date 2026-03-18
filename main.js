// ==UserScript==
// @name         fishtank-userscript
// @description  UserScript to tweak/add features to fishtank.live (season 5)
// @namespace    http://tampermonkey.net/
// @version      5.0.1
// @author       barrettotte
// @license      MIT
// @match        *://www.fishtank.live/*
// @match        *://classic.fishtank.live/*
// @updateURL    https://raw.githubusercontent.com/barrettotte/fishtank-userscript/master/main.js
// @downloadURL  https://raw.githubusercontent.com/barrettotte/fishtank-userscript/master/main.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {

  // sorted room name list (must match site's displayed names)
  const roomNames = [
    'Balcony', 'Bar', 'Bar Alternate', 'Bar PTZ', 'Cameraman', 'Closet',
    'Confessional', 'Corridor', 'Dining Room', 'Director Mode', 'Dorm',
    'Dorm Alternate', 'Foyer', 'Glassroom', 'Hallway Down', 'Hallway Up',
    'Jacuzzi', 'Kitchen', 'Market', 'Market Alternate',
  ];

  // Returns promise that resolves when element matching selector appears in DOM
  function waitForElement(selector, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) {
        return resolve(existing);
      }
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearTimeout(timeout);
          observer.disconnect();
          resolve(el);
        }
      });
      const timeout = setTimeout(() => {
        observer.disconnect();
        console.warn(`fishtank-userscript: waitForElement timed out for "${selector}"`);
        reject(new Error(`waitForElement timed out for "${selector}"`));
      }, timeoutMs);
      observer.observe(document.body, {childList: true, subtree: true});
    });
  }

  // ======== CLASSIC SITE ========

  // Initializes classic site (classic.fishtank.live)
  function initClassic() {
    const camSwitchTimeoutMs = 250;
    const offYellowColor = '#f8ec94';
    const midGrayColor = '#aaa';
    const darkGrayColor = '#505050';
    const camListWidgetId = 'cams_cams__custom';
    const chatToggleId = 'custom_chat_toggle';

    const leftPanelSelector = "div[class^='layout_left__']";
    const rightPanelSelector = "div[class^='layout_right__']";
    const statusBarSelector = "div[class^='status-bar_status-bar__']";
    const livestreamNameSelector = "[class^='live-stream-player_name__']";
    const missionWidgetSelector = "div[class^='missions_missions__']";
    const adWidgetSelector = "div[class^='ads_ads__']";

    // room name -> camera element ID (classic site only)
    const classicCameraIds = {
      "Balcony": "bkny-5",
      "Bar": "brrr-5",
      "Bar Alternate": "brrr2-5",
      "Bar PTZ": "brpz-5",
      "Cameraman": "cameraman-5",
      "Closet": "dmcl-5",
      "Confessional": "cfsl-5",
      "Corridor": "codr-5",
      "Dining Room": "dnrm-5",
      "Director Mode": "dirc-5",
      "Dorm": "dmrm-5",
      "Dorm Alternate": "dmrm2-5",
      "Foyer": "foyr-5",
      "Glassroom": "gsrm-5",
      "Hallway Down": "hwdn-5",
      "Hallway Up": "hwup-5",
      "Jacuzzi": "jckz-5",
      "Kitchen": "ktch-5",  
      "Market": "mrke-5",
      "Market Alternate": "mrke2-5",
    };

    const closeBtnSelectors = [
      "button[class^='live-stream-player_close__']",
      "button[class^='close-button_close-button__']",
      "button[class^='clips_close__']",
      "button[class^='episodes_close__']",
      "button[class^='games_close__']",
      "button[class^='stocks_close__']",
    ];

    // Finds and clicks first available close button to dismiss any open overlay (stream, clips, etc)
    function pressCloseButton() {
      const closeBtn = closeBtnSelectors.map(s => document.querySelector(s)).find(btn => btn);
      if (closeBtn) {
        closeBtn.click();
      }
    }

    // Highlights matching camera button in classic widget, resetting all others
    function highlightActiveCameraInWidget(room) {
      const camListButtons = document.querySelectorAll(`#${camListWidgetId} > div > div:nth-child(2) > button`);
      for (const btn of camListButtons) {
        btn.style.color = (btn.textContent === room) ? offYellowColor : midGrayColor;
      }
    }

    // Creates a clickable camera button for classic site widget. Closes current overlay before switching
    function createCameraButton(room, camId) {
      const camBtn = document.createElement('button');
      camBtn.textContent = room;

      camBtn.style.backgroundColor = '#191D21';
      camBtn.style.color = midGrayColor;
      camBtn.style.border = `1px solid ${darkGrayColor}`;
      camBtn.style.fontSize = '12px';
      camBtn.style.paddingTop = '5px';
      camBtn.style.paddingBottom = '5px';
      camBtn.style.paddingLeft = '3px';
      camBtn.style.paddingRight = '3px';

      camBtn.onclick = () => {
        console.log(`fishtank-userscript: switching to camera ${room} (${camId})`);
        pressCloseButton();

        setTimeout(() => {
          waitForElement(`#${camId}`)
            .then((camEl) => camEl.click())
            .catch((err) => console.warn('fishtank-userscript:', err.message))
        }, camSwitchTimeoutMs);
      };

      camBtn.style.cursor = 'pointer';
      camBtn.onmouseover = () => {
        camBtn.style.backgroundColor = '#2b2d2e';
        camBtn.style.border = '1px solid white';
      };
      camBtn.onmouseout = () => {
        camBtn.style.backgroundColor = '#191D21';
        camBtn.style.border = `1px solid ${darkGrayColor}`;
      };

      return camBtn;
    }

    // Toggles classic camera list widget body visibility and chevron direction
    function collapseCameraListWidget(header) {
      if (header) {
        const container = header.parentElement;
        const body = header.nextElementSibling;
        const icon = header.children[0].children[0];
        const doCollapse = icon.style.transform === 'scaleY(-1)';

        if (doCollapse) {
          container.style.borderBottom = '0';
          body.style.display = 'none';
          icon.style.transform = 'scaleY(1)';
        } else {
          container.style.border = `1px solid ${darkGrayColor}`;
          body.style.display = 'flex';
          icon.style.transform = 'scaleY(-1)';
        }
      }
    }

    // Builds and inserts camera list widget into the classic site left panel, above the ads widget
    function addCameraListWidget(missionWidget) {
      const leftPanel = document.querySelector(leftPanelSelector);
      if (!leftPanel) {
        console.error('Failed to add camera list widget. Missing left panel reference.');
        return;
      }

      const cameraWidget = document.createElement('div');
      cameraWidget.id = camListWidgetId;

      const container = document.createElement('div');
      const sourceClasses = missionWidget.children[0]?.classList ?? [];
      container.classList.add(...Array.from(sourceClasses).filter(c => !c.startsWith('panel_collapsed')));
      cameraWidget.appendChild(container);

      const header = document.createElement('div');
      header.classList.add(...missionWidget.children[0].children[0].classList);
      header.addEventListener('click', (event) => collapseCameraListWidget(event.currentTarget));
      container.appendChild(header);

      const headerCollapse = document.createElement('div');
      headerCollapse.style.display = 'flex';
      headerCollapse.style.marginLeft = '-4px';
      headerCollapse.style.marginRight = '4px';
      headerCollapse.style.color = offYellowColor;
      headerCollapse.style.filter = 'drop-shadow(2px 3px 0 #000000)';
      header.appendChild(headerCollapse);

      const headerCollapseIcon = document.createElement('div');
      headerCollapseIcon.style.display = 'inline-flex';
      headerCollapseIcon.style.alignItems = 'center';
      headerCollapseIcon.style.justifyContent = 'center';
      headerCollapseIcon.style.color = offYellowColor;
      headerCollapseIcon.style.transform = 'scaleY(-1)';
      headerCollapseIcon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M19 8H5V10H7V12H9V14H11V16H13V14H15V12H17V10H19V8Z" fill="${offYellowColor}"></path>
        </svg>
      `;
      headerCollapse.appendChild(headerCollapseIcon);

      const headerTitle = document.createElement('div');
      headerTitle.style.color = 'white';
      headerTitle.style.fontWeight = '600';
      headerTitle.textContent = 'Cameras';
      header.appendChild(headerTitle);

      const body = document.createElement('div');
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '4px';
      body.style.height = '100%';
      body.style.padding = '8px';

      for (const room of Object.keys(classicCameraIds).sort()) {
        body.appendChild(createCameraButton(room, classicCameraIds[room]));
      }
      container.appendChild(body);

      const adsWidget = leftPanel.querySelector(adWidgetSelector)
      if (!adsWidget) {
        console.error('Failed to add camera list widget. Missing ads widget reference.');
        return;
      }

      leftPanel.insertBefore(cameraWidget, adsWidget);
      console.log('Added camera list widget');
    }

    // Adds a CHAT on/off toggle button to the classic site status bar, allowing users to hide right chat panel
    function addChatToggleClassic(statusBar) {
      const statusBarLeft = statusBar.children[0];
      if (!statusBarLeft) {
        console.error('Failed to add chat toggle. Missing status bar left reference.');
        return;
      }

      const ttsButton = statusBarLeft.children[0];
      if (!ttsButton) {
        console.error('Failed to add chat toggle. Missing TTS status reference.');
        return;
      }

      const chatToggle = document.createElement('button');
      chatToggle.id = chatToggleId;
      chatToggle.classList.add(...Array.from(ttsButton.classList).filter(c => !c.startsWith('status-bar_enabled__')));

      chatToggle.addEventListener('click', (event) => {
        const btn = event.currentTarget;
        if (!btn) {
          console.error('Cannot toggle chat. No event target found.');
          return;
        }
        if (btn.children.length !== 2) {
          console.error('Missing chat toggle children. Expected 2 children.');
          return;
        }

        const rightPanel = document.querySelector(rightPanelSelector);
        if (!rightPanel) {
          console.error('Cannot toggle chat. Failed to find right panel reference.');
          return;
        }

        const status = btn.children[1];
        const chatVisible = rightPanel.style.display === 'none';
        if (chatVisible) {
          rightPanel.style.display = 'flex';
          status.textContent = 'On';
          status.style.color = 'white';
        } else {
          rightPanel.style.display = 'none';
          status.textContent = 'Off';
          status.style.color = midGrayColor;
        }
        console.log(`fishtank-userscript: chat toggled ${chatVisible ? 'on' : 'off'}`);
      });

      const chatLabel = document.createElement('div');
      chatLabel.textContent = 'CHAT';
      chatLabel.style.color = 'white';
      chatLabel.style.letterSpacing = '-1.5px';
      chatLabel.style.textTransform = 'uppercase';
      chatLabel.style.fontWeight = '500';
      chatToggle.appendChild(chatLabel);

      const chatStatus = document.createElement('div');
      chatStatus.id = 'custom-chat-status';
      chatStatus.textContent = 'On';
      chatStatus.style.color = 'white';
      chatStatus.style.whiteSpace = 'nowrap';
      chatStatus.style.textTransform = 'uppercase';
      chatStatus.style.fontSize = '14px';
      chatStatus.style.letterSpacing = '-1px';
      chatToggle.appendChild(chatStatus);

      const chatStatusStyle = document.createElement('style');
      chatStatusStyle.textContent = `
        #custom-chat-status::before {
          color: ${offYellowColor};
          content: "[";
          margin-right: 4px;
        }
        #custom-chat-status::after {
          color: ${offYellowColor};
          content: "]";
          margin-left: 4px;
        }
      `;
      document.head.appendChild(chatStatusStyle);

      statusBarLeft.appendChild(chatToggle);
      console.log('Added chat toggle');
    }

    const classicStyle = document.createElement('style');
    classicStyle.textContent = `
      @media screen and (max-width: 1100px) {
        #${camListWidgetId}, #${chatToggleId} {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(classicStyle);

    waitForElement(missionWidgetSelector)
      .then((missionWidget) => addCameraListWidget(missionWidget))
      .catch((err) => console.warn('fishtank-userscript:', err.message));

    waitForElement(statusBarSelector)
      .then((statusBar) => addChatToggleClassic(statusBar))
      .catch((err) => console.warn('fishtank-userscript:', err.message));

    const liveStreamObserverCb = (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              node.querySelectorAll(livestreamNameSelector).forEach(descendant => {
                highlightActiveCameraInWidget(descendant.textContent.trim());
              });
            }
          });
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === 1) {
              node.querySelectorAll?.(livestreamNameSelector).forEach(descendant => {
                highlightActiveCameraInWidget(null);
              });
            }
          });
        } else if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent && Array.from(parent.classList).find(c => c.startsWith('live-stream-player_name__'))) {
            highlightActiveCameraInWidget(parent.textContent.trim());
          }
        }
      }
    };

    const liveStreamObserver = new MutationObserver(liveStreamObserverCb);
    liveStreamObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    });

    console.log('fishtank-userscript: initialized for classic site');
  }

  // ======== NEW SITE ========

  // Initializes new site (www.fishtank.live)
  function initNew() {
    // alternate cameras: switch to parent first, then click transition polygon
    // xyRatio is the first X / first Y of the polygon's points (scale-invariant across screen sizes)
    const altCameras = {
      'Bar Alternate': {parent: 'Bar', xyRatio: 9.19},
      'Dorm Alternate': {parent: 'Dorm', xyRatio: 390},
      'Market Alternate': {parent: 'Market', xyRatio: 263},
    };

    const altBtnMarker = 'data-userscript-alt';
    let activeRoom = null;

    // Finds a camera tile button in site's camera grid by matching its room name text
    function findCameraGridButton(roomName) {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.hasAttribute(altBtnMarker)) {
          continue;
        }
        const divs = btn.querySelectorAll('div');
        for (const div of divs) {
          if (div.children.length === 0 && div.textContent.trim() === roomName) {
            return btn;
          }
        }
      }
      return null;
    }

    // Scans DOM for a visible stream overlay and returns the room name of the active camera, or null
    function detectActiveCamera() {
      const fixedOverlays = document.querySelectorAll('div.fixed');
      for (const overlay of fixedOverlays) {
        if (!overlay.querySelector('video, button[class*="close"], button[aria-label*="close" i]')) {
          continue;
        }
        const candidates = overlay.querySelectorAll('div.absolute');
        for (const el of candidates) {
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
            return Math.abs(ratio - altCamera.xyRatio) / altCamera.xyRatio < 0.15;
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
      const offline = parentBtn && (
        parentBtn.classList.contains('opacity-60') || parentBtn.classList.contains('cursor-not-allowed')
      );

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

    // Injects alt camera buttons into the official camera grid, after their parent buttons
    function injectAltButtons() {
      const grid = document.querySelector('.grid.grid-cols-5');
      if (!grid || grid.querySelector(`[${altBtnMarker}]`)) {
        return;
      }

      // build ordered list: for each existing button, append its alt (if any) right after
      const existing = Array.from(grid.children);
      const fragment = document.createDocumentFragment();
      for (const child of existing) {
        fragment.appendChild(child);
        const div = child.querySelector?.('div');
        const name = div?.textContent?.trim();

        // check if this button has an alt camera
        const altName = Object.keys(altCameras).find(k => altCameras[k].parent === name);
        if (altName) {
          fragment.appendChild(createAltGridButton(altName, child));
        }

      }
      grid.replaceChildren(fragment);
      console.log('fishtank-userscript: injected alt camera buttons');
    }

    const TAB_BASE_BTN = 'p-0.5 pb-0 rounded-t-md cursor-pointer select-none ' +
      'transition-[filter,box-shadow,transform] duration-150 ease-spring ' +
      'hover:brightness-105 hover:shadow-sm';
    const TAB_BASE_INNER = 'px-2.5 py-1 rounded-t-sm border-2 border-b-0 leading-none ' +
      'flex items-center justify-center text-light-text';

    const TAB_INACTIVE_BTN = `${TAB_BASE_BTN} z-0 translate-y-[4px] ` +
      'hover:translate-y-0 bg-gradient-to-r from-secondary-500 to-secondary-600/75';
    const TAB_INACTIVE_INNER = `${TAB_BASE_INNER} ` +
      'bg-gradient-to-t from-secondary-400 to-secondary-500 border-light/25';
    const TAB_ACTIVE_BTN = `${TAB_BASE_BTN} outline-2 outline-tertiary z-10 ` +
      'bg-gradient-to-r from-tertiary-500 to-tertiary-600/75';
    const TAB_ACTIVE_INNER = `${TAB_BASE_INNER} ` +
      'bg-gradient-to-t from-tertiary-400 to-tertiary-500 border-light/25';

    // Creates a tab button matching the site's inactive tab style
    function createTabButton(svgHtml, title) {
      const tab = document.createElement('button');
      tab.className = TAB_INACTIVE_BTN;
      tab.title = title;
      const inner = document.createElement('div');
      inner.className = TAB_INACTIVE_INNER;
      inner.innerHTML = svgHtml;
      tab.appendChild(inner);
      return tab;
    }

    function setTabActive(tab, active) {
      tab.className = active ? TAB_ACTIVE_BTN : TAB_INACTIVE_BTN;
      tab.firstElementChild.className = active ? TAB_ACTIVE_INNER : TAB_INACTIVE_INNER;
    }

    // Finds the camera grid section inside the chat panel
    function findCamSection() {
      const grid = document.querySelector('.grid.grid-cols-5');
      return grid?.closest('[class*="shrink-0"]') || grid?.parentElement?.parentElement;
    }

    // ======== MINESWEEPER ========

    let minesweeperEl = null; // persisted DOM element
    let minesweeperActive = false;
    let mineTabRef = null;

    function showMinesweeper() {
      const camSection = findCamSection();
      if (!camSection) {
        return;
      }

      // create minesweeper container once
      if (!minesweeperEl) {
        minesweeperEl = buildMinesweeper();
      }

      // hide camera grid, show minesweeper
      camSection.style.display = 'none';
      if (!minesweeperEl.parentElement) {
        camSection.parentElement.insertBefore(minesweeperEl, camSection);
      }
      minesweeperEl.style.display = '';
      minesweeperActive = true;
      if (mineTabRef) {
        setTabActive(mineTabRef, true);
      }
    }

    function hideMinesweeper() {
      const camSection = findCamSection();
      if (camSection) {
        camSection.style.display = '';
      }
      if (minesweeperEl) {
        minesweeperEl.style.display = 'none';
      }
      minesweeperActive = false;
      if (mineTabRef) {
        setTabActive(mineTabRef, false);
      }
    }

    function toggleMinesweeper() {
      if (minesweeperActive) {
        hideMinesweeper();
      } else {
        showMinesweeper();
      }
    }

    function buildMinesweeper() {
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

      const testMode = false; // true -> place 1 mine in bottom-right corner for easy win testing
      const rows = 16;
      const cols = 16;
      const mineCount = testMode ? 1 : 40;
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
      resetBtn.addEventListener('click', () => initGame());
      resetBtn.addEventListener('mousedown', () => {
        resetBtn.style.borderTop = `2px solid ${borderDark}`;
        resetBtn.style.borderLeft = `2px solid ${borderDark}`;
        resetBtn.style.borderBottom = `2px solid ${borderLight}`;
        resetBtn.style.borderRight = `2px solid ${borderLight}`;
      });
      resetBtn.addEventListener('mouseup', () => {
        resetBtn.style.borderTop = `2px solid ${borderLight}`;
        resetBtn.style.borderLeft = `2px solid ${borderLight}`;
        resetBtn.style.borderBottom = `2px solid ${borderDark}`;
        resetBtn.style.borderRight = `2px solid ${borderDark}`;
      });
      resetBtn.addEventListener('mouseleave', () => {
        resetBtn.style.borderTop = `2px solid ${borderLight}`;
        resetBtn.style.borderLeft = `2px solid ${borderLight}`;
        resetBtn.style.borderBottom = `2px solid ${borderDark}`;
        resetBtn.style.borderRight = `2px solid ${borderDark}`;
      });

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
        if (testMode) {
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
          recordLoss();
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
            recordWin();
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
      clearStatsBtn.textContent = 'Reset';
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

      function recordWin() {
        const s = loadStats();
        s.wins++;
        saveStats(s);
        renderStats();
      }

      function recordLoss() {
        const s = loadStats();
        s.losses++;
        saveStats(s);
        renderStats();
      }

      initGame();
      renderStats();
      return container;
    }

    // Injects custom tab buttons into the chat panel tab bar
    function injectTabs() {
      const tabBar = document.querySelector('div.absolute.bottom-full div.flex.items-end');
      if (!tabBar || tabBar.querySelector('[data-userscript-tab]')) {
        return;
      }

      // minesweeper tab
      const mineSvg = '<svg width="18" height="18" viewBox="0 0 64 64" ' +
        'fill="currentColor" class="drop-shadow-[2px_2px_1px_rgba(0,0,0,0.25)]">' +
        '<circle cx="32" cy="32" r="14"/>' +
        '<rect x="30" y="4" width="4" height="16" rx="2"/>' +
        '<rect x="30" y="44" width="4" height="16" rx="2"/>' +
        '<rect x="4" y="30" width="16" height="4" rx="2"/>' +
        '<rect x="44" y="30" width="16" height="4" rx="2"/>' +
        '<rect x="11" y="9" width="4" height="16" rx="2" transform="rotate(-45 13 17)"/>' +
        '<rect x="43" y="41" width="4" height="16" rx="2" transform="rotate(-45 45 49)"/>' +
        '<rect x="43" y="9" width="4" height="16" rx="2" transform="rotate(45 45 17)"/>' +
        '<rect x="11" y="41" width="4" height="16" rx="2" transform="rotate(45 13 49)"/>' +
        '</svg>';
      const mineTab = createTabButton(mineSvg, 'Minesweeper');
      mineTab.setAttribute('data-userscript-tab', 'minesweeper');
      mineTabRef = mineTab;
      mineTab.addEventListener('click', () => toggleMinesweeper());
      tabBar.appendChild(mineTab);

      // classic site tab
      const classicSvg = '<svg width="18" height="18" viewBox="0 0 24 24" ' +
        'fill="currentColor" class="drop-shadow-[2px_2px_1px_rgba(0,0,0,0.25)]">' +
        '<path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2' +
        'v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
      const classicTab = createTabButton(classicSvg, 'Open classic site');
      classicTab.setAttribute('data-userscript-tab', 'classic');
      classicTab.addEventListener('click', () => window.open('https://classic.fishtank.live/', '_blank'));
      tabBar.appendChild(classicTab);

      // when site tabs are clicked, hide minesweeper and show camera grid
      const siteTabs = tabBar.querySelectorAll('button:not([data-userscript-tab])');
      siteTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          if (minesweeperActive) {
            hideMinesweeper();
          }
        });
      });

      // restore minesweeper state if it was active before React re-render
      if (minesweeperActive) {
        setTabActive(mineTab, true);
        requestAnimationFrame(() => showMinesweeper());
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

    // Wait for official grid to appear, then inject
    waitForElement('.grid.grid-cols-5')
      .then(() => {
        injectAltButtons();
        injectTabs();
        setupObserver();
      })
      .catch(() => {
        console.warn('fishtank-userscript: official camera grid not found, skipping injection');
      });

    console.log('fishtank-userscript: initialized for new site');
  }

  // ======== ENTRY POINT ========

  const hostname = window.location.hostname;
  console.log(`fishtank-userscript: detected site ${hostname}`);

  if (hostname === 'classic.fishtank.live') {
    initClassic();
  } else {
    initNew();
  }

})();
