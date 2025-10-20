# Deployment Guide

## GitHub Pages Deployment

### Quick Deploy (5 minutes)

1. **Build the site**
```bash
cd website
npm install
npm run build
```

2. **Deploy to GitHub Pages**
```bash
GIT_USER=DMontgomery40 npm run deploy
```

3. **Enable GitHub Pages**
- Go to https://github.com/DMontgomery40/agro-rag-engine/settings/pages
- Source: Select `gh-pages` branch
- Click Save

4. **Visit your site**
Site will be live at: https://dmontgomery40.github.io/agro-rag-engine/

---

## Automated Deployment (Recommended)

The repo includes a GitHub Actions workflow that auto-deploys on every push to main.

### Setup (One-time)
```bash
# Workflow already created at:
# .github/workflows/deploy-docs.yml

# Just push to main:
git add .
git commit -m "docs: Enable auto-deployment"
git push origin main
```

### How it works
1. Push to `main` or `scrypted-test-restored` branch
2. GitHub Actions detects changes in `website/` or `docs/`
3. Automatically builds the site
4. Deploys to `gh-pages` branch
5. Site updates live in ~2 minutes

### Monitoring Deployments
- Go to: https://github.com/DMontgomery40/agro-rag-engine/actions
- Click on "Deploy Documentation" workflow
- See build logs and deployment status

---

## Local Development

### Start Dev Server
```bash
cd website
npm start
```
Opens http://localhost:3000 with hot reload.

### Test Production Build
```bash
npm run build
npm run serve
```
Tests the production build locally.

---

## Troubleshooting

### Build fails with "Cannot find module"
```bash
cd website
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Broken links warning
This is expected for legacy-docs references. To fix:
- Migrate content from /docs/ into /website/docs/
- Update stub pages to have full content

### GitHub Pages not updating
1. Check Actions tab for build errors
2. Ensure `gh-pages` branch exists
3. Verify GitHub Pages is enabled in repo settings
4. Wait 2-5 minutes for CDN cache

---

## Custom Domain (Optional)

To use a custom domain like `docs.agro.dev`:

1. Add CNAME file:
```bash
echo "docs.agro.dev" > website/static/CNAME
```

2. Update docusaurus.config.ts:
```typescript
url: 'https://docs.agro.dev',
baseUrl: '/',
```

3. Configure DNS:
```
Type: CNAME
Name: docs
Value: dmontgomery40.github.io
```

4. Deploy:
```bash
npm run build
npm run deploy
```

---

## Production Checklist

Before deploying to production:

- [ ] Build succeeds: `npm run build`
- [ ] Test locally: `npm run serve`
- [ ] All links work (check browser console)
- [ ] Images load correctly
- [ ] Mobile responsive (test with DevTools)
- [ ] Dark theme works
- [ ] Search works (if Algolia configured)

---

## Monitoring

After deployment:

- [ ] Site loads: https://dmontgomery40.github.io/agro-rag-engine/
- [ ] Navigation works (click sidebar items)
- [ ] Code blocks render correctly
- [ ] Images load (check assets/)
- [ ] Footer links work
- [ ] Mobile view works

---

## Rollback

If you need to rollback a deployment:

```bash
# 1. Find previous commit hash
git log --oneline -10

# 2. Checkout that commit
git checkout <commit-hash> website/

# 3. Build and deploy
cd website
npm run build
npm run deploy
```

---

## Next Steps

1. **Enable Auto-Deploy**
   - Push `.github/workflows/deploy-docs.yml` to main
   - GitHub Actions will handle future deployments

2. **Add Search** (Optional)
   - Sign up: https://docsearch.algolia.com/
   - Get API keys
   - Update `docusaurus.config.ts`

3. **Custom Domain** (Optional)
   - Add CNAME file
   - Configure DNS
   - Update config

---

## Support

**Build Issues**: Check GitHub Actions logs
**Content Issues**: Edit files in `/website/docs/`
**Theme Issues**: Edit `/website/src/css/custom.css`
**Deployment Issues**: https://docusaurus.io/docs/deployment
