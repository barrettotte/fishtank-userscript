// ==UserScript==
// @name         fishtank-userscript
// @description  UserScript to tweak/add features to fishtank.live
// @namespace    http://tampermonkey.net/
// @version      4.0.0
// @author       barrettotte
// @match        *://*.fishtank.live/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

const leftPanelSelector = "div[class^='layout_left__']";
const missionWidgetSelector = "div[class^='missions_missions__']";
const adWidgetSelector = "div[class^='ads_ads__']";
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
  'BEDROOM 1': '#camera-1-4',
  'BEDROOM 2': '#camera-2-4',
  'BEDROOM 3': '#camera-3-4',
  'BEDROOM 4': '#camera-4-4',
  'HALLWAY UPSTAIRS': '#camera-5-4',
  'HALLWAY DOWNSTAIRS': '#camera-6-4',
  'LIVING ROOM': '#camera-7-4',
  'LIVING ROOM PTZ': '#camera-8-4',
  'KITCHEN': '#camera-9-4',
  'LAUNDRY ROOM': '#camera-10-4',
  'GARAGE': '#camera-11-4',
  'CONFESSIONAL': '#camera-12-4',
  'DIRECTOR': '#camera-13-4',
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
    for (const selector of closeBtnSelectors) {
      const closeBtn = document.querySelector(selector);
      if (closeBtn !== null) {
        closeBtn.click();
        break; // found one, we should be at main screen now
      }
    }
  }

  // create camera button with events and styling
  function createCameraButton(room, camId) {
    const camBtn = document.createElement('btn');
    camBtn.textContent = room;

    camBtn.style.border = '1px solid #505050';
    camBtn.style.fontSize = '12px';
    camBtn.style.paddingTop = '5px';
    camBtn.style.paddingBottom = '5px';
    camBtn.style.paddingLeft = '3px';
    camBtn.style.paddingRight = '3px';

    camBtn.onclick = () => {
      pressCloseButton();
      setTimeout(() => waitForElement(camId).then((camEl) => camEl.click()), 125);
    };
    camBtn.onmouseover = () => {
      camBtn.style.backgroundColor = '#2b2d2e';
      camBtn.style.cursor = 'pointer';
      camBtn.style.border = '1px solid #FFFFFF';
    };
    camBtn.onmouseout = () => {
      camBtn.style.backgroundColor = '#191D21';
      camBtn.style.cursor = 'default';
      camBtn.style.border = '1px solid #505050';
    };

    return camBtn;
  }

  // handle collapsing/uncollapsing widget when clicking on widget header
  function collapseCameraListWidget(header) {
    if (header !== null) {
      const container = header.parentElement;
      const body = header.nextElementSibling;
      const icon = header.children[0].children[0];
      const doCollapse = icon.style.transform === 'scaleY(-1)';

      if (doCollapse) {
        container.style.borderBottom = '0';
        body.style.display = 'none';
        icon.style.transform = 'scaleY(1)';
      } else {
        container.style.border = '1px solid #505050';
        body.style.display = 'flex';
        icon.style.transform = 'scaleY(-1)';
      }
    }
  }

  // add quick select camera widget above the ads widget
  function addCameraListWidget() {
    const leftPanel = document.querySelector(leftPanelSelector);

    // use mission as the reference to get existing widget styling
    const missionWidget = leftPanel.querySelector(missionWidgetSelector);
    if (!missionWidget) {
      console.error(`Mission widget was not found. Cannot add camera list widget`);
      return;
    }

    // root widget
    const cameraWidget = document.createElement('div');
    cameraWidget.id = 'cams_cams__custom';

    // widget.container
    const container = document.createElement('div');
    for (const c of missionWidget.children[0]?.classList) {
      // copy classes from mission container, except collapse styling
      if (!c.startsWith('panel_collapsed')) {
        container.classList.add(c);
      }
    }
    cameraWidget.appendChild(container);
    
    // widget.container.header
    const header = document.createElement('div');
    header.classList.add(...missionWidget.children[0].children[0].classList); // copy classes from mission header
    header.addEventListener('click', (event) => collapseCameraListWidget(event.currentTarget));
    container.appendChild(header);

    // widget.container.header.collapse
    const svgColor = '#f8ec94';
    const headerCollapse = document.createElement('div');
    headerCollapse.style.display = 'flex';
    headerCollapse.style.marginLeft = '-4px';
    headerCollapse.style.marginRight = '4px';
    headerCollapse.style.color = svgColor;
    headerCollapse.style.filter = 'drop-shadow(2px 3px 0 #000000)';
    header.appendChild(headerCollapse);

    // widget.container.header.collapse.icon
    const headerCollapseIcon = document.createElement('div');
    headerCollapseIcon.style.display = 'inline-flex';
    headerCollapseIcon.style.alignItems = 'center';
    headerCollapseIcon.style.justifyContent = 'center';
    headerCollapseIcon.style.color = svgColor;
    headerCollapseIcon.style.transform = 'scaleY(-1)'; // start uncollapsed
    headerCollapseIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M19 8H5V10H7V12H9V14H11V16H13V14H15V12H17V10H19V8Z" fill="${svgColor}"></path>
      </svg>
    `;
    headerCollapse.appendChild(headerCollapseIcon);

    // widget.container.header.title
    const headerTitle = document.createElement('div');
    headerTitle.style.color = '#fff';
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
    if (leftPanel !== null) {
      leftPanel.insertBefore(cameraWidget, leftPanel.querySelector(adWidgetSelector));
    }

    console.log('Added camera list widget');
  }

  // wait for mission widget since we copy some classes from it
  waitForElement(missionWidgetSelector).then(() => addCameraListWidget());

})();
