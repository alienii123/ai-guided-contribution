# AI Guided First Contribution 🤖

A Chrome extension that helps first-time contributors find and tackle good first issues in open-source projects using AI-powered analysis.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue)

## 🚀 Features

### 🔍 **Smart Issue Discovery** ✅ *Available Now*
- **Current Repository Analysis**: Automatically detects when you're on a GitHub repository and searches for good first issues
- **Popular Repository Search**: Finds beginner-friendly issues across popular open-source projects
- **Intelligent Filtering**: Searches for issues labeled with "good first issue", "beginner", "easy", "starter", etc.

#### How "Find Good First Issues" Works

The extension uses intelligent search logic to find the most relevant beginner-friendly issues:

**🎯 Smart Repository Detection:**
- **On GitHub Repository Pages**: If you're browsing a specific GitHub repository, the extension searches that repository first for good first issues
- **Fallback to Popular Repos**: If no suitable issues are found in the current repository (or you're not on GitHub), it automatically searches across popular open-source repositories
- **Global Discovery**: When used from any webpage, it discovers issues from trending repositories across GitHub

**🔍 Search Criteria:**
- Looks for issues with labels: `good first issue`, `good-first-issue`, `beginner`, `easy`, `starter`
- Filters for **open issues only** to ensure they're still available
- Sorts by **recent activity** to find actively maintained projects
- Searches up to **15 repositories** to provide diverse options

**📊 Which Repositories:**
- **Current repo** (if on GitHub): The repository you're currently viewing
- **Popular repositories**: Projects with active communities and good first issue programs
- **Language-diverse**: Includes repositories from various programming languages
- **Well-maintained**: Focuses on projects with recent activity and community engagement

This ensures you get relevant, up-to-date opportunities whether you're exploring a specific project or looking for new contribution opportunities!

### 🧠 **AI-Powered Analysis** ✅ *Available Now*
- **Difficulty Assessment**: Automatically analyzes issue complexity using AI heuristics
- **Time Estimation**: Provides realistic time estimates (1-3h, 3-8h, 8+ hours)
- **Smart Scoring**: Evaluates based on labels, content length, code complexity, and discussion activity

### 🎯 **User-Friendly Interface** ✅ *Available Now*
- **Beautiful Modal Display**: Clean, organized presentation of found issues
- **Direct Navigation**: Click to go straight to GitHub issues
- **Rich Information**: Shows repository, difficulty, time estimates, comments, and previews
- **GitHub Integration**: Seamlessly works within GitHub's interface

### 🔐 **Secure API Management** ✅ *Available Now*
- **Encrypted Storage**: API keys stored securely using Chrome's built-in encryption
- **Privacy First**: No data sent to external servers except GitHub's public API
- **Easy Configuration**: Simple popup interface for API key management

## 🚧 Upcoming Features *(Not Yet Implemented)*

The following features are planned for future releases but are **not available in the current version**:

### 📊 **Repository Intelligence Analysis** 🔮 *Coming Soon*
- Tech stack detection and complexity assessment
- Documentation quality evaluation
- Maintainer responsiveness scoring
- Contributor-friendliness rating

### 🤖 **Contextual Mentoring System** 🔮 *Coming Soon*
- AI-generated contribution workflows
- Step-by-step guidance for each issue
- Progress tracking and completion markers
- Interactive help system with contextual assistance

### 👤 **User Profile Management** 🔮 *Coming Soon*
- Skill level tracking and preferences
- Learning goal integration
- Experience-based filtering
- Personalized recommendation engine

### 📈 **Advanced Analytics** 🔮 *Coming Soon*
- Success rate optimization
- Learning pattern recognition
- Career progression guidance
- Performance tracking

## 📦 Installation

### For Users

1. **Download the Extension**
   ```bash
   git clone https://github.com/alienii123/ai-guided-contribution.git
   cd ai-guided-contribution
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist/` folder from the project

5. **Configure API Key**
   - Click the extension icon in your toolbar
   - Enter your OpenAI API key
   - Click "Save API Key Securely"

### For Developers

```bash
# Clone and setup
git clone https://github.com/alienii123/ai-guided-contribution.git
cd ai-guided-contribution
npm install

# Development build (with watch mode)
npm run dev

# Production build
npm run build
```

## 🔑 API Key Setup

1. **Get OpenAI API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create an account or sign in
   - Generate a new API key

2. **Configure in Extension**
   - Click the extension icon
   - Enter your API key (starts with `sk-proj-` or `sk-`)
   - Click "Save API Key Securely"

> **Security Note**: Your API key is stored locally in Chrome's encrypted storage and never shared with external servers.

## 🎮 How to Use

### 🔍 **Finding Issues**

**On GitHub Repository:**
1. Navigate to any GitHub repository
2. Click the AI Contribution Guide extension icon
3. Click "Find Good First Issues"
4. View curated issues from that specific repository

**Anywhere Else:**
1. Click the extension icon from any webpage
2. Click "Find Good First Issues"  
3. Discover issues from popular repositories across GitHub

### 📊 **Understanding Results**

Each issue displays:
- **Title**: Direct link to the GitHub issue
- **Repository**: Which project it belongs to
- **Difficulty Badge**: Easy (Green), Medium (Yellow), Hard (Red)
- **Time Estimate**: Realistic time commitment
- **Comments**: Community engagement level
- **Preview**: Issue description summary
- **Labels**: Relevant tags and categories

### 🎯 **GitHub Integration**

When visiting GitHub issue pages:
- **AI Guidance Tab**: Appears on issue listing pages
- **Extension Reminder**: Encourages using the extension for better issue discovery

## 🏗️ Project Structure

```
ai-guided-contribution/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── src/
│   ├── popup/
│   │   └── popup.js       # Main functionality & GitHub API
│   ├── background/
│   │   └── service-worker.ts  # Background processes
│   ├── content-scripts/
│   │   └── github-enhancer.ts # GitHub page enhancements
│   ├── styles/
│   │   └── enhancement.css    # UI styling
│   └── types/
│       └── index.ts       # TypeScript definitions
├── webpack.config.js      # Build configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🛠️ Development

### Scripts

```bash
npm run build    # Production build
npm run dev      # Development build with watch mode
npm run test     # Run tests (if configured)
```

### Architecture

- **Popup**: Main user interface with GitHub API integration
- **Background Service**: Handles extension lifecycle and messaging
- **Content Script**: Enhances GitHub pages with AI guidance indicators
- **Webpack**: Bundles TypeScript and copies assets to `dist/`

### Key Technologies

- **TypeScript**: Type-safe development
- **Chrome Extension Manifest V3**: Latest extension platform
- **GitHub API**: Repository and issue data
- **Chrome Storage API**: Secure local data persistence

## 🔒 Security & Privacy

### Data Handling
- **No External Servers**: All processing happens locally
- **GitHub API Only**: Only communicates with GitHub's public API
- **Encrypted Storage**: API keys encrypted by Chrome automatically
- **No Tracking**: No analytics or user behavior tracking

### Permissions
- **`storage`**: Save API keys securely
- **`activeTab`**: Access current tab URL for repository detection
- **`tabs`**: Get current tab information
- **`https://github.com/*`**: Access GitHub pages
- **`https://api.github.com/*`**: Fetch issue data

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Test on multiple Chrome versions
- Ensure CSP compliance (no inline scripts)
- Update documentation for new features

## 📋 Roadmap

### ✅ **Current Release (v1.0)**
- ✅ Smart Issue Discovery with GitHub API integration
- ✅ AI-powered difficulty analysis and time estimation
- ✅ Repository context detection (current vs. popular repos)
- ✅ Secure API key management
- ✅ Beautiful issue results modal
- ✅ GitHub page integration

### 🎯 **Next Release (v2.0) - Planned**
- 🔮 Repository Intelligence Analysis
- 🔮 User Profile Management system
- 🔮 Basic mentoring workflow generation
- 🔮 Enhanced filtering and search capabilities

### 🚀 **Future Releases (v3.0+) - Vision**
- 🔮 Full contextual mentoring system
- 🔮 Progress tracking and analytics
- 🔮 Advanced AI recommendations
- 🔮 Community features and collaboration

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- GitHub API for providing comprehensive repository data
- Chrome Extension platform for robust browser integration
- Open-source community for inspiration and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/alienii123/ai-guided-contribution/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alienii123/ai-guided-contribution/discussions)
- **Documentation**: This README and inline code comments

---

**Made with ❤️ for the open-source community**