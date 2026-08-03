Here is the Git workflow cheat sheet formatted as a Markdown guide. You can copy this content and save it as a file named `GIT_CHEAT_SHEET.md` inside your VS Code project folder for easy reference:

```markdown
# Git & Vercel Workflow Cheat Sheet

## 1. Daily Workflow (Save, Commit, and Deploy)

Run these commands in your VS Code terminal whenever you update files and want to push changes to GitHub (Vercel will deploy automatically):

```powershell
# Stage all changes
git add .

# Commit changes with a descriptive message
git commit -m "Your description here"

# Push to GitHub
git push origin main

```

---

## 2. Useful Commands & Troubleshooting

* **Check status of your modified files:**
```powershell
git status

```


* **Check connected GitHub repository URL:**
```powershell
git remote -v

```


* **Update connected repository URL (if linked to wrong repo):**
```powershell
git remote set-url origin <REPOSITORY_URL>
git remote set-url origin https://github.com/visalsing/ddt-dcode-web-docs.git

```


* **Force push local code (if remote branch is rejected/out of sync):**
```powershell
git push -u origin main --force

```



```

```