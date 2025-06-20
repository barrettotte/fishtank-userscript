// ==UserScript==
// @name         fishtank-userscript
// @description  UserScript to tweak/add features to fishtank.live
// @namespace    http://tampermonkey.net/
// @version      4.0.4
// @author       barrettotte
// @match        *://*.fishtank.live/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

const camSwitchTimeoutMs = 250;

const offYellowColor = '#f8ec94';
const midGrayColor = '#aaa';
const darkGrayColor = '#505050';

const camListWidgetId = 'cams_cams__custom';

const leftPanelSelector = "div[class^='layout_left__']";
const rightPanelSelector = "div[class^='layout_right__']";
const statusBarSelector = "div[class^='status-bar_status-bar__']";
const stoxWidgetSelector = "div[class^='stocks-panel_stocks-panel__']";

const missionWidgetSelector = "div[class^='missions_missions__']";
const adWidgetSelector = "div[class^='ads_ads__']";
const livestreamNameSelector = "[class^='live-stream-player_name__']";

const closeBtnSelectors = [
  "button[class^='live-stream-player_close__']",  // active stream
  "button[class^='close-button_close-button__']", // about, contestants, clans, leaderboard, 
  "button[class^='clips_close__']",               // clips
  "button[class^='episodes_close__']",            // episodes
  "button[class^='games_close__']",               // games
  "button[class^='stocks_close__']",              // stox
];

// room name: camera ID
const cameraList = {
  'BEDROOM 1': 'camera-1-4',
  'BEDROOM 2': 'camera-2-4',
  'BEDROOM 3': 'camera-3-4',
  'BEDROOM 4': 'camera-4-4',
  'HALLWAY UPSTAIRS': 'camera-5-4',
  'HALLWAY DOWNSTAIRS': 'camera-6-4',
  'LIVING ROOM': 'camera-7-4',
  'LIVING ROOM PTZ': 'camera-8-4',
  'KITCHEN': 'camera-9-4',
  'LAUNDRY ROOM': 'camera-10-4',
  'GARAGE': 'camera-11-4',
  'CONFESSIONAL': 'camera-12-4',
  'DIRECTOR': 'camera-13-4',
};

// stox: constent name
const stoxToContestant = {
  'ANGL': 'Angelina',
  'ARYE': 'Aryeh',
  'DANL': 'Daniel',
  'DRNC': 'Direnç',
  'ELLI': 'Ellie',
  'FRDY': 'Freddy',
  'JIN': 'Jin',
  'RCHL': 'Rachel',
  'SETH': 'Seth',
};

