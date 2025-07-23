# 🤖 AI-Guided First Contribution Extension

An intelligent Chrome extension that leverages AI to help new developers find and contribute to their first open-source projects. This extension goes beyond simple "good first issue" labels by providing personalized recommendations, contextual mentoring, and intelligent repository analysis.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue)

## ✨ Key Features

### ✅ **Smart Issue Discovery** 
AI analyzes repository complexity beyond simple labels using:
- Natural language processing of issue descriptions
- Repository complexity assessment
- Code change prediction and difficulty analysis
- Historical success rate tracking
- **Current Repository Analysis**: Automatically detects when you're on GitHub and searches that repository first
- **Popular Repository Search**: Falls back to discovering issues across trending open-source projects

### ✅ **Personalized Recommendations**
Adapts to your skill level and preferences through:
- **User Skill Profile Management**: Track your programming languages and experience levels
- **Learning Goal Integration**: Focus on issues that match your learning objectives
- **Experience-Based Filtering**: Issues scored based on your past contribution patterns
- **Success Rate Optimization**: Learns from your completion patterns to suggest better matches

### ✅ **Contextual Mentoring**
Real-time, step-by-step guidance through:
- **AI-Generated Contribution Workflows**: Custom step-by-step plans for each issue
- **Progress Tracking**: Mark steps as complete and track your journey
- **Interactive Help System**: Ask questions and get contextual assistance
- **Resource Recommendations**: Links to documentation, tutorials, and examples

### ✅ **Repository Intelligence** 
Understands codebase complexity automatically via:
- **Tech Stack Detection**: Identifies languages, frameworks, and tools used
- **Documentation Quality Assessment**: Evaluates README, contributing guides, and code comments
- **Maintainer Responsiveness Scoring**: Analyzes how quickly maintainers respond to issues/PRs
- **Contributor-Friendliness Rating**: Scores based on issue templates, labels, and community health

### 🚧 **Adaptive Learning** *(Advanced Feature - In Development)*
Gets better as it learns your development style through:
- Performance tracking and skill assessment
- Success pattern recognition
- Personalized recommendation refinement
- Career progression guidance

## 🚀 Installation

### For Users

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ai-guided-contribution.git
   cd ai-guided-contribution
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the `dist` folder

