// User Profile Service for personalized recommendations and adaptive learning

interface UserSkillLevel {
  skill: string;
  level: number; // 1-10 scale
  lastUpdated: Date;
  experience: number; // hours of experience
}

interface UserPreferences {
  preferredLanguages: string[];
  preferredProjectTypes: string[];
  difficultyPreference: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  timeAvailability: '1-2h' | '2-4h' | '4-8h' | '8+ hours';
  learningGoals: string[];
}

interface ContributionHistory {
  issueUrl: string;
  repositoryName: string;
  difficulty: string;
  timeSpent: number;
  completed: boolean;
  date: Date;
  skillsUsed: string[];
  feedback: number; // 1-5 rating
}

interface UserProfile {
  skills: UserSkillLevel[];
  preferences: UserPreferences;
  history: ContributionHistory[];
  createdAt: Date;
  lastUpdated: Date;
  totalContributions: number;
  completionRate: number;
}

class UserProfileService {
  private static readonly STORAGE_KEY = 'user_profile';
  
  async getProfile(): Promise<UserProfile> {
    return new Promise((resolve) => {
      chrome.storage.local.get(UserProfileService.STORAGE_KEY, (result) => {
        const profile = result[UserProfileService.STORAGE_KEY];
        if (profile) {
          resolve(this.deserializeProfile(profile));
        } else {
          resolve(this.createDefaultProfile());
        }
      });
    });
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    profile.lastUpdated = new Date();
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        [UserProfileService.STORAGE_KEY]: this.serializeProfile(profile)
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async updateSkill(skill: string, newLevel: number, experienceHours: number = 0): Promise<void> {
    const profile = await this.getProfile();
    const existingSkill = profile.skills.find(s => s.skill === skill);
    
    if (existingSkill) {
      existingSkill.level = newLevel;
      existingSkill.experience += experienceHours;
      existingSkill.lastUpdated = new Date();
    } else {
      profile.skills.push({
        skill,
        level: newLevel,
        lastUpdated: new Date(),
        experience: experienceHours
      });
    }
    
    await this.updateProfile(profile);
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const profile = await this.getProfile();
    profile.preferences = { ...profile.preferences, ...preferences };
    await this.updateProfile(profile);
  }

  async addContribution(contribution: Omit<ContributionHistory, 'date'>): Promise<void> {
    const profile = await this.getProfile();
    profile.history.push({
      ...contribution,
      date: new Date()
    });
    
    // Update stats
    profile.totalContributions = profile.history.length;
    profile.completionRate = profile.history.filter(h => h.completed).length / profile.history.length;
    
    // Update skills based on contribution
    for (const skill of contribution.skillsUsed) {
      const experienceGain = contribution.completed ? contribution.timeSpent : contribution.timeSpent * 0.5;
      await this.updateSkill(skill, 0, experienceGain); // Level will be calculated separately
    }
    
    await this.updateProfile(profile);
  }

  async getPersonalizedRecommendations(issues: any[]): Promise<any[]> {
    const profile = await this.getProfile();
    
    return issues
      .map(issue => ({
        ...issue,
        personalizedScore: this.calculatePersonalizedScore(issue, profile)
      }))
      .sort((a, b) => b.personalizedScore - a.personalizedScore);
  }

  async getLearningPath(targetSkills: string[]): Promise<any[]> {
    const profile = await this.getProfile();
    const currentSkills = profile.skills.reduce((acc, skill) => {
      acc[skill.skill] = skill.level;
      return acc;
    }, {} as Record<string, number>);

    return targetSkills.map(skill => {
      const currentLevel = currentSkills[skill] || 0;
      const gap = Math.max(0, 5 - currentLevel); // Target level 5 for basic competency
      
      return {
        skill,
        currentLevel,
        targetLevel: 5,
        gap,
        suggestedIssueTypes: this.getSuggestedIssueTypes(skill, currentLevel),
        estimatedTimeToTarget: `${gap * 10}-${gap * 20} hours`
      };
    });
  }

  private calculatePersonalizedScore(issue: any, profile: UserProfile): number {
    let score = 50; // Base score
    
    // Language preference match
    const repoLanguage = this.extractLanguageFromIssue(issue);
    if (profile.preferences.preferredLanguages.includes(repoLanguage)) {
      score += 20;
    }
    
    // Difficulty preference match
    const issueDifficulty = this.extractDifficultyFromIssue(issue);
    if (profile.preferences.difficultyPreference === 'Mixed' || 
        profile.preferences.difficultyPreference === issueDifficulty) {
      score += 15;
    }
    
    // Skill level match
    const requiredSkills = this.extractSkillsFromIssue(issue);
    const userSkills = profile.skills.reduce((acc, skill) => {
      acc[skill.skill] = skill.level;
      return acc;
    }, {} as Record<string, number>);
    
    for (const skill of requiredSkills) {
      const userLevel = userSkills[skill] || 0;
      if (userLevel > 3) { // Has some competency
        score += 10;
      } else if (userLevel > 0) { // Learning opportunity
        score += 5;
      }
    }
    
    // Learning goal alignment
    for (const goal of profile.preferences.learningGoals) {
      if (issue.title?.toLowerCase().includes(goal.toLowerCase()) || 
          issue.body?.toLowerCase().includes(goal.toLowerCase())) {
        score += 15;
      }
    }
    
    // Historical success rate
    const similarIssues = profile.history.filter(h => 
      h.difficulty === issueDifficulty || 
      h.skillsUsed.some(s => requiredSkills.includes(s))
    );
    
    if (similarIssues.length > 0) {
      const successRate = similarIssues.filter(h => h.completed).length / similarIssues.length;
      score += successRate * 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private extractLanguageFromIssue(issue: any): string {
    if (issue.repository_url) {
      return 'JavaScript'; // Default fallback - would need repo analysis
    }
    return 'Unknown';
  }

  private extractDifficultyFromIssue(issue: any): 'Easy' | 'Medium' | 'Hard' {
    const labels = issue.labels?.map((l: any) => l.name.toLowerCase()) || [];
    if (labels.some((l: string) => l.includes('easy') || l.includes('beginner'))) return 'Easy';
    if (labels.some((l: string) => l.includes('hard') || l.includes('complex'))) return 'Hard';
    return 'Medium';
  }

  private extractSkillsFromIssue(issue: any): string[] {
    const labels = issue.labels?.map((l: any) => l.name.toLowerCase()) || [];
    const skills = [];
    
    if (labels.some((l: string) => l.includes('frontend') || l.includes('ui'))) skills.push('Frontend Development');
    if (labels.some((l: string) => l.includes('backend') || l.includes('api'))) skills.push('Backend Development');
    if (labels.some((l: string) => l.includes('test') || l.includes('qa'))) skills.push('Testing');
    if (labels.some((l: string) => l.includes('doc') || l.includes('readme'))) skills.push('Documentation');
    if (labels.some((l: string) => l.includes('bug'))) skills.push('Debugging');
    
    return skills;
  }

  private getSuggestedIssueTypes(skill: string, currentLevel: number): string[] {
    const suggestions: Record<string, Record<number, string[]>> = {
      'Frontend Development': {
        0: ['documentation', 'typo fixes', 'simple UI tweaks'],
        1: ['CSS styling', 'basic HTML structure'],
        2: ['component styling', 'responsive design'],
        3: ['interactive features', 'form handling'],
        4: ['complex components', 'state management'],
        5: ['performance optimization', 'accessibility features']
      },
      'Backend Development': {
        0: ['documentation', 'configuration files'],
        1: ['simple API endpoints', 'data validation'],
        2: ['database queries', 'middleware functions'],
        3: ['authentication features', 'file handling'],
        4: ['complex business logic', 'integration testing'],
        5: ['performance optimization', 'architecture improvements']
      }
    };
    
    const skillLevels = suggestions[skill];
    if (!skillLevels) return ['general development', 'documentation'];
    
    const levelSuggestions = skillLevels[Math.min(currentLevel, 5)] || skillLevels[0];
    return levelSuggestions;
  }

  private createDefaultProfile(): UserProfile {
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

  private serializeProfile(profile: UserProfile): any {
    return {
      ...profile,
      skills: profile.skills.map(skill => ({
        ...skill,
        lastUpdated: skill.lastUpdated.toISOString()
      })),
      history: profile.history.map(item => ({
        ...item,
        date: item.date.toISOString()
      })),
      createdAt: profile.createdAt.toISOString(),
      lastUpdated: profile.lastUpdated.toISOString()
    };
  }

  private deserializeProfile(data: any): UserProfile {
    return {
      ...data,
      skills: data.skills.map((skill: any) => ({
        ...skill,
        lastUpdated: new Date(skill.lastUpdated)
      })),
      history: data.history.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      })),
      createdAt: new Date(data.createdAt),
      lastUpdated: new Date(data.lastUpdated)
    };
  }
}

// Export for use in popup and content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UserProfileService };
}