(() => {

  // wait for given element to be available in document
  function waitForElement(selector) {
    return new Promise(resolve => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }
      const observer = new MutationObserver(mutations => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });
      observer.observe(document.body, {childList: true, subtree: true});
    });
  }

  // if close button available, trigger close event
  function pressCloseButton() {
    const closeBtn = closeBtnSelectors.map(selector => document.querySelector(selector)).find(btn => btn);
    if (closeBtn) {
      closeBtn.click();
    }
  }

    // set text color for active camera in camera list widget
  function highlightActiveCameraInWidget(room) {
    const camListButtons = document.querySelectorAll(`#${camListWidgetId} > div > div:nth-child(2) > btn`);
    for (const btn of camListButtons) {
      btn.style.color = (btn.textContent === room) ? offYellowColor : midGrayColor;
    }
  }

  // create camera button with events and styling
  function createCameraButton(room, camId) {
    const camBtn = document.createElement('btn');
    camBtn.textContent = room;

    camBtn.style.border = `1px solid ${darkGrayColor}`;
    camBtn.style.fontSize = '12px';
    camBtn.style.paddingTop = '5px';
    camBtn.style.paddingBottom = '5px';
    camBtn.style.paddingLeft = '3px';
    camBtn.style.paddingRight = '3px';

    camBtn.onclick = () => {
      pressCloseButton();
      setTimeout(() => {
        waitForElement(`#${camId}`).then((camEl) => {
          camEl.click();
        })
      }, camSwitchTimeoutMs);
    };
    camBtn.onmouseover = () => {
      camBtn.style.backgroundColor = '#2b2d2e';
      camBtn.style.cursor = 'pointer';
      camBtn.style.border = '1px solid white';
    };
    camBtn.onmouseout = () => {
      camBtn.style.backgroundColor = '#191D21';
      camBtn.style.cursor = 'default';
      camBtn.style.border = `1px solid ${darkGrayColor}`;
    };

    return camBtn;
  }

  // handle collapsing/uncollapsing widget when clicking on widget header
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

  // add quick select camera widget above the ads widget
  function addCameraListWidget() {
    const leftPanel = document.querySelector(leftPanelSelector);
    if (!leftPanel) {
      console.error('Failed to add camera list widget. Missing left panel reference.');
      return;
    }

    // where we'll insert the widget above
    const adsWidget = leftPanel.querySelector(adWidgetSelector)
    if (!adsWidget) {
      console.error('Failed to add camera list widget. Missing ads widget reference.');
      return;
    }

    // use mission as the reference to get existing widget styling
    const missionWidget = leftPanel.querySelector(missionWidgetSelector);
    if (!missionWidget) {
      console.error(`Mission widget was not found. Cannot add camera list widget`);
      return;
    }

    // root widget
    const cameraWidget = document.createElement('div');
    cameraWidget.id = camListWidgetId;

    // widget.container
    const container = document.createElement('div');
    const sourceClasses = missionWidget.children[0]?.classList ?? [];
    container.classList.add(...Array.from(sourceClasses).filter(c => !c.startsWith('panel_collapsed'))); // skip collapse styling
    cameraWidget.appendChild(container);
    
    // widget.container.header
    const header = document.createElement('div');
    header.classList.add(...missionWidget.children[0].children[0].classList); // copy classes from mission header
    header.addEventListener('click', (event) => collapseCameraListWidget(event.currentTarget));
    container.appendChild(header);

    // widget.container.header.collapse
    const headerCollapse = document.createElement('div');
    headerCollapse.style.display = 'flex';
    headerCollapse.style.marginLeft = '-4px';
    headerCollapse.style.marginRight = '4px';
    headerCollapse.style.color = offYellowColor;
    headerCollapse.style.filter = 'drop-shadow(2px 3px 0 #000000)';
    header.appendChild(headerCollapse);

    // widget.container.header.collapse.icon
    const headerCollapseIcon = document.createElement('div');
    headerCollapseIcon.style.display = 'inline-flex';
    headerCollapseIcon.style.alignItems = 'center';
    headerCollapseIcon.style.justifyContent = 'center';
    headerCollapseIcon.style.color = offYellowColor;
    headerCollapseIcon.style.transform = 'scaleY(-1)'; // start uncollapsed
    headerCollapseIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M19 8H5V10H7V12H9V14H11V16H13V14H15V12H17V10H19V8Z" fill="${offYellowColor}"></path>
      </svg>
    `;
    headerCollapse.appendChild(headerCollapseIcon);

    // widget.container.header.title
    const headerTitle = document.createElement('div');
    headerTitle.style.color = 'white';
    headerTitle.style.fontWeight = '600';
    headerTitle.textContent = 'Cameras';
    header.appendChild(headerTitle);

    // widget.container.body
    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.gap = '4px';
    body.style.height = '100%';
    body.style.padding = '8px';

    // build list of cameras
    for (const [room, camId] of Object.entries(cameraList).sort(([a], [b]) => a.localeCompare(b))) {
      body.appendChild(createCameraButton(room, camId));
    }
    container.appendChild(body);

    // add cams widget above ads widget
    leftPanel.insertBefore(cameraWidget, adsWidget);

    console.log('Added camera list widget');
  }

  function addChatToggle() {
    const statusBar = document.querySelector(statusBarSelector);
    if (!statusBar) {
      console.error('Failed to add chat toggle. Missing status bar reference.');
      return;
    }

    const statusBarLeft = statusBar.children[0];
    if (!statusBarLeft) {
      console.error('Failed to add chat toggle. Missing status bar left reference.');
      return;
    }

    // use existing TTS status button as reference
    const ttsButton = statusBarLeft.children[0];
    if (!ttsButton) {
      console.error('Failed to add chat toggle. Missing TTS status reference.');
      return;
    }
    
    // root button
    const chatToggle = document.createElement('button');
    chatToggle.classList.add(...Array.from(ttsButton.classList).filter(c => !c.startsWith('status-bar_enabled__'))); // skip enabled/disabled style

    // add toggle for chat
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
      if (rightPanel.style.display === 'none') {
        rightPanel.style.display = 'flex';
        status.textContent = 'On';
      } else {
        rightPanel.style.display = 'none';
        status.textContent = 'Off';
      }
      status.style.color = 'white';
    });

    // button.label
    const chatLabel = document.createElement('div');
    chatLabel.textContent = 'CHAT';
    chatLabel.style.color = 'white';
    chatLabel.style.letterSpacing = '-1.5px';
    chatLabel.style.textTransform = 'uppercase';
    chatLabel.style.fontWeight = '500';
    chatToggle.appendChild(chatLabel);

    // button.status
    const chatStatus = document.createElement('div');
    chatStatus.id = 'custom-chat-status';
    chatStatus.textContent = 'On';
    chatStatus.style.color = 'white';
    chatStatus.style.whiteSpace = 'nowrap';
    chatStatus.style.textTransform = 'uppercase';
    chatStatus.style.fontSize = '14px';
    chatStatus.style.letterSpacing = '-1px';
    chatToggle.appendChild(chatStatus);

    // button.status styling
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

    // add chat toggle to right of TOYS button
    statusBarLeft.appendChild(chatToggle);

    console.log('Added chat toggle');
  }

  function addStoxHover() {
    const stoxWidget = document.querySelector(stoxWidgetSelector);
    if (!stoxWidget) {
      console.error('Failed to add stox hover. Missing stox widget reference.');
      return;
    }

    for (const stoxEl of stoxWidget.querySelectorAll('button')) {
      const stoxName = stoxEl.querySelector('div:nth-child(2)')?.textContent;
      if (stoxName && stoxName.trim() in stoxToContestant) {
        stoxEl.title = stoxToContestant[stoxName];
      }
    }

    console.log('Added stox hover titles');
  }

  // =================================================================================

  // wait for mission widget since we copy some classes from it
  waitForElement(missionWidgetSelector).then(() => addCameraListWidget());

  // add chat toggle
  waitForElement(rightPanelSelector).then(() => {
    waitForElement(statusBarSelector).then(() => addChatToggle());
  });

  // add titles to stox buttons to show full contestant name on hover
  waitForElement(stoxWidgetSelector).then(() => addStoxHover());

  // observe when live stream name is added or changed
  const liveStreamObserverCb = (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // update cam list when clicking into a camera grid
            node.querySelectorAll(livestreamNameSelector).forEach(descendant => {
              highlightActiveCameraInWidget(descendant.textContent.trim().toUpperCase());
            });
          }
        });
        mutation.removedNodes.forEach(node => {
          // update cam list when exiting out (close button or escape key)
          if (node.nodeType === 1) {
            node.querySelectorAll?.(livestreamNameSelector).forEach(descendant => {
              highlightActiveCameraInWidget(null);
            });
          }
        });
      } else if (mutation.type === 'characterData') {
        // update cam list when switching cams (camListWidget, arrow buttons, arrow keys, clickable areas on stream)
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

})();
