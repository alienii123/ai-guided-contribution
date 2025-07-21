console.log('Popup script loaded');

// Import GitHub service
// Note: In the actual implementation, we'll need to load this differently for Chrome extension

// State management
let isApiKeyValid = false;
let githubService = null;

// Initialize GitHub service
function initializeGitHubService() {
  // We'll create the service inline since we can't use ES6 imports in content scripts
  githubService = {
    baseUrl: 'https://api.github.com',
    
    getCurrentRepo() {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const url = tabs[0]?.url || '';
          const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (match) {
            resolve({
              owner: match[1],
              repo: match[2],
              url: url
            });
          } else {
            resolve(null);
          }
        });
      });
    },

    async fetchGoodFirstIssues(owner, repo, page = 1, perPage = 10) {
      const labels = ['good first issue', 'good-first-issue', 'beginner', 'easy', 'starter'];
      const labelQuery = labels.map(label => `label:"${label}"`).join(' OR ');
      
      const query = `repo:${owner}/${repo} is:issue is:open (${labelQuery})`;
      const url = `${this.baseUrl}/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&page=${page}&per_page=${perPage}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'GitHub API error');
      }

      return {
        issues: data.items || [],
        totalCount: data.total_count || 0
      };
    },

    async fetchPopularReposWithGoodFirstIssues(language = '', page = 1, perPage = 5) {
      const languageQuery = language ? `language:${language}` : '';
      const query = `${languageQuery} label:"good first issue" is:issue is:open`.trim();
      const url = `${this.baseUrl}/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&page=${page}&per_page=${perPage * 2}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'GitHub API error');
      }

      // Group issues by repository
      const repoMap = new Map();
      (data.items || []).forEach(issue => {
        const repoKey = `${issue.repository_url}`;
        const parts = issue.repository_url.split('/');
        const owner = parts[parts.length - 2];
        const repo = parts[parts.length - 1];
        
        if (!repoMap.has(repoKey)) {
          repoMap.set(repoKey, {
            owner,
            repo,
            issues: [],
            language: '',
            stars: 0
          });
        }
        repoMap.get(repoKey).issues.push(issue);
      });

      return {
        repositories: Array.from(repoMap.values()).slice(0, perPage),
        totalCount: data.total_count || 0
      };
    },

    analyzeIssueDifficulty(issue) {
      let difficulty = 'Medium';
      let score = 50;

      const labels = issue.labels.map(label => label.name.toLowerCase());
      
      if (labels.some(label => 
        label.includes('easy') || 
        label.includes('beginner') || 
        label.includes('good first issue') ||
        label.includes('starter')
      )) {
        score -= 20;
      }

      if (labels.some(label => 
        label.includes('hard') || 
        label.includes('complex') || 
        label.includes('advanced')
      )) {
        score += 30;
      }

      const bodyLength = issue.body ? issue.body.length : 0;
      if (bodyLength < 200) score -= 10;
      if (bodyLength > 1000) score += 15;

      if (issue.body && issue.body.includes('```')) {
        score += 10;
      }

      if (issue.comments > 10) score += 10;
      if (issue.comments < 3) score -= 5;

      if (score < 30) difficulty = 'Easy';
      else if (score < 60) difficulty = 'Medium';
      else difficulty = 'Hard';

      return {
        difficulty,
        score,
        estimatedHours: score < 30 ? '1-3h' : score < 60 ? '3-8h' : '8+ hours'
      };
    }
  };
}

// Validate API key format
function validateApiKey(key) {
  const isValid = key && (key.startsWith('sk-proj-') || key.startsWith('sk-')) && key.length > 20;
  console.log('Validating API key:', key ? 'provided' : 'empty', 'Valid:', isValid);
  return isValid;
}

// Update UI based on API key status
function updateUI(hasValidKey) {
  console.log('Updating UI, hasValidKey:', hasValidKey);
  isApiKeyValid = hasValidKey;
  const buttons = ['analyzeBtn', 'findIssuesBtn', 'getGuidanceBtn'];
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !hasValidKey;
    }
  });

  const keyStatusEl = document.getElementById('keyStatus');
  const keyStatusText = document.getElementById('keyStatusText');
  const statusEl = document.getElementById('status');
  
  if (hasValidKey) {
    keyStatusEl.className = 'key-status valid';
    keyStatusText.textContent = '✓ API key configured securely';
    statusEl.textContent = 'Ready to help with your first contribution!';
    statusEl.className = 'status success';
  } else {
    keyStatusEl.className = 'key-status invalid';
    keyStatusText.textContent = '⚠ Valid API key required';
    statusEl.textContent = 'Configure your OpenAI API key to get started';
    statusEl.className = 'status';
  }
}

