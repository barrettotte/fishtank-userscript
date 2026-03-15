// ==UserScript==
// @name         fishtank-userscript
// @description  UserScript to tweak/add features to fishtank.live (season 5)
// @namespace    http://tampermonkey.net/
// @version      5.0.0
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

  const camSwitchTimeoutMs = 250;

  const offYellowColor = '#f8ec94';
  const midGrayColor = '#aaa';
  const darkGrayColor = '#505050';

  const camListWidgetId = 'cams_cams__custom';
  const chatToggleId = 'custom_chat_toggle';

  // shared sorted room name list used by both sites
  const roomNames = [
    'BKNY', 'BRRR', 'CFSL', 'CODR', 'DMCL', 'DMRM',
    'DNRM', 'FOYR', 'GSRM', 'HWDN', 'HWUP', 'JCKZ',
    'KTCH', 'MRKE',
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
    const leftPanelSelector = "div[class^='layout_left__']";
    const rightPanelSelector = "div[class^='layout_right__']";
    const statusBarSelector = "div[class^='status-bar_status-bar__']";
    const livestreamNameSelector = "[class^='live-stream-player_name__']";
    const missionWidgetSelector = "div[class^='missions_missions__']";
    const adWidgetSelector = "div[class^='ads_ads__']";

    // room name -> camera element ID (classic site only)
    const classicCameraIds = {
      'BKNY': 'bkny-5',
      'BRRR': 'brrr-5',
      'CFSL': 'cfsl-5',
      'CODR': 'codr-5',
      'DMCL': 'dmcl-5',
      'DMRM': 'dmrm-5',
      'DNRM': 'dnrm-5',
      'FOYR': 'foyr-5',
      'GSRM': 'gsrm-5',
      'HWDN': 'hwdn-5',
      'HWUP': 'hwup-5',
      'JCKZ': 'jckz-5',
      'KTCH': 'ktch-5',
      'MRKE': 'mrke-5',
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
          waitForElement(`#${camId}`).then((camEl) => {
            camEl.click();
          })
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

      for (const room of roomNames) {
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
                highlightActiveCameraInWidget(descendant.textContent.trim().toUpperCase());
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
            highlightActiveCameraInWidget(parent.textContent.trim().toUpperCase());
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
    const newCamWidgetId = 'new-cam-list__custom';
    const newCamStyleId = 'new-cam-style__custom';

    const camBtnDefaultBg = 'rgba(255,255,255,0.35)';
    const camBtnDefaultBorder = 'rgba(0,0,0,0.15)';

    // camera grid layout order (must contain the same rooms as roomNames)
    const roomNamesGrid = [
      'DMRM', 'CFSL', 'BKNY', 'FOYR',
      'DMCL', 'GSRM', 'BRRR', 'CODR',
      'KTCH', 'JCKZ', 'DNRM', 'MRKE',
      'HWDN', 'HWUP',
    ];
    let viewMode = 'grid'; // 'list' or 'grid'
    let isCollapsed = false;
    let activeRoom = null;
    let wasTheaterMode = false;

    // Locates chat panel element by matching its fixed positioning and responsive width classes
    function findChatPanel() {
      const candidates = document.querySelectorAll('div.fixed.bottom-0.right-0');
      if (candidates.length === 1) return candidates[0];
      // chat panel has responsive width constraint or z-index
      for (const el of candidates) {
        if (/\blg:w-\[|xl:w-\[|\bz-\d/.test(el.className)) {
          return el;
        }
      }
      // fallback to largest fixed bottom-right panel by child count
      let best = null;
      for (const el of candidates) {
        if (!best || el.children.length > best.children.length) {
          best = el;
        }
      }
      return best;
    }

    // Finds a camera tile button in site's camera grid by matching its room name text
    function findCameraGridButton(roomName) {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        // match any leaf div (no child elements) whose text is exactly the room name
        const divs = btn.querySelectorAll('div');
        for (const div of divs) {
          if (div.children.length === 0 && div.textContent.trim().toUpperCase() === roomName) {
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
        // stream player overlay: contains a video element or a close button
        if (!overlay.querySelector('video, button[class*="close"], button[aria-label*="close" i]')) {
          continue;
        }
        const candidates = overlay.querySelectorAll('div.absolute');
        for (const el of candidates) {
          const text = el.textContent?.trim().toUpperCase();
          if (text && roomNames.includes(text)) {
            return text;
          }
        }
      }
      return null;
    }

    // Updates all camera button styles in the widget to highlight the active room and reset the rest
    function highlightActiveCamera(room) {
      activeRoom = room;

      const widget = document.getElementById(newCamWidgetId);
      if (!widget) {
        return;
      }
      const buttons = widget.querySelectorAll('button[data-room]');
      for (const btn of buttons) {
        const isActive = btn.dataset.room === room;
        btn.style.color = isActive ? 'var(--base-primary, #df4e1e)' : 'black';
        btn.style.fontVariationSettings = isActive ? '"wght" 800' : '"wght" 700';
        btn.style.backgroundColor = isActive ? 'rgba(255,255,255,0.55)' : camBtnDefaultBg;
        btn.style.borderColor = isActive ? 'var(--base-primary, #df4e1e)' : camBtnDefaultBorder;
      }
    }

    // Switches to a camera by simulating a click on the matching tile in the site's camera grid
    function switchCamera(roomName) {
      const gridBtn = findCameraGridButton(roomName);
      if (gridBtn) {
        console.log(`fishtank-userscript: switching to camera ${roomName}`);
        gridBtn.click();
        highlightActiveCamera(roomName);
      } else {
        console.warn(`fishtank-userscript: camera button not found for ${roomName}`);
      }
    }

    // Creates a styled camera button element for the new site widget with hover and click handlers
    function createCamButton(room) {
      const btn = document.createElement('button');
      btn.dataset.room = room;
      btn.textContent = room;
      btn.style.cssText = `
        border: 1px solid ${camBtnDefaultBorder};
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 700;
        font-variation-settings: "wght" 700;
        font-family: inherit;
        color: black;
        background-color: ${camBtnDefaultBg};
        cursor: pointer;
        scroll-snap-align: start;
        transition: background-color 0.1s, border-color 0.1s;
      `;

      btn.addEventListener('click', () => switchCamera(room));
      btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = 'var(--base-tertiary)';
        btn.style.borderColor = 'rgba(0,0,0,0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.room === activeRoom) {
          btn.style.backgroundColor = 'rgba(255,255,255,0.55)';
          btn.style.borderColor = 'var(--base-primary, #df4e1e)';
        } else {
          btn.style.backgroundColor = camBtnDefaultBg;
          btn.style.borderColor = camBtnDefaultBorder;
        }
      });

      return btn;
    }

    // Applies grid layout styles to a button or measurement element
    function applyGridStyles(el) {
      el.style.flex = '0 0 calc(25% - 3px)';
      el.style.textAlign = 'center';
      el.style.padding = '4px 2px';
    }

    let gridHeight = null;

    // Temporarily renders the grid layout to measure its natural height, used to cap the scrollable area
    function measureGridHeight(body) {
      const oldDisplay = body.style.display;
      const oldMaxHeight = body.style.maxHeight;
      body.style.maxHeight = 'none';
      body.replaceChildren();
      body.style.display = 'flex';
      body.style.flexDirection = 'row';
      body.style.flexWrap = 'wrap';
      body.style.gap = '4px';
      for (const room of roomNamesGrid) {
        const el = document.createElement('div');
        el.textContent = room;
        el.style.cssText = `
          border: 1px solid transparent;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
        `;
        applyGridStyles(el);
        body.appendChild(el);
      }
      gridHeight = body.scrollHeight;
      body.replaceChildren();
      body.style.display = oldDisplay;
      body.style.maxHeight = oldMaxHeight;
    }

    // Populates widget body with camera buttons in either list (alphabetical) or grid (site order) layout
    function renderCamButtons(body) {
      body.replaceChildren();

      body.style.maxHeight = gridHeight ? gridHeight + 'px' : 'none';
      body.style.scrollSnapType = 'y proximity';

      if (viewMode === 'list') {
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.flexWrap = 'nowrap';
        body.style.gap = '4px';

        for (const room of roomNames) {
          const btn = createCamButton(room);
          btn.style.width = '100%';
          btn.style.textAlign = 'left';
          body.appendChild(btn);
        }
      } else {
        body.style.display = 'flex';
        body.style.flexDirection = 'row';
        body.style.flexWrap = 'wrap';
        body.style.gap = '4px';

        for (const room of roomNamesGrid) {
          const btn = createCamButton(room);
          applyGridStyles(btn);
          body.appendChild(btn);
        }
      }

      if (activeRoom) {
        highlightActiveCamera(activeRoom);
      }
    }

    // Constructs full camera list widget DOM: header (icon, title, view toggles, collapse) and scrollable body
    function buildWidget() {
      const widget = document.createElement('div');
      widget.id = newCamWidgetId;

      const header = document.createElement('div');
      header.style.cssText = `
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px;
        user-select: none;
      `;

      const titleWrap = document.createElement('div');
      titleWrap.style.cssText = 'display:flex; align-items:center; gap:0.25rem;';

      const camIcon = document.createElement('span');
      camIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
      </svg>`;
      camIcon.style.cssText = 'display:inline-flex; align-items:center; color:var(--base-primary); opacity:0.9; filter:drop-shadow(1px 1px 0 rgba(0,0,0,0.15));';

      const title = document.createElement('span');
      title.textContent = 'Cameras';
      title.style.cssText = '--font-wght:700; font-weight:700; color:var(--base-dark-text, black); letter-spacing:-0.025em; line-height:1.5rem;';

      titleWrap.appendChild(camIcon);
      titleWrap.appendChild(title);

      const controlsWrap = document.createElement('div');
      controlsWrap.style.cssText = 'display:flex; gap:2px; align-items:center;';

      // Creates header icon button matching site's gradient stuff
      function createHeaderBtn(iconHtml, variant) {
        const gradients = {
          primary: {
            outer: 'background-image:linear-gradient(to right in oklab, var(--base-primary-400), color-mix(in oklab, var(--base-primary-500) 90%, transparent));',
            inner: 'background-image:linear-gradient(to top in oklab, var(--base-primary-400), var(--base-primary-500));',
          },
          secondary: {
            outer: 'background-image:linear-gradient(to right in oklab, var(--base-secondary-500), color-mix(in oklab, var(--base-secondary-600) 75%, transparent));',
            inner: 'background-image:linear-gradient(to top in oklab, var(--base-secondary-400), var(--base-secondary-500));',
          },
        };
        const g = gradients[variant];

        const btn = document.createElement('button');
        btn.style.cssText = `
          ${g.outer}
          padding:2px; border:none; border-radius:6px;
          display:inline-flex; align-items:center; justify-content:center;
          cursor:pointer; transition:filter 0.1s;
        `;

        const inner = document.createElement('div');
        inner.innerHTML = iconHtml;
        inner.style.cssText = `
          ${g.inner}
          display:flex; align-items:center; justify-content:center;
          padding:2px;
          border-radius:0.25rem; border:none;
          color:white;
        `;
        btn.appendChild(inner);

        btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.05)'; });
        btn.addEventListener('mouseleave', () => { btn.style.filter = ''; });

        return btn;
      }

      const listSvg = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>`;
      const gridSvg = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>`;
      const minusSvg = `<svg width="1em" height="1em" viewBox="0 0 512 512" fill="none"><path d="M400 256H112" stroke="currentColor" stroke-width="32" stroke-linecap="square" stroke-linejoin="round"/></svg>`;
      const plusSvg = `<svg width="1em" height="1em" viewBox="0 0 512 512" fill="none"><path d="M256 112v288m144-144H112" stroke="currentColor" stroke-width="32" stroke-linecap="square" stroke-linejoin="round"/></svg>`;

      const listBtn = createHeaderBtn(listSvg, 'secondary');
      listBtn.title = 'List view';

      const gridBtn = createHeaderBtn(gridSvg, 'secondary');
      gridBtn.title = 'Grid view';

      const collapseBtn = createHeaderBtn(minusSvg, 'primary');
      collapseBtn.title = 'Collapse';

      // Sets opacity on list/grid toggle buttons to indicate which view mode is active
      function updateToggleStyles() {
        listBtn.style.opacity = viewMode === 'list' ? '1' : '0.6';
        gridBtn.style.opacity = viewMode === 'grid' ? '1' : '0.6';
      }
      updateToggleStyles();

      listBtn.addEventListener('click', () => {
        console.log('fishtank-userscript: switched to list view');
        viewMode = 'list';
        updateToggleStyles();
        renderCamButtons(body);
        requestAnimationFrame(positionWidget);
      });

      gridBtn.addEventListener('click', () => {
        console.log('fishtank-userscript: switched to grid view');
        viewMode = 'grid';
        updateToggleStyles();
        renderCamButtons(body);
        requestAnimationFrame(positionWidget);
      });

      controlsWrap.appendChild(gridBtn);
      controlsWrap.appendChild(listBtn);
      controlsWrap.appendChild(collapseBtn);

      header.appendChild(titleWrap);
      header.appendChild(controlsWrap);

      const body = document.createElement('div');
      body.dataset.camBody = '';
      body.style.cssText = 'padding:2px 4px 0; overflow-y:auto; scroll-snap-type:y proximity;';
      renderCamButtons(body);

      const collapseBtnInner = collapseBtn.querySelector('div');
      collapseBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        console.log(`fishtank-userscript: camera widget ${isCollapsed ? 'collapsed' : 'expanded'}`);
        if (isCollapsed) {
          bodyWrap.style.display = 'none';
          collapseBtnInner.innerHTML = plusSvg;
          collapseBtn.title = 'Expand';
          listBtn.style.display = 'none';
          gridBtn.style.display = 'none';
        } else {
          bodyWrap.style.display = '';
          renderCamButtons(body);
          collapseBtnInner.innerHTML = minusSvg;
          collapseBtn.title = 'Collapse';
          listBtn.style.display = 'inline-flex';
          gridBtn.style.display = 'inline-flex';
        }
        requestAnimationFrame(positionWidget);
      });

      const bodyWrap = document.createElement('div');
      bodyWrap.style.cssText = 'padding-bottom:6px;';
      bodyWrap.appendChild(body);

      widget.appendChild(header);
      widget.appendChild(bodyWrap);

      return widget;
    }

    // Inserts camera widget into the page body and initializes its layout measurements
    function injectWidget() {
      if (document.getElementById(newCamWidgetId)) {
        return;
      }

      const chatPanel = findChatPanel();
      if (!chatPanel) {
        console.warn('fishtank-userscript: chat panel not found, retrying...');
        setTimeout(injectWidget, 1000);
        return;
      }

      const widget = buildWidget();

      // insert inside the z-1 content container so the widget participates in the same
      // stacking context as the chat panel (z-2) and site dropdowns (z-6+).
      // by document-idle, React hydration is complete so appending here is safe.
      const contentContainer = document.querySelector('div.relative.z-1') || document.body;
      contentContainer.appendChild(widget);

      // measure grid height now that widget is in DOM, then re-render with correct max-height
      requestAnimationFrame(() => {
        const body = widget.querySelector('[data-cam-body]');
        if (body) {
          measureGridHeight(body);
          renderCamButtons(body);
          requestAnimationFrame(positionWidget);
        }
      });

      console.log('fishtank-userscript: camera list widget injected');
    }

    const style = document.createElement('style');
    style.id = newCamStyleId;
    style.textContent = `
      #${newCamWidgetId} {
        position: fixed;
        right: 0;
        z-index: 3;
        border-radius: 0.5rem;
        border-top: 2px solid color-mix(in oklab, var(--base-light-300) 75%, transparent);
        border-bottom: 3px solid color-mix(in oklab, var(--base-light-700) 50%, transparent);
        border-left: 2px solid color-mix(in oklab, var(--base-light-300) 75%, transparent);
        border-right: 2px solid color-mix(in oklab, var(--base-light-700) 75%, transparent);
        background-color: var(--base-light);
        background-image: var(--base-texture-panel);
        background-repeat: repeat;
        color: var(--base-dark);
        filter: drop-shadow(2px 2px 0 #00000050);
        box-shadow: 0 6px 8px #00000050;
        width: 100%;
      }
      #${newCamWidgetId} *::-webkit-scrollbar {
        display: none;
      }
      #${newCamWidgetId} * {
        scrollbar-width: none;
      }
      @media (min-width: 1024px) {
        #${newCamWidgetId} { width: 296px; right: 20px; }
      }
      @media (min-width: 1536px) {
        #${newCamWidgetId} { width: 368px; }
      }
      @media (min-width: 1920px) {
        #${newCamWidgetId} { width: 420px; }
      }
      @media (max-width: 1023px) {
        #${newCamWidgetId} { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    // Aligns camera widget with the chat panel. Handles theater mode, collapsed state, and chat visibility
    function positionWidget() {
      const widget = document.getElementById(newCamWidgetId);
      const chatPanel = findChatPanel();
      if (!widget) {
        console.warn('fishtank-userscript: camera widget missing from DOM, re-injecting');
        injectWidget();
        return;
      }
      ensureChatObserver(chatPanel);

      const chatRect = chatPanel?.getBoundingClientRect();
      const chatHasSize = chatRect && chatRect.width > 0;
      const chatVisibleThreshold = 0.8;
      const chatVisible = chatHasSize && chatRect.top < window.innerHeight * chatVisibleThreshold;

      // detect theater mode
      const chatClasses = chatPanel?.className || '';
      const isTheaterMode = activeRoom && (
        chatClasses.includes('pointer-events-none') ||
        chatClasses.includes('translate-x-[18px]')
      );

      if (isTheaterMode && !wasTheaterMode) {
        console.log('fishtank-userscript: theater mode detected, hiding camera widget');
      }
      wasTheaterMode = isTheaterMode;

      // hide widget in theater mode
      if (isTheaterMode) {
        widget.style.display = 'none';
        if (chatPanel) {
          chatPanel.style.removeProperty('padding-top');
        }
        return;
      }
      widget.style.display = '';

      // when both panels collapsed, stack as connected tabs
      const bothCollapsed = isCollapsed && !chatVisible;
      if (bothCollapsed) {
        widget.style.boxShadow = '0 2px 4px #00000030';
        widget.style.borderBottomWidth = '1px';
      } else {
        widget.style.boxShadow = '';
        widget.style.borderBottomWidth = '';
      }

      if (chatVisible) {
        // align widget position and size with chat panel
        widget.style.top = chatRect.top + 'px';
        widget.style.bottom = '';
        widget.style.width = chatRect.width + 'px';
        widget.style.left = chatRect.left + 'px';
        widget.style.right = 'auto';

        // push chat content down to make room for the widget
        const widgetHeight = widget.getBoundingClientRect().height;
        const gap = 8;
        chatPanel.style.setProperty('padding-top', (widgetHeight + gap) + 'px', 'important');
      } else {
        // chat minimized or hidden. position directly above the chat bar, match chat width
        widget.style.top = '';
        widget.style.width = chatHasSize ? chatRect.width + 'px' : '';
        widget.style.left = chatHasSize ? chatRect.left + 'px' : '';
        widget.style.right = chatHasSize ? 'auto' : '';
        const chatBottom = chatHasSize ? (window.innerHeight - chatRect.top + 2) : 24;
        widget.style.bottom = chatBottom + 'px';

        if (chatPanel) {
          chatPanel.style.removeProperty('padding-top');
        }
      }
    }

    // Watches for DOM changes to detect when the active camera stream changes and updates highlighting
    function setupCameraObserver() {
      let detectTimeout = null;
      const observer = new MutationObserver(() => {
        if (detectTimeout) return;
        detectTimeout = setTimeout(() => {
          detectTimeout = null;
          const detected = detectActiveCamera();
          if (detected !== activeRoom) {
            console.log(`fishtank-userscript: active camera changed ${activeRoom || 'none'} -> ${detected || 'none'}`);
            highlightActiveCamera(detected);
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

    // Tracks current chat panel element for observer attachment
    let observedChatPanel = null;
    let chatObserver = null;

    // Attaches (or re-attaches) mutation observer to the current chat panel element
    function ensureChatObserver(chatPanel) {
      if (!chatPanel || chatPanel === observedChatPanel) {
        return;
      }
      if (chatObserver) {
        chatObserver.disconnect();
      }

      observedChatPanel = chatPanel;
      chatObserver = new MutationObserver(() => {
        requestAnimationFrame(positionWidget);
      });
      chatObserver.observe(chatPanel, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
      if (chatPanel.parentElement) {
        chatObserver.observe(chatPanel.parentElement, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          childList: true,
        });
      }
    }

    // Polls for chat panel, then injects the widget and sets up mutation observers for repositioning
    function waitAndInject() {
      const chatPanel = findChatPanel();
      if (chatPanel) {
        injectWidget();
        setTimeout(positionWidget, 100);
        window.addEventListener('resize', positionWidget);

        ensureChatObserver(chatPanel);

        // observe DOM changes that may affect widget positioning (subtree catches chat panel replacements)
        let positionRaf = null;
        const bodyObserver = new MutationObserver(() => {
          if (!positionRaf) {
            positionRaf = requestAnimationFrame(() => {
              positionRaf = null;
              positionWidget();
            });
          }
        });
        bodyObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class'],
        });
        bodyObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['style', 'class'],
        });
      } else {
        console.log('fishtank-userscript: chat panel not found yet, retrying in 500ms...');
        setTimeout(waitAndInject, 500);
      }
    }

    waitAndInject();
    setupCameraObserver();

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
