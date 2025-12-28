/**
 * Chrome Extension Integration Service
 * Handles communication with Chrome extension for voice-to-text
 */

// Listen for messages from Chrome extension
export function setupChromeExtensionListener(
  onTextReceived: (text: string) => void
): () => void {
  const messageHandler = (event: MessageEvent) => {
    // Listen for messages from Chrome extension
    if (event.data && event.data.type === 'VOICE_TO_TEXT') {
      const text = event.data.text;
      if (text && typeof text === 'string') {
        onTextReceived(text);
      }
    }
  };

  window.addEventListener('message', messageHandler);

  // Return cleanup function
  return () => {
    window.removeEventListener('message', messageHandler);
  };
}

/**
 * Request text from Chrome extension
 */
export function requestTextFromExtension(): void {
  // Send message to Chrome extension
  window.postMessage(
    {
      type: 'REQUEST_VOICE_TEXT',
      source: 'voice-audit-app',
    },
    window.location.origin
  );
}

/**
 * Check if Chrome extension is available
 */
export function isChromeExtensionAvailable(): boolean {
  // Check if extension context is available
  // This is a simple check - you may need to adjust based on your extension
  return typeof window !== 'undefined' && 
         (window as any).chrome?.runtime !== undefined;
}

/**
 * Initialize Chrome extension integration
 */
export function initChromeExtension(
  onTextReceived: (text: string) => void
): () => void {
  if (!isChromeExtensionAvailable()) {
    console.warn('Chrome extension not detected');
    return () => {}; // Return no-op cleanup
  }

  console.log('✅ Chrome extension detected');
  return setupChromeExtensionListener(onTextReceived);
}


