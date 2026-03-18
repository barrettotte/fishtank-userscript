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
      btn.className = offline
        ? 'p-[2px] select-none group hover:brightness-105 hover:outline-1 hover:outline-tertiary cursor-not-allowed opacity-60 bg-gradient-to-b from-dark-400/75 to-dark-500/75'
        : 'p-[2px] select-none group hover:brightness-105 hover:outline-1 hover:outline-tertiary cursor-pointer bg-gradient-to-b from-dark-400/75 to-dark-500/75';

      const inner = document.createElement('div');
      inner.className = offline
        ? 'px-[1px] py-0.5 text-[11px] 3xl:text-xs font-medium tracking-tighter 3xl:tracking-normal whitespace-nowrap overflow-hidden text-ellipsis text-center border leading-tight group-hover:!text-link text-light-text/30 bg-gradient-to-t from-dark-300 to-dark-400 border-light/25'
        : 'px-[1px] py-0.5 text-[11px] 3xl:text-xs font-medium tracking-tighter 3xl:tracking-normal whitespace-nowrap overflow-hidden text-ellipsis text-center border leading-tight group-hover:!text-link text-light-text bg-gradient-to-t from-dark-300 to-dark-400 text-shadow-md border-light/25';
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

    // Injects a classic site tab button into the chat panel tab bar
    function injectClassicTab() {
      const tabBar = document.querySelector('div.absolute.bottom-full div.flex.items-end');
      if (!tabBar || tabBar.querySelector('[data-userscript-classic]')) {
        return;
      }
      const tab = document.createElement('button');
      tab.setAttribute('data-userscript-classic', '');
      tab.className = 'p-0.5 pb-0 rounded-t-md cursor-pointer select-none transition-[filter,box-shadow,transform] duration-150 ease-spring hover:brightness-105 hover:shadow-sm z-0 translate-y-[4px] hover:translate-y-0 bg-gradient-to-r from-secondary-500 to-secondary-600/75';
      tab.title = 'Open classic site';
      const inner = document.createElement('div');
      inner.className = 'px-2.5 py-1 rounded-t-sm border-2 border-b-0 leading-none flex items-center justify-center text-light-text bg-gradient-to-t from-secondary-400 to-secondary-500 border-light/25';
      inner.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="drop-shadow-[2px_2px_1px_rgba(0,0,0,0.25)]"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
      tab.appendChild(inner);
      tab.addEventListener('click', () => window.open('https://classic.fishtank.live/', '_blank'));
      tabBar.appendChild(tab);
      console.log('fishtank-userscript: injected classic site tab');
    }

    // Watches for DOM changes to detect active camera and re-inject buttons if React re-renders
    function setupObserver() {
      let detectTimeout = null;
      const observer = new MutationObserver(() => {
        // re-inject if React re-rendered the grid
        injectAltButtons();
        injectClassicTab();

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
        injectClassicTab();
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
