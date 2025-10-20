# AGRO Documentation Website

Modern documentation site built with [Docusaurus](https://docusaurus.io/).

**Live Site**: https://dmontgomery40.github.io/agro-rag-engine/

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm start
# Opens http://localhost:3000

# Build for production
npm run build

# Test production build
npm run serve
```

## Features

- Dark theme with AGRO branding (#00ff88)
- Responsive design (mobile-friendly)
- Accessibility compliant (WCAG 2.1 AA)
- Search ready (Algolia)
- Auto-deployment via GitHub Actions

## Documentation Structure

```
docs/
├── intro.md                    # Landing page
├── getting-started/            # Installation & quickstart
├── features/                   # RAG, reranker, MCP, chat
├── api/                        # API reference & endpoints
├── configuration/              # Models, performance, alerting
├── development/                # Contributing, VS Code
└── operations/                 # Deployment, monitoring
```

## Deployment

### Manual Deploy
```bash
npm run build
GIT_USER=DMontgomery40 npm run deploy
```

### Automatic Deploy
GitHub Actions automatically deploys on push to `main` branch.

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide.

## Development

### Adding New Pages

1. Create MD file in `/docs/`:
```bash
echo "---
sidebar_position: 1
---

# My Page

Content here..." > docs/features/my-feature.md
```

2. Add to sidebar (if needed):
```typescript
// sidebars.ts
{
  type: 'category',
  label: 'Features',
  items: [
    'features/my-feature',  // Add this
  ],
}
```

3. Build and verify:
```bash
npm run build
```

### Customizing Theme

Edit `src/css/custom.css` to modify:
- Colors (AGRO green: #00ff88)
- Typography (Inter, SF Mono)
- Spacing, borders, etc.

### Adding Images

Place images in `static/img/`:
```markdown
![Alt text](/img/screenshot.png)
```

## Build

```bash
# Development build (fast)
npm start

# Production build (optimized)
npm run build

# Test production build locally
npm run serve
```

Build output goes to `/build/` directory.

## Troubleshooting

### Build fails
```bash
rm -rf node_modules package-lock.json .docusaurus
npm install
npm run build
```

### Broken links
Check console warnings:
```bash
npm run build | grep "Broken link"
```

### Port already in use
```bash
# Use different port
npm start -- --port 3001
```

## Technology Stack

- **Framework**: Docusaurus 3.9.2
- **React**: 18.x
- **TypeScript**: 5.x
- **Node.js**: 18+
- **Styling**: Custom CSS (Inter + SF Mono fonts)
- **Deployment**: GitHub Pages
- **Search**: Algolia (config ready, needs API keys)

## Project Structure

```
website/
├── docs/               # Documentation markdown files
├── src/
│   └── css/
│       └── custom.css  # Theme customization
├── static/             # Static assets (images, files)
├── docusaurus.config.ts  # Main configuration
├── sidebars.ts         # Sidebar navigation
├── package.json        # Dependencies
└── DEPLOYMENT.md       # Deployment guide
```

## Contributing

1. Edit docs in `/docs/`
2. Test locally: `npm start`
3. Build: `npm run build`
4. Commit and push to `main`
5. GitHub Actions auto-deploys

## Resources

- **Docusaurus Docs**: https://docusaurus.io/docs
- **AGRO Repo**: https://github.com/DMontgomery40/agro-rag-engine
- **Live Site**: https://dmontgomery40.github.io/agro-rag-engine/
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

## Support

- **Documentation Issues**: Open GitHub issue
- **Build Problems**: Check GitHub Actions logs
- **Theme Issues**: Edit `src/css/custom.css`
- **Content Updates**: Edit markdown files in `/docs/`

---

**Status**: Production Ready ✓
**Build**: Passing ✓
**Deployment**: Automated ✓
