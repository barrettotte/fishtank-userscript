// ======== CLASSIC SITE ========

import { waitForElement } from './common.js';

// Initializes classic site (classic.fishtank.live)
export function initClassic() {
  const camSwitchTimeoutMs = 250;
  const offYellowColor = '#f8ec94';
  const midGrayColor = '#aaa';
  const darkGrayColor = '#505050';
  const darkBgColor = '#191D21';
  const hoverBgColor = '#2b2d2e';
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
    "Computer Lab": "bbcl-5",
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
    "Job Board": "jobb-5",
    "Jungle Room": "br4j-5",
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

    camBtn.style.backgroundColor = darkBgColor;
    camBtn.style.color = midGrayColor;
    camBtn.style.border = `1px solid ${darkGrayColor}`;
    camBtn.style.fontSize = '12px';
    camBtn.style.padding = '5px 3px';
    camBtn.style.cursor = 'pointer';

    camBtn.addEventListener('click', () => {
      console.log(`fishtank-userscript: switching to camera ${room} (${camId})`);
      pressCloseButton();
      setTimeout(() => {
        waitForElement(`#${camId}`)
          .then((camEl) => camEl.click())
          .catch((err) => console.warn('fishtank-userscript:', err.message));
      }, camSwitchTimeoutMs);
    });
    camBtn.addEventListener('mouseenter', () => {
      camBtn.style.backgroundColor = hoverBgColor;
      camBtn.style.border = '1px solid white';
    });
    camBtn.addEventListener('mouseleave', () => {
      camBtn.style.backgroundColor = darkBgColor;
      camBtn.style.border = `1px solid ${darkGrayColor}`;
    });

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

    const adsWidget = leftPanel.querySelector(adWidgetSelector);
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
            node.querySelectorAll?.(livestreamNameSelector).forEach(_descendant => {
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
