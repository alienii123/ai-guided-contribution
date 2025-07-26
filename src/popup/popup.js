console.log('Popup script loaded');

// Import services
// Note: In the actual implementation, we'll need to load this differently for Chrome extension

// State management
let isApiKeyValid = false;
let githubService = null;
let aiAnalysisService = null;
let userProfileService = null;
let mentoringService = null;

// Initialize services
function initializeServices() {
  // Initialize User Profile Service
  userProfileService = new UserProfileService();
  
  // Initialize AI Analysis Service  
  aiAnalysisService = new AIAnalysisService();
  
  // Initialize Mentoring Service
  mentoringService = new MentoringService();
  
  // We'll create the github service inline since we can't use ES6 imports in content scripts
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

    async analyzeIssueDifficulty(issue) {
      try {
        if (aiAnalysisService) {
          const aiAnalysis = await aiAnalysisService.analyzeIssueComplexity(issue);
          return {
            difficulty: aiAnalysis.difficulty,
            score: aiAnalysis.complexityScore,
            estimatedHours: aiAnalysis.estimatedHours,
            skillsRequired: aiAnalysis.skillsRequired,
            learningOpportunities: aiAnalysis.learningOpportunities
          };
        }
      } catch (error) {
        console.warn('AI analysis failed, using fallback:', error);
      }
      
      // Fallback to basic analysis
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
        estimatedHours: score < 30 ? '1-3h' : score < 60 ? '3-8h' : '8+ hours',
        skillsRequired: labels.filter(l => !l.includes('good') && !l.includes('first')),
        learningOpportunities: ['General development', 'Open source contribution']
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
  
  // Initialize services
  initializeServices();
  
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

// Show issues modal with enhanced features
async function showIssuesModal(title, issues, isCurrentRepo = false) {
  // Remove existing modal if any
  const existingModal = document.getElementById('issuesModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Apply personalized recommendations if user profile exists
  try {
    if (userProfileService) {
      issues = await userProfileService.getPersonalizedRecommendations(issues);
    }
  } catch (error) {
    console.warn('Failed to apply personalization:', error);
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
    
    for (const issue of issues) {
      const analysis = await githubService.analyzeIssueDifficulty(issue);
      const difficultyColor = analysis.difficulty === 'Easy' ? '#28a745' : 
                             analysis.difficulty === 'Medium' ? '#ffc107' : '#dc3545';
      
      const repoName = issue.repository_url ? 
        issue.repository_url.split('/').slice(-2).join('/') : 
        'Unknown Repository';
      
      const personalizedScore = issue.personalizedScore;
      const isRecommended = personalizedScore && personalizedScore > 70;
      
      const skillsHtml = analysis.skillsRequired && analysis.skillsRequired.length > 0 ? 
        `<div style="margin-top: 4px; font-size: 10px;">💡 Skills: ${analysis.skillsRequired.slice(0, 3).join(', ')}</div>` : '';
      
      const recommendedBadge = isRecommended ? 
        `<span style="background: #28a745; color: white; padding: 1px 4px; border-radius: 3px; font-size: 8px; margin-left: 4px;">⭐ Recommended</span>` : '';

      issuesHtml += `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: ${isRecommended ? '#f0fff0' : '#f8f9fa'}; ${isRecommended ? 'border-color: #28a745;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 14px;">
              <a href="${issue.html_url}" target="_blank" style="color: #0066cc; text-decoration: none;">
                ${issue.title}
              </a>
              ${recommendedBadge}
            </h4>
            <div>
              <span style="background: ${difficultyColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                ${analysis.difficulty}
              </span>
            </div>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            📁 ${repoName} • ⏱️ ${analysis.estimatedHours} • 💬 ${issue.comments} comments
          </div>
          <div style="font-size: 11px; color: #555; line-height: 1.4;">
            ${issue.body ? issue.body.substring(0, 150) + (issue.body.length > 150 ? '...' : '') : 'No description available'}
          </div>
          ${skillsHtml}
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              ${issue.labels.slice(0, 3).map(label => 
                `<span style="background: #${label.color}; color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-right: 4px;">${label.name}</span>`
              ).join('')}
            </div>
            <button onclick="startMentoring('${issue.html_url}')" 
                    style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 9px; cursor: pointer;">
              🤖 Get Guidance
            </button>
          </div>
        </div>
      `;
    }
    
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

  // Repository Analysis feature
  document.getElementById('analyzeBtn').addEventListener('click', async () => {
    if (!isApiKeyValid) {
      document.getElementById('status').textContent = 'Please configure your API key first.';
      return;
    }
    
    try {
      const repo = await githubService.getCurrentRepo();
      if (repo) {
        document.getElementById('status').textContent = 'Analyzing repository...';
        const analysis = await aiAnalysisService.analyzeRepository(repo.owner, repo.repo);
        showRepositoryAnalysis(analysis);
      } else {
        document.getElementById('status').textContent = 'Please navigate to a GitHub repository first.';
      }
    } catch (error) {
      document.getElementById('status').textContent = 'Analysis failed: ' + error.message;
    }
  });
  
  // User Profile and Guidance feature
  document.getElementById('getGuidanceBtn').addEventListener('click', () => {
    showUserProfileModal();
  });
});

// Global functions for modal interactions
window.startMentoring = async function(issueUrl) {
  try {
    document.getElementById('status').textContent = 'Starting mentoring session...';
    
    // Fetch issue and repository details
    const issueMatch = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (!issueMatch) {
      throw new Error('Invalid issue URL');
    }
    
    const [, owner, repo, issueNumber] = issueMatch;
    const issueResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`);
    const issue = await issueResponse.json();
    
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    const repository = await repoResponse.json();
    
    const session = await mentoringService.startContributionSession(issueUrl, issue, repository);
    
    // Remove existing modal
    const existingModal = document.getElementById('issuesModal');
    if (existingModal) existingModal.remove();
    
    showMentoringModal(session);
    
  } catch (error) {
    console.error('Failed to start mentoring:', error);
    document.getElementById('status').textContent = 'Failed to start mentoring: ' + error.message;
  }
};

// Show Repository Analysis Modal
function showRepositoryAnalysis(analysis) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; padding: 20px; border-radius: 12px;
    max-width: 500px; max-height: 80vh; overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h2>🔍 Repository Analysis</h2>
    <div style="margin: 16px 0;">
      <h3>Tech Stack:</h3>
      <p>${analysis.techStack.join(', ')}</p>
      
      <h3>Complexity Score: ${analysis.complexity}/10</h3>
      <div style="width: 100%; background: #e9ecef; border-radius: 4px; height: 8px;">
        <div style="width: ${analysis.complexity * 10}%; background: #007bff; height: 100%; border-radius: 4px;"></div>
      </div>
      
      <h3>Contributor Friendliness: ${analysis.contributorFriendliness}/10</h3>
      <div style="width: 100%; background: #e9ecef; border-radius: 4px; height: 8px;">
        <div style="width: ${analysis.contributorFriendliness * 10}%; background: #28a745; height: 100%; border-radius: 4px;"></div>
      </div>
      
      <div style="margin-top: 16px;">
        <p>✅ Main Language: ${analysis.mainLanguage}</p>
        <p>${analysis.hasGoodDocumentation ? '✅' : '❌'} Good Documentation</p>
        <p>${analysis.hasTests ? '✅' : '❌'} Test Coverage</p>
        <p>${analysis.activelyMaintained ? '✅' : '❌'} Actively Maintained</p>
      </div>
    </div>
    <button id="closeAnalysisModal" 
            style="width: 100%; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 4px;">Close</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Add event listener for close button
  document.getElementById('closeAnalysisModal').addEventListener('click', () => {
    modal.remove();
  });
}

// Show User Profile Modal  
function showUserProfileModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; padding: 20px; border-radius: 12px;
    max-width: 400px; max-height: 80vh; overflow-y: auto;
  `;
  
  content.innerHTML = `
    <h2>👤 Your Learning Profile</h2>
    <div style="margin: 16px 0;">
      <h3>Preferred Languages:</h3>
      <input type="text" id="languages" placeholder="JavaScript, Python, etc." 
             style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      
      <h3 style="margin-top: 16px;">Difficulty Preference:</h3>
      <select id="difficulty" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <option value="Easy">Easy - I'm just starting</option>
        <option value="Medium">Medium - I have some experience</option>
        <option value="Hard">Hard - I want challenges</option>
        <option value="Mixed">Mixed - Show me everything</option>
      </select>
      
      <h3 style="margin-top: 16px;">Time Availability:</h3>
      <select id="timeAvailable" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <option value="1-2h">1-2 hours per session</option>
        <option value="2-4h">2-4 hours per session</option>
        <option value="4-8h">4-8 hours per session</option>
        <option value="8+ hours">8+ hours per session</option>
      </select>
      
      <h3 style="margin-top: 16px;">Learning Goals:</h3>
      <input type="text" id="goals" placeholder="Frontend, Testing, API development, etc." 
             style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="saveProfileBtn" 
              style="flex: 1; padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px;">Save Profile</button>
      <button id="cancelProfileBtn" 
              style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px;">Cancel</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Add event listeners
  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    saveUserProfile();
  });
  
  document.getElementById('cancelProfileBtn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Load existing profile data
  loadUserProfileData();
}

// Save user profile
window.saveUserProfile = async function() {
  try {
    const preferences = {
      preferredLanguages: document.getElementById('languages').value.split(',').map(s => s.trim()).filter(s => s),
      difficultyPreference: document.getElementById('difficulty').value,
      timeAvailability: document.getElementById('timeAvailable').value,
      learningGoals: document.getElementById('goals').value.split(',').map(s => s.trim()).filter(s => s),
      preferredProjectTypes: [] // Can be expanded later
    };
    
    await userProfileService.updatePreferences(preferences);
    
    // Close modal - find the modal containing the save button
    const modal = document.getElementById('saveProfileBtn').closest('[style*="position: fixed"]');
    if (modal) {
      modal.remove();
    }
    
    document.getElementById('status').textContent = 'Profile saved! Your recommendations will be personalized.';
    document.getElementById('status').className = 'status success';
    
  } catch (error) {
    console.error('Failed to save profile:', error);
    document.getElementById('status').textContent = 'Failed to save profile.';
  }
};

// Load existing profile data
async function loadUserProfileData() {
  try {
    const profile = await userProfileService.getProfile();
    
    document.getElementById('languages').value = profile.preferences.preferredLanguages.join(', ');
    document.getElementById('difficulty').value = profile.preferences.difficultyPreference;
    document.getElementById('timeAvailable').value = profile.preferences.timeAvailability;
    document.getElementById('goals').value = profile.preferences.learningGoals.join(', ');
    
  } catch (error) {
    console.warn('Failed to load existing profile:', error);
  }
}

// Show Mentoring Modal
function showMentoringModal(session) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white; padding: 20px; border-radius: 12px;
    max-width: 600px; max-height: 80vh; overflow-y: auto;
  `;
  
  const stepsHtml = session.steps.map((step, index) => `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin: 8px 0; background: ${step.isCompleted ? '#d4edda' : index === session.currentStep ? '#fff3cd' : '#f8f9fa'};">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0; font-size: 14px;">
          ${step.isCompleted ? '✅' : index === session.currentStep ? '🔄' : '⏳'} ${step.title}
        </h4>
        <span style="font-size: 10px; color: #666;">${step.estimatedTime}</span>
      </div>
      <p style="font-size: 12px; color: #666; margin: 4px 0;">${step.description}</p>
      ${index === session.currentStep && !step.isCompleted ? 
        `<button onclick="completeStep('${session.issueUrl}', '${step.id}')" 
                style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 10px;">Mark Complete</button>` : 
        ''}
    </div>
  `).join('');
  
  content.innerHTML = `
    <h2>🤖 Contribution Guidance</h2>
    <div style="margin-bottom: 16px;">
      <h3>${session.repositoryName}</h3>
      <div style="background: #e9ecef; border-radius: 4px; height: 8px;">
        <div style="width: ${session.progress}%; background: #007bff; height: 100%; border-radius: 4px;"></div>
      </div>
      <p style="font-size: 12px; color: #666; margin: 4px 0;">${Math.round(session.progress)}% Complete</p>
    </div>
    <div style="max-height: 300px; overflow-y: auto;">
      ${stepsHtml}
    </div>
    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button onclick="this.parentElement.parentElement.parentElement.remove()" 
              style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px;">Close</button>
      <button onclick="window.open('${session.issueUrl}', '_blank')" 
              style="flex: 1; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px;">View Issue</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
}

// Complete mentoring step
window.completeStep = async function(sessionId, stepId) {
  try {
    await mentoringService.completeStep(sessionId, stepId, 30); // Default 30 minutes
    
    // Refresh the modal
    const session = await mentoringService.getSession ? 
      await mentoringService.getSession(sessionId) : null;
      
    if (session) {
      // Close current modal and show updated one
      document.querySelector('[style*="position: fixed"]').remove();
      showMentoringModal(session);
    }
    
  } catch (error) {
    console.error('Failed to complete step:', error);
  }
};

// Service class definitions (inline since we can't use ES6 imports)
class UserProfileService {
  constructor() {
    this.STORAGE_KEY = 'user_profile';
  }
  
  async getProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.STORAGE_KEY, (result) => {
        const profile = result[this.STORAGE_KEY];
        if (profile) {
          resolve(this.deserializeProfile(profile));
        } else {
          resolve(this.createDefaultProfile());
        }
      });
    });
  }
  
  async updatePreferences(preferences) {
    const profile = await this.getProfile();
    profile.preferences = { ...profile.preferences, ...preferences };
    profile.lastUpdated = new Date();
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        [this.STORAGE_KEY]: this.serializeProfile(profile)
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  
  async getPersonalizedRecommendations(issues) {
    const profile = await this.getProfile();
    
    return issues.map(issue => ({
      ...issue,
      personalizedScore: this.calculatePersonalizedScore(issue, profile)
    })).sort((a, b) => b.personalizedScore - a.personalizedScore);
  }
  
  calculatePersonalizedScore(issue, profile) {
    let score = 50;
    
    // Simple scoring based on difficulty preference
    const issueDifficulty = this.extractDifficultyFromIssue(issue);
    if (profile.preferences.difficultyPreference === 'Mixed' || 
        profile.preferences.difficultyPreference === issueDifficulty) {
      score += 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  extractDifficultyFromIssue(issue) {
    const labels = issue.labels?.map((l) => l.name.toLowerCase()) || [];
    if (labels.some(l => l.includes('easy') || l.includes('beginner'))) return 'Easy';
    if (labels.some(l => l.includes('hard') || l.includes('complex'))) return 'Hard';
    return 'Medium';
  }
  
  createDefaultProfile() {
    return {
      skills: [],
      preferences: {
        preferredLanguages: [],
        preferredProjectTypes: [],
        difficultyPreference: 'Easy',
        timeAvailability: '2-4h',
        learningGoals: []
      },
      history: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
      totalContributions: 0,
      completionRate: 0
    };
  }
  
  serializeProfile(profile) {
    return {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      lastUpdated: profile.lastUpdated.toISOString()
    };
  }
  
  deserializeProfile(data) {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      lastUpdated: new Date(data.lastUpdated)
    };
  }
}

class AIAnalysisService {
  constructor() {
    this.apiKey = null;
  }
  
  // Make this method synchronous and ensure it's called before analysis
  async ensureApiKeyLoaded() {
    if (this.apiKey) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.get('openai_api_key', (result) => {
        this.apiKey = result.openai_api_key || null;
        console.log('API key loaded:', this.apiKey ? 'present' : 'missing');
        resolve();
      });
    });
  }
  
  async analyzeIssueComplexity(issue, repoContext) {
    await this.ensureApiKeyLoaded();
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const prompt = this.buildIssueAnalysisPrompt(issue, repoContext);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software engineering mentor. Respond with JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);
    
    return {
      complexityScore: analysis.complexityScore || 50,
      difficulty: analysis.difficulty || 'Medium',
      estimatedHours: analysis.estimatedHours || '3-8h',
      skillsRequired: analysis.skillsRequired || [],
      learningOpportunities: analysis.learningOpportunities || [],
      confidence: analysis.confidence || 0.7
    };
  }
  
  async analyzeRepository(owner, repo) {
    await this.ensureApiKeyLoaded();
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Fetch repository information
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    const repoInfo = await repoResponse.json();
    
    const prompt = `Analyze this repository for new contributors:

Repository: ${repoInfo.name}
Description: ${repoInfo.description || 'No description'}
Language: ${repoInfo.language}
Stars: ${repoInfo.stargazers_count}
Open Issues: ${repoInfo.open_issues_count}

Provide analysis in JSON format:
{
  "techStack": ["tech1", "tech2"],
  "complexity": 5,
  "contributorFriendliness": 7,
  "mainLanguage": "JavaScript",
  "hasGoodDocumentation": true,
  "hasTests": true,
  "activelyMaintained": true
}`;
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing software repositories. Respond with JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Repository analysis failed:', error);
      return this.fallbackRepositoryAnalysis(repoInfo);
    }
  }
  
  buildIssueAnalysisPrompt(issue, repoContext) {
    return `Analyze this GitHub issue for a new contributor:

Issue Title: ${issue.title}
Issue Body: ${issue.body || 'No description'}
Labels: ${issue.labels?.map((l) => l.name).join(', ') || 'None'}
Comments: ${issue.comments || 0}

Provide analysis in JSON format:
{
  "complexityScore": 45,
  "difficulty": "Easy",
  "estimatedHours": "2-4h",
  "skillsRequired": ["JavaScript", "CSS"],
  "learningOpportunities": ["DOM manipulation"],
  "confidence": 0.8
}`;
  }
  
  fallbackRepositoryAnalysis(repoInfo) {
    return {
      techStack: [repoInfo.language || 'Unknown'],
      complexity: 5,
      contributorFriendliness: 5,
      mainLanguage: repoInfo.language || 'Unknown',
      hasGoodDocumentation: repoInfo.has_wiki || false,
      hasTests: false,
      activelyMaintained: new Date(repoInfo.updated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };
  }
}

