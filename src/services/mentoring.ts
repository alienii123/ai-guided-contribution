// Contextual Mentoring Service for real-time contribution guidance

interface MentorStep {
  id: string;
  title: string;
  description: string;
  type: 'setup' | 'code' | 'test' | 'documentation' | 'submission';
  isCompleted: boolean;
  resources: Resource[];
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'example' | 'tool';
}

interface ContributionSession {
  issueUrl: string;
  repositoryName: string;
  repositoryUrl: string;
  startTime: Date;
  currentStep: number;
  steps: MentorStep[];
  progress: number;
  skillsBeingLearned: string[];
  mentorNotes: string[];
}

class MentoringService {
  private apiKey: string | null = null;
  private aiAnalysisService: any; // Will be injected

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

  async startContributionSession(issueUrl: string, issue: any, repository: any): Promise<ContributionSession> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const steps = await this.generateGuidanceSteps(issue, repository);
    
    const session: ContributionSession = {
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

  async generateGuidanceSteps(issue: any, repository: any): Promise<MentorStep[]> {
    const prompt = this.buildGuidancePrompt(issue, repository);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert software engineering mentor who provides step-by-step guidance for GitHub contributions. Respond with JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.4,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const guidance = JSON.parse(data.choices[0].message.content);
      
      return guidance.steps.map((step: any, index: number) => ({
        id: `step-${index + 1}`,
        title: step.title,
        description: step.description,
        type: step.type,
        isCompleted: false,
        resources: step.resources || [],
        estimatedTime: step.estimatedTime || '15-30 minutes',
        difficulty: step.difficulty || 'Medium'
      }));
    } catch (error) {
      console.error('Failed to generate AI guidance:', error);
      return this.getFallbackSteps(issue);
    }
  }

  async completeStep(sessionId: string, stepId: string, timeSpent: number): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const step = session.steps.find(s => s.id === stepId);
    if (step) {
      step.isCompleted = true;
      session.currentStep = Math.min(session.currentStep + 1, session.steps.length);
      session.progress = (session.steps.filter(s => s.isCompleted).length / session.steps.length) * 100;
      
      // Add a mentor note about progress
      session.mentorNotes.push(`Completed "${step.title}" in ${timeSpent} minutes`);
      
      await this.saveSession(session);
    }
  }

  async getContextualHelp(sessionId: string, query: string): Promise<string> {
    if (!this.apiKey) {
      return "Please configure your OpenAI API key to get contextual help.";
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      return "Session not found.";
    }

    const currentStep = session.steps[session.currentStep];
    const contextPrompt = `
Current contribution context:
- Repository: ${session.repositoryName}
- Issue: ${session.issueUrl}
- Current step: ${currentStep?.title || 'Starting'}
- Skills being learned: ${session.skillsBeingLearned.join(', ')}

User question: ${query}

Provide a helpful, specific answer as a mentor would, focusing on the current context and step.
Keep it concise and actionable.
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful coding mentor providing contextual guidance for open-source contributions.'
            },
            {
              role: 'user',
              content: contextPrompt
            }
          ],
          temperature: 0.5,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Failed to get contextual help:', error);
      return "I'm having trouble accessing the AI assistant right now. Please check the documentation or community resources for help.";
    }
  }

  async getAllSessions(): Promise<ContributionSession[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get('mentoring_sessions', (result) => {
        const sessions = result.mentoring_sessions || [];
        resolve(sessions.map((s: any) => this.deserializeSession(s)));
      });
    });
  }

  async getActiveSession(): Promise<ContributionSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.progress < 100) || null;
  }

  private buildGuidancePrompt(issue: any, repository: any): string {
    return `Create step-by-step guidance for contributing to this GitHub issue:

Repository: ${repository.name} (${repository.language})
Repository Description: ${repository.description || 'No description'}
Issue Title: ${issue.title}
Issue Body: ${issue.body || 'No description'}
Issue Labels: ${issue.labels?.map((l: any) => l.name).join(', ') || 'None'}

Provide guidance in this JSON format:
{
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what to do",
      "type": "setup|code|test|documentation|submission",
      "estimatedTime": "15-30 minutes",
      "difficulty": "Easy|Medium|Hard",
      "resources": [
        {
          "title": "Resource title",
          "url": "https://example.com",
          "type": "documentation|tutorial|example|tool"
        }
      ]
    }
  ]
}