5. **Configure API Key:**
   - Click the extension icon in your toolbar
   - Enter your OpenAI API key (get one from [platform.openai.com](https://platform.openai.com))
   - Click "Save API Key Securely"

## 📖 How to Use

### 🔍 **Finding Issues**

**On GitHub Repository Pages:**
1. Navigate to any GitHub repository
2. Click the extension icon in your browser toolbar
3. Click "🔍 Find Good First Issues"
4. View curated issues from that specific repository with AI analysis

**From Any Webpage:**
1. Click the extension icon
2. Click "🔍 Find Good First Issues"  
3. Discover issues from popular repositories across GitHub

**Understanding Results:**
Each issue card shows:
- **⭐ Recommended Badge**: For issues that match your profile perfectly
- **Difficulty Badge**: Easy (Green), Medium (Yellow), Hard (Red) based on AI analysis
- **Time Estimate**: Realistic completion time (1-3h, 3-8h, 8+ hours)
- **Skills Required**: Programming languages and concepts needed
- **Repository Context**: Project name, stars, and activity level
- **🤖 Get Guidance Button**: Start step-by-step mentoring for that issue

### 📊 **Repository Analysis**

1. **Navigate to any GitHub repository**
2. **Click "📊 Analyze Repository Intelligence"** in the extension
3. **Review comprehensive analysis:**
   - **Tech Stack**: Languages, frameworks, and tools detected
   - **Complexity Score**: 1-10 rating of codebase difficulty
   - **Contributor Friendliness**: 1-10 rating of how welcoming the project is to new contributors
   - **Documentation Quality**: Assessment of README, guides, and inline documentation
   - **Test Coverage**: Whether the project has automated tests
   - **Maintainer Activity**: How actively the project is maintained

### 👤 **Setting Up Your Learning Profile**

1. **Click "👤 Setup Learning Profile"** in the extension popup
2. **Configure your preferences:**
   - **Preferred Languages**: JavaScript, Python, Java, etc.
   - **Difficulty Preference**: Easy (just starting), Medium (some experience), Hard (want challenges), or Mixed
   - **Time Availability**: How much time you typically have per contribution session
   - **Learning Goals**: Frontend development, Testing, API development, etc.
3. **Save your profile** to get personalized issue recommendations

### 🤖 **Getting Mentoring Guidance**

1. **Find an interesting issue** using the Smart Issue Discovery
2. **Click "🤖 Get Guidance"** on any issue card in the results
3. **Follow the AI-generated workflow:**
   - **Setup Phase**: Repository forking, cloning, and environment setup
   - **Understanding Phase**: Issue analysis and planning your approach
   - **Implementation Phase**: Step-by-step coding guidance
   - **Testing Phase**: How to test your changes and run existing tests
   - **Submission Phase**: Creating pull requests and handling feedback
4. **Track Progress**: Mark steps as complete and see your overall progress
5. **Get Contextual Help**: Ask questions specific to your current step

### 🎯 **Enhanced GitHub Integration**

When browsing GitHub:
- **AI Guidance Tab**: Appears on issue pages with additional context
- **Issue Highlighting**: Visually identifies good first issues with special styling
- **Inline Assistance**: Quick access to mentoring without leaving GitHub

## 🏗️ Project Structure

```
ai-guided-contribution/
├── manifest.json                 # Extension configuration
├── popup.html                   # Extension popup interface
├── src/
│   ├── popup/
│   │   └── popup.js            # Main UI logic with enhanced AI features
│   ├── background/
│   │   └── service-worker.ts   # Background processes and messaging
│   ├── content-scripts/
│   │   └── github-enhancer.ts  # GitHub page enhancements and overlays
│   ├── services/               # 🆕 AI-powered services
│   │   ├── ai-analysis.ts      # OpenAI integration for issue analysis
│   │   ├── user-profile.ts     # User preferences and skill tracking
│   │   └── mentoring.ts        # Step-by-step guidance system
│   └── styles/
│       └── enhancement.css     # Enhanced UI styling
├── webpack.config.js           # Build configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## ⚙️ Configuration & API Setup

### OpenAI API Key (Required)

1. **Get your API key** from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Open the extension** by clicking its icon
3. **Enter your key** in the secure input field (starts with `sk-proj-` or `sk-`)
4. **Click "Save API Key Securely"**

> **🔒 Security Note**: Your API key is stored locally using Chrome's encrypted storage and never shared with external services. Only you and the OpenAI API can access it.

### Privacy & Data Handling

- **No External Tracking**: Zero analytics or user behavior monitoring
- **Local Processing**: All AI analysis happens through your direct OpenAI connection
- **GitHub API Only**: Only communicates with GitHub's public API for repository data
- **Encrypted Storage**: All personal data encrypted using Chrome's built-in security

## 🛠️ Development

### Available Scripts

```bash
# Production build - optimized and minified
npm run build

# Development build with file watching
npm run dev

# Run test suite with coverage
npm run test
```

### Development Guidelines

1. **TypeScript Best Practices**: Strict typing and proper interfaces
2. **Chrome Extension Standards**: Manifest V3 compliance, CSP adherence
3. **AI Integration**: Responsible OpenAI API usage with fallback mechanisms
4. **Testing Requirements**: Unit tests for core services and user flows
5. **Documentation**: Inline comments and updated README for new features

### Key Technologies

- **TypeScript 5.2+**: Type-safe development with modern features
- **Chrome Extension Manifest V3**: Latest extension platform with enhanced security
- **OpenAI GPT-3.5 Turbo**: Advanced AI analysis and natural language processing
- **GitHub REST API**: Comprehensive repository and issue data
- **Webpack 5**: Modern bundling with TypeScript support

## 🔒 Security & Privacy

### Permissions Explained
- **`storage`**: Securely save API keys and user preferences
- **`activeTab`**: Detect current repository for contextual recommendations
- **`tabs`**: Get current tab information for repository analysis
- **GitHub Host Permissions**: Access GitHub pages and API for issue data

### Data Protection
- **End-to-End Privacy**: Your data stays between you, Chrome, and the services you explicitly use (OpenAI, GitHub)
- **No Third-Party Analytics**: Zero tracking, cookies, or data collection beyond what's needed for functionality
- **Secure Storage**: All sensitive data encrypted using Chrome's built-in security mechanisms

## 🤝 Contributing

We welcome contributions from developers of all skill levels! This project is designed to help new contributors, and we practice what we preach.

### Getting Started
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following our coding standards
4. **Test thoroughly** on different repositories and scenarios
5. **Submit a pull request** with a detailed description

### What We're Looking For
- Bug fixes and performance improvements
- New AI analysis features and algorithms  
- Enhanced user experience and accessibility
- Better error handling and edge cases
- Documentation improvements and examples

## 📋 Roadmap

### ✅ **Current Release - Core Features**
- Smart Issue Discovery with AI analysis
- Personalized Recommendations engine
- Contextual Mentoring system
- Repository Intelligence analysis
- User Profile management

### 🚧 **Next Release - Enhanced Intelligence**
- [ ] Adaptive Learning system completion
- [ ] Advanced filtering and search capabilities
- [ ] Integration with GitLab and Bitbucket
- [ ] Offline mode for cached recommendations
- [ ] Community feedback integration

### 🔮 **Future Releases - Advanced Features**
- [ ] Team collaboration and mentorship matching
- [ ] Contribution analytics and progress insights
- [ ] Mobile companion app
- [ ] AI-powered code review assistance
- [ ] Automated pull request generation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♀️ Support & Community

### Getting Help
- **📚 Documentation**: Start with this README and inline code comments
- **🐛 Bug Reports**: Use [GitHub Issues](https://github.com/your-username/ai-guided-contribution/issues) with detailed reproduction steps
- **💡 Feature Requests**: Share your ideas through [GitHub Discussions](https://github.com/your-username/ai-guided-contribution/discussions)
- **💬 Community**: Join our [Discord server](https://discord.gg/your-invite) for real-time discussions

### Frequently Asked Questions

**Q: Why do I need an OpenAI API key?**
A: The AI analysis features (difficulty assessment, repository intelligence, mentoring guidance) require advanced natural language processing that runs through OpenAI's models. This ensures high-quality, personalized recommendations.

**Q: Is my data secure?**
A: Yes! Your API key and profile data are stored locally in Chrome's encrypted storage. The extension only communicates with GitHub's public API and OpenAI for analysis - no third-party tracking or data collection.

**Q: Can I use this without an API key?**
A: You can browse and discover issues using the basic GitHub search functionality, but the AI-powered features (difficulty analysis, personalization, mentoring) require an API key.

**Q: How much does OpenAI API usage cost?**
A: Very minimal! Most users spend less than $1/month. The extension is designed to be efficient with API calls and includes usage optimization features.

---

**🌟 Built with ❤️ for the open-source community**

*Help us make contributing accessible to everyone! Star this project if it helped you make your first contribution.* ⭐