class MentoringService {
  constructor() {
    this.apiKey = null;
  }
  
  async ensureApiKeyLoaded() {
    if (this.apiKey) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.get('openai_api_key', (result) => {
        this.apiKey = result.openai_api_key || null;
        resolve();
      });
    });
  }
  
  async startContributionSession(issueUrl, issue, repository) {
    const steps = await this.generateGuidanceSteps(issue, repository);
    
    const session = {
      issueUrl,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      startTime: new Date(),
      currentStep: 0,
      steps,
      progress: 0,
      skillsBeingLearned: this.extractSkillsFromIssue(issue),
      mentorNotes: []
    };
    
    await this.saveSession(session);
    return session;
  }
  
  async generateGuidanceSteps(issue, repository) {
    await this.ensureApiKeyLoaded();
    
    if (!this.apiKey) {
      return this.getFallbackSteps(issue);
    }
    
    // For now, return fallback steps. Full AI generation would need more complex prompt handling
    return this.getFallbackSteps(issue);
  }
  
  async completeStep(sessionId, stepId, timeSpent) {
    const sessions = await this.getAllSessions();
    const session = sessions.find(s => s.issueUrl === sessionId);
    
    if (session) {
      const step = session.steps.find(s => s.id === stepId);
      if (step) {
        step.isCompleted = true;
        session.currentStep = Math.min(session.currentStep + 1, session.steps.length);
        session.progress = (session.steps.filter(s => s.isCompleted).length / session.steps.length) * 100;
        
        await this.saveAllSessions(sessions);
      }
    }
  }
  
  async getAllSessions() {
    return new Promise((resolve) => {
      chrome.storage.local.get('mentoring_sessions', (result) => {
        const sessions = result.mentoring_sessions || [];
        resolve(sessions.map(s => this.deserializeSession(s)));
      });
    });
  }
  
  async saveSession(session) {
    const sessions = await this.getAllSessions();
    const existingIndex = sessions.findIndex(s => s.issueUrl === session.issueUrl);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    await this.saveAllSessions(sessions);
  }
  
  async saveAllSessions(sessions) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        mentoring_sessions: sessions.map(s => this.serializeSession(s))
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  
  extractSkillsFromIssue(issue) {
    const labels = issue.labels?.map((l) => l.name.toLowerCase()) || [];
    const skills = [];
    
    if (labels.some(l => l.includes('frontend') || l.includes('ui'))) skills.push('Frontend Development');
    if (labels.some(l => l.includes('backend') || l.includes('api'))) skills.push('Backend Development');
    if (labels.some(l => l.includes('test'))) skills.push('Testing');
    if (labels.some(l => l.includes('doc'))) skills.push('Documentation');
    
    return [...new Set(skills)];
  }
  
  getFallbackSteps(issue) {
    return [
      {
        id: 'step-1',
        title: 'Fork and Clone Repository',
        description: 'Fork the repository to your account and clone it locally.',
        type: 'setup',
        isCompleted: false,
        resources: [],
        estimatedTime: '10-15 minutes',
        difficulty: 'Easy'
      },
      {
        id: 'step-2',
        title: 'Understand the Issue',
        description: 'Read through the issue description and understand what needs to be done.',
        type: 'setup',
        isCompleted: false,
        resources: [],
        estimatedTime: '15-20 minutes',
        difficulty: 'Easy'
      },
      {
        id: 'step-3',
        title: 'Create Feature Branch',
        description: 'Create a new branch for your changes.',
        type: 'setup',
        isCompleted: false,
        resources: [],
        estimatedTime: '5 minutes',
        difficulty: 'Easy'
      },
      {
        id: 'step-4',
        title: 'Implement Solution',
        description: 'Write the code changes needed to fix the issue.',
        type: 'code',
        isCompleted: false,
        resources: [],
        estimatedTime: '30-60 minutes',
        difficulty: 'Medium'
      },
      {
        id: 'step-5',
        title: 'Test Changes',
        description: 'Run tests and verify your changes work correctly.',
        type: 'test',
        isCompleted: false,
        resources: [],
        estimatedTime: '15-30 minutes',
        difficulty: 'Medium'
      },
      {
        id: 'step-6',
        title: 'Create Pull Request',
        description: 'Push your changes and create a pull request.',
        type: 'submission',
        isCompleted: false,
        resources: [],
        estimatedTime: '10-15 minutes',
        difficulty: 'Easy'
      }
    ];
  }
  
  serializeSession(session) {
    return {
      ...session,
      startTime: session.startTime.toISOString()
    };
  }
  
  deserializeSession(data) {
    return {
      ...data,
      startTime: new Date(data.startTime)
    };
  }
}