// Initialize the popup
function initializePopup() {
  console.log('Initializing popup');
  
  // Initialize GitHub service
  initializeGitHubService();
  
  // Check if chrome.storage is available
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.error('Chrome storage API not available');
    document.getElementById('status').textContent = 'Extension APIs not available';
    document.getElementById('status').className = 'status error';
    return;
  }

  // Load saved API key on popup open
  try {
    chrome.storage.local.get('openai_api_key', (result) => {
      console.log('Storage result:', result);
      if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        document.getElementById('status').textContent = 'Storage error: ' + chrome.runtime.lastError.message;
        document.getElementById('status').className = 'status error';
        return;
      }
      
      if (result.openai_api_key && validateApiKey(result.openai_api_key)) {
        // Don't show the actual key, just indicate it's present
        document.getElementById('apiKeyInput').placeholder = 'API key configured ✓';
        updateUI(true);
      } else {
        updateUI(false);
      }
    });
  } catch (error) {
    console.error('Error loading API key:', error);
    document.getElementById('status').textContent = 'Error loading configuration';
    document.getElementById('status').className = 'status error';
  }
}

// Save API key
function saveApiKey() {
  console.log('Save button clicked');
  const saveBtn = document.getElementById('saveKeyBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const statusEl = document.getElementById('status');
  
  // Disable button during save
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  const apiKey = apiKeyInput.value.trim();
  console.log('API key to save:', apiKey ? 'provided' : 'empty');
  
  if (!validateApiKey(apiKey)) {
    statusEl.textContent = 'Invalid API key format. Should start with sk-proj- or sk-';
    statusEl.className = 'status error';
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save API Key Securely';
    return;
  }

  try {
    chrome.storage.local.set({ 'openai_api_key': apiKey }, () => {
      console.log('API key saved to storage');
      
      if (chrome.runtime.lastError) {
        console.error('Storage save error:', chrome.runtime.lastError);
        statusEl.textContent = 'Save error: ' + chrome.runtime.lastError.message;
        statusEl.className = 'status error';
      } else {
        apiKeyInput.value = '';
        apiKeyInput.placeholder = 'API key configured ✓';
        updateUI(true);
        
        // Notify background script to update OpenAI client
        try {
          chrome.runtime.sendMessage({ action: 'update-api-key', apiKey: apiKey }, (response) => {
            console.log('Background script notified:', response);
          });
        } catch (msgError) {
          console.warn('Could not notify background script:', msgError);
        }
      }
      
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save API Key Securely';
    });
  } catch (error) {
    console.error('Error saving API key:', error);
    statusEl.textContent = 'Save failed: ' + error.message;
    statusEl.className = 'status error';
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save API Key Securely';
  }
}

// Show issues modal
function showIssuesModal(title, issues, isCurrentRepo = false) {
  // Remove existing modal if any
  const existingModal = document.getElementById('issuesModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'issuesModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 12px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  `;

  let issuesHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #333;">${title}</h2>
      <button id="closeModal" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">Close</button>
    </div>
  `;

  if (issues.length === 0) {
    issuesHtml += `
      <p style="text-align: center; color: #666; padding: 20px;">
        ${isCurrentRepo ? 'No good first issues found in this repository.' : 'No good first issues found. Try different search criteria.'}
      </p>
    `;
  } else {
    issuesHtml += `<div style="display: flex; flex-direction: column; gap: 12px;">`;
    
    issues.forEach(issue => {
      const analysis = githubService.analyzeIssueDifficulty(issue);
      const difficultyColor = analysis.difficulty === 'Easy' ? '#28a745' : 
                             analysis.difficulty === 'Medium' ? '#ffc107' : '#dc3545';
      
      const repoName = issue.repository_url ? 
        issue.repository_url.split('/').slice(-2).join('/') : 
        'Unknown Repository';

      issuesHtml += `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: #f8f9fa;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 14px;">
              <a href="${issue.html_url}" target="_blank" style="color: #0066cc; text-decoration: none;">
                ${issue.title}
              </a>
            </h4>
            <span style="background: ${difficultyColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
              ${analysis.difficulty}
            </span>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            📁 ${repoName} • ⏱️ ${analysis.estimatedHours} • 💬 ${issue.comments} comments
          </div>
          <div style="font-size: 11px; color: #555; line-height: 1.4;">
            ${issue.body ? issue.body.substring(0, 150) + (issue.body.length > 150 ? '...' : '') : 'No description available'}
          </div>
          <div style="margin-top: 8px;">
            ${issue.labels.slice(0, 3).map(label => 
              `<span style="background: #${label.color}; color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-right: 4px;">${label.name}</span>`
            ).join('')}
          </div>
        </div>
      `;
    });
    
    issuesHtml += '</div>';
  }

  modalContent.innerHTML = issuesHtml;
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Close modal functionality
  document.getElementById('closeModal').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Find good first issues
async function findGoodFirstIssues() {
  console.log('Finding good first issues');
  const findBtn = document.getElementById('findIssuesBtn');
  const statusEl = document.getElementById('status');
  
  findBtn.disabled = true;
  findBtn.textContent = 'Finding Issues...';
  statusEl.textContent = 'Searching for good first issues...';
  statusEl.className = 'status';

  try {
    // First try to get issues from current repository
    const currentRepo = await githubService.getCurrentRepo();
    
    if (currentRepo) {
      console.log('Found current repository:', currentRepo);
      statusEl.textContent = `Searching in ${currentRepo.owner}/${currentRepo.repo}...`;
      
      try {
        const result = await githubService.fetchGoodFirstIssues(currentRepo.owner, currentRepo.repo);
        
        if (result.issues.length > 0) {
          showIssuesModal(
            `🎯 Good First Issues in ${currentRepo.owner}/${currentRepo.repo}`,
            result.issues,
            true
          );
          statusEl.textContent = `Found ${result.issues.length} good first issues in current repository!`;
          statusEl.className = 'status success';
        } else {
          // No issues in current repo, search popular repositories
          statusEl.textContent = 'No issues in current repo. Searching popular repositories...';
          const popularResult = await githubService.fetchPopularReposWithGoodFirstIssues('', 1, 10);
          
          if (popularResult.repositories.length > 0) {
            const allIssues = popularResult.repositories.flatMap(repo => repo.issues);
            showIssuesModal('🌟 Good First Issues from Popular Repositories', allIssues.slice(0, 15));
            statusEl.textContent = `Found ${allIssues.length} good first issues from popular repositories!`;
            statusEl.className = 'status success';
          } else {
            statusEl.textContent = 'No good first issues found. Try again later.';
            statusEl.className = 'status error';
          }
        }
      } catch (error) {
        console.error('Error fetching issues from current repo:', error);
        // Fallback to popular repositories
        statusEl.textContent = 'Searching popular repositories...';
        const popularResult = await githubService.fetchPopularReposWithGoodFirstIssues('', 1, 10);
        
        const allIssues = popularResult.repositories.flatMap(repo => repo.issues);
        showIssuesModal('🌟 Good First Issues from Popular Repositories', allIssues.slice(0, 15));
        statusEl.textContent = `Found ${allIssues.length} good first issues!`;
        statusEl.className = 'status success';
      }
    } else {
      // Not on GitHub, search popular repositories
      console.log('Not on GitHub repository page, searching popular repos');
      statusEl.textContent = 'Searching popular repositories...';
      
      const result = await githubService.fetchPopularReposWithGoodFirstIssues('', 1, 10);
      const allIssues = result.repositories.flatMap(repo => repo.issues);
      
      if (allIssues.length > 0) {
        showIssuesModal('🌟 Good First Issues from Popular Repositories', allIssues.slice(0, 15));
        statusEl.textContent = `Found ${allIssues.length} good first issues!`;
        statusEl.className = 'status success';
      } else {
        statusEl.textContent = 'No good first issues found. Try again later.';
        statusEl.className = 'status error';
      }
    }

  } catch (error) {
    console.error('Error finding issues:', error);
    statusEl.textContent = 'Error finding issues: ' + error.message;
    statusEl.className = 'status error';
  } finally {
    findBtn.disabled = false;
    findBtn.textContent = 'Find Good First Issues';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  initializePopup();
  
  // Add event listeners
  document.getElementById('saveKeyBtn').addEventListener('click', saveApiKey);

  // Implement Find Good First Issues
  document.getElementById('findIssuesBtn').addEventListener('click', findGoodFirstIssues);

  // Other feature buttons (still placeholder)
  document.getElementById('analyzeBtn').addEventListener('click', () => {
    document.getElementById('status').textContent = 'Repository analysis feature coming soon!';
  });
  
  document.getElementById('getGuidanceBtn').addEventListener('click', () => {
    document.getElementById('status').textContent = 'Personalized guidance feature coming soon!';
  });
}); 