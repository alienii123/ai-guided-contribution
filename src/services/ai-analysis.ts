// AI Analysis Service for enhanced issue discovery and repository intelligence

interface IssueComplexityAnalysis {
  complexityScore: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedHours: string;
  skillsRequired: string[];
  learningOpportunities: string[];
  confidence: number;
}

interface RepositoryAnalysis {
  techStack: string[];
  complexity: number;
  contributorFriendliness: number;
  mainLanguage: string;
  hasGoodDocumentation: boolean;
  hasTests: boolean;
  activelyMaintained: boolean;
}

class AIAnalysisService {
  private apiKey: string | null = null;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get('openai_api_key', (result) => {
        this.apiKey = result.openai_api_key || null;
        resolve();
      });
    });
  }

  async analyzeIssueComplexity(issue: any, repoContext?: any): Promise<IssueComplexityAnalysis> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildIssueAnalysisPrompt(issue, repoContext);
    
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
              content: 'You are an expert software engineering mentor who analyzes GitHub issues to help new contributors find appropriate first contributions. Respond with JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
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
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.fallbackAnalysis(issue);
    }
  }

  async analyzeRepository(owner: string, repo: string): Promise<RepositoryAnalysis> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Fetch repository information
      const repoInfo = await this.fetchRepositoryInfo(owner, repo);
      const readme = await this.fetchReadme(owner, repo);
      const languages = await this.fetchLanguages(owner, repo);
      
      const prompt = this.buildRepositoryAnalysisPrompt(repoInfo, readme, languages);
      
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
              content: 'You are an expert at analyzing software repositories to assess their suitability for new contributors. Respond with JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 400
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);
      
      return {
        techStack: analysis.techStack || [],
        complexity: analysis.complexity || 5,
        contributorFriendliness: analysis.contributorFriendliness || 5,
        mainLanguage: analysis.mainLanguage || 'Unknown',
        hasGoodDocumentation: analysis.hasGoodDocumentation || false,
        hasTests: analysis.hasTests || false,
        activelyMaintained: analysis.activelyMaintained || false
      };
    } catch (error) {
      console.error('Repository analysis failed:', error);
      return this.fallbackRepositoryAnalysis();
    }
  }

  private buildIssueAnalysisPrompt(issue: any, repoContext?: any): string {
    const repoInfo = repoContext ? `Repository: ${repoContext.name} (${repoContext.language})` : '';
    
    return `Analyze this GitHub issue for a new contributor:

${repoInfo}

Issue Title: ${issue.title}
Issue Body: ${issue.body || 'No description'}
Labels: ${issue.labels?.map((l: any) => l.name).join(', ') || 'None'}
Comments: ${issue.comments || 0}

Provide analysis in this JSON format:
{
  "complexityScore": number (0-100, where 0=very easy, 100=very hard),
  "difficulty": "Easy" | "Medium" | "Hard",
  "estimatedHours": "1-2h" | "2-4h" | "4-8h" | "8+ hours",
  "skillsRequired": ["skill1", "skill2"],
  "learningOpportunities": ["opportunity1", "opportunity2"],
  "confidence": number (0.0-1.0)
}

Consider: code complexity, domain knowledge required, debugging difficulty, testing needs, and documentation requirements.`;
  }

  private buildRepositoryAnalysisPrompt(repoInfo: any, readme: string, languages: any): string {
    return `Analyze this repository for new contributor friendliness:

Repository: ${repoInfo.name}
Description: ${repoInfo.description || 'No description'}
Stars: ${repoInfo.stargazers_count}
Language: ${repoInfo.language}
Languages: ${Object.keys(languages).join(', ')}
Has Issues: ${repoInfo.has_issues}
Open Issues: ${repoInfo.open_issues_count}
Last Updated: ${repoInfo.updated_at}

README (first 1000 chars):
${readme.substring(0, 1000)}

Provide analysis in this JSON format:
{
  "techStack": ["tech1", "tech2"],
  "complexity": number (1-10, where 1=very simple, 10=very complex),
  "contributorFriendliness": number (1-10, where 1=not friendly, 10=very friendly),
  "mainLanguage": "string",
  "hasGoodDocumentation": boolean,
  "hasTests": boolean,
  "activelyMaintained": boolean
}

Consider: documentation quality, contributing guidelines, issue templates, test coverage, code structure, and maintainer responsiveness.`;
  }

  private async fetchRepositoryInfo(owner: string, repo: string): Promise<any> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) throw new Error('Failed to fetch repository info');
    return response.json();
  }

  private async fetchReadme(owner: string, repo: string): Promise<string> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
      if (!response.ok) return '';
      const data = await response.json();
      return atob(data.content.replace(/\n/g, ''));
    } catch {
      return '';
    }
  }

  private async fetchLanguages(owner: string, repo: string): Promise<any> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`);
      if (!response.ok) return {};
      return response.json();
    } catch {
      return {};
    }
  }

  private fallbackAnalysis(issue: any): IssueComplexityAnalysis {
    const labels = issue.labels?.map((l: any) => l.name.toLowerCase()) || [];
    let score = 50;
    
    if (labels.some((l: string) => l.includes('easy') || l.includes('beginner'))) score -= 20;
    if (labels.some((l: string) => l.includes('hard') || l.includes('complex'))) score += 30;
    if (issue.body && issue.body.length > 500) score += 10;
    if (issue.comments > 5) score += 10;
    
    return {
      complexityScore: Math.max(0, Math.min(100, score)),
      difficulty: score < 30 ? 'Easy' : score < 70 ? 'Medium' : 'Hard',
      estimatedHours: score < 30 ? '1-3h' : score < 70 ? '3-8h' : '8+ hours',
      skillsRequired: labels.filter((l: string) => !l.includes('good') && !l.includes('first')),
      learningOpportunities: ['General development', 'Open source contribution'],
      confidence: 0.6
    };
  }

  private fallbackRepositoryAnalysis(): RepositoryAnalysis {
    return {
      techStack: ['Unknown'],
      complexity: 5,
      contributorFriendliness: 5,
      mainLanguage: 'Unknown',
      hasGoodDocumentation: false,
      hasTests: false,
      activelyMaintained: false
    };
  }
}

// Export for use in popup and content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIAnalysisService };
}