Create 5-8 logical steps that guide a new contributor through:
1. Repository setup and understanding
2. Issue analysis and planning
3. Implementation steps
4. Testing and validation
5. Creating a pull request

Make steps specific to the issue type and repository context.`;
  }

  private extractSkillsFromIssue(issue: any): string[] {
    const labels = issue.labels?.map((l: any) => l.name.toLowerCase()) || [];
    const skills = [];
    
    if (labels.some((l: string) => l.includes('frontend') || l.includes('ui'))) skills.push('Frontend Development');
    if (labels.some((l: string) => l.includes('backend') || l.includes('api'))) skills.push('Backend Development');
    if (labels.some((l: string) => l.includes('test') || l.includes('qa'))) skills.push('Testing');
    if (labels.some((l: string) => l.includes('doc') || l.includes('readme'))) skills.push('Documentation');
    if (labels.some((l: string) => l.includes('bug'))) skills.push('Debugging');
    if (labels.some((l: string) => l.includes('feature'))) skills.push('Feature Development');
    
    // Add based on title/body content
    const text = `${issue.title} ${issue.body || ''}`.toLowerCase();
    if (text.includes('css') || text.includes('style')) skills.push('CSS');
    if (text.includes('javascript') || text.includes('js')) skills.push('JavaScript');
    if (text.includes('python')) skills.push('Python');
    if (text.includes('react')) skills.push('React');
    if (text.includes('node')) skills.push('Node.js');
    
    return [...new Set(skills)]; // Remove duplicates
  }

  private getFallbackSteps(issue: any): MentorStep[] {
    const baseSteps = [
      {
        id: 'step-1',
        title: 'Fork and Clone Repository',
        description: 'Fork the repository to your GitHub account and clone it locally to start working.',
        type: 'setup' as const,
        isCompleted: false,
        resources: [
          {
            title: 'GitHub Forking Guide',
            url: 'https://docs.github.com/en/get-started/quickstart/fork-a-repo',
            type: 'documentation' as const
          }
        ],
        estimatedTime: '10-15 minutes',
        difficulty: 'Easy' as const
      },
      {
        id: 'step-2',
        title: 'Understand the Issue',
        description: 'Read through the issue description, comments, and related code to understand what needs to be done.',
        type: 'setup' as const,
        isCompleted: false,
        resources: [],
        estimatedTime: '15-20 minutes',
        difficulty: 'Easy' as const
      },
      {
        id: 'step-3',
        title: 'Create a Feature Branch',
        description: 'Create a new branch for your changes to keep your work organized.',
        type: 'setup' as const,
        isCompleted: false,
        resources: [],
        estimatedTime: '5 minutes',
        difficulty: 'Easy' as const
      },
      {
        id: 'step-4',
        title: 'Implement the Solution',
        description: 'Write the code changes needed to address the issue. Start small and test frequently.',
        type: 'code' as const,
        isCompleted: false,
        resources: [],
        estimatedTime: '30-60 minutes',
        difficulty: 'Medium' as const
      },
      {
        id: 'step-5',
        title: 'Test Your Changes',
        description: 'Run existing tests and add new ones if needed to ensure your changes work correctly.',
        type: 'test' as const,
        isCompleted: false,
        resources: [],
        estimatedTime: '15-30 minutes',
        difficulty: 'Medium' as const
      },
      {
        id: 'step-6',
        title: 'Create Pull Request',
        description: 'Push your changes and create a pull request with a clear description of your changes.',
        type: 'submission' as const,
        isCompleted: false,
        resources: [
          {
            title: 'Creating a Pull Request',
            url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request',
            type: 'documentation' as const
          }
        ],
        estimatedTime: '10-15 minutes',
        difficulty: 'Easy' as const
      }
    ];

    return baseSteps;
  }

  private async saveSession(session: ContributionSession): Promise<void> {
    const sessions = await this.getAllSessions();
    const existingIndex = sessions.findIndex(s => s.issueUrl === session.issueUrl);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

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

  private async getSession(sessionId: string): Promise<ContributionSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.issueUrl === sessionId) || null;
  }

  private serializeSession(session: ContributionSession): any {
    return {
      ...session,
      startTime: session.startTime.toISOString()
    };
  }

  private deserializeSession(data: any): ContributionSession {
    return {
      ...data,
      startTime: new Date(data.startTime)
    };
  }
}

// Export for use in popup and content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MentoringService };
}