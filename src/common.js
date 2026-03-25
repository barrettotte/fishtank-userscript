// sorted room name list (must match site's displayed names)
export const roomNames = [
  'Bar', 'Bar Alternate', 'Bar PTZ', 'Cameraman', 'Closet',
  'Computer Lab', 'Confessional', 'Corridor', 'Dining Room',
  'Director Mode', 'Dorm', 'Dorm Alternate', 'East Wing',
  'Foyer', 'Glassroom', 'Hallway', 'Jacuzzi', 'Job Board', 'Jungle Room',
  'Kitchen', 'Market', 'Market Alternate', 'West Wing',
];

// Returns promise that resolves when element matching selector appears in DOM
export function waitForElement(selector, timeoutMs = 30000) {
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
