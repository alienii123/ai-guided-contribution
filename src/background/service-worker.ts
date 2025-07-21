// Background service worker for AI Guided First Contribution extension

class BackgroundService {
  constructor() {
    console.log('AI Contribution Guide background service initialized');
  }

  public updateApiKey(apiKey: string): void {
    console.log('API key updated in background service');
    // API key is managed in popup and stored in chrome.storage.local
  }
}

const backgroundService = new BackgroundService();

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Guided First Contribution extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'update-api-key') {
    backgroundService.updateApiKey(request.apiKey);
    sendResponse({ success: true });
    return;
  }

  if (request.action === 'get-current-tab') {
    // Help popup get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({ 
          success: true, 
          data: {
            url: tabs[0].url,
            title: tabs[0].title
          }
        });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Indicates we will send a response asynchronously
  }

  sendResponse({ success: false, error: 'Unknown action' });
});