# fishtank-userscripts

UserScript to tweak/add features to [fishtank.live](https://www.fishtank.live/)

## Features (Season 4)

### Camera List Widget

Adds new camera widget to left panel above the ads widget.

Active camera highlight uses an observer to react when live stream name is changed. 
So, it should work on any camera transition (camera widget, arrow buttons, arrow keys, clickable stream areas)

On small screens (< 1100px) this widget will be hidden.

![docs/fishtank-s4-cams.png](docs/fishtank-s4-cams.png)

### Chat Toggle Button

Adds chat toggle to the right of the TOYS status.

This toggles the right panel to `display: none` and allows theater mode without chat.

On small screens (< 1100px) the chat toggle button will be hidden.

![docs/fishtank-s4-chat-toggle.png](docs/fishtank-s4-chat-toggle.png)

### Contestant Name Hover on STOX

Adds contestant name to STOX hover. I added this because I kept forgetting how to spell some contestant's names. 

If new contestants/STOX are added the `stoxToContestant` struct will need to be updated. I couldn't figure out how to dynamically fetch these.

![docs/fishtank-s4-stox-hover.png](docs/fishtank-s4-stox-hover.png)

## Setup

Install [Tampermonkey](https://github.com/Tampermonkey/tampermonkey) or equivalent userscript manager as a browser extension

Either copy/paste `main.js` or use remote source `https://raw.githubusercontent.com/barrettotte/fishtank-userscript/refs/heads/master/main.js`
