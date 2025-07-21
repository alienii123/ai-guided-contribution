// GitHub page enhancer for AI Guided First Contribution extension

class GitHubEnhancer {
  private currentRepoUrl: string;

  constructor() {
    this.currentRepoUrl = window.location.href;
    this.init();
  }

  private async init(): Promise<void> {
    if (this.isIssuesPage()) {
      await this.enhanceIssuesPage();
    }
  }

  private isIssuesPage(): boolean {
    return window.location.pathname.includes('/issues');
  }

  private async enhanceIssuesPage(): Promise<void> {
    // Add AI-powered tab to issues page
    const issuesNav = document.querySelector('.issues-listing .subnav');
    if (issuesNav) {
      const aiTab = this.createAITab();
      issuesNav.appendChild(aiTab);
    }
  }

  private createAITab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'subnav-item ai-guidance-tab';
    tab.innerHTML = `
      <span class="ai-icon">🤖</span>
      <span>AI Guidance</span>
    `;
    
    tab.addEventListener('click', () => {
      this.showAIGuidancePanel();
    });

    return tab;
  }

  private showAIGuidancePanel(): void {
    // Create and show AI guidance overlay
    const overlay = document.createElement('div');
    overlay.className = 'ai-guidance-overlay';
    overlay.innerHTML = `
      <div class="ai-guidance-panel">
        <h2>🤖 AI Contribution Guide</h2>
        <div class="guidance-steps">
          <div class="step">✅ Extension Active</div>
          <div class="step">🔍 Click the extension icon to find good first issues</div>
          <div class="step">🚀 Start Contributing!</div>
        </div>
        <button class="close-guidance">Close</button>
      </div>
    `;

    overlay.querySelector('.close-guidance')?.addEventListener('click', () => {
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GitHubEnhancer());
} else {
  new GitHubEnhancer();
}