// ======== ENTRY POINT ========

import { initClassic } from './classic.js';
import { initNew } from './new-site.js';

const hostname = window.location.hostname;
console.log(`fishtank-userscript: detected site ${hostname}`);

if (hostname === 'classic.fishtank.live') {
  initClassic();
} else {
  initNew();
}
