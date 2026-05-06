# Scripts

Utility scripts for project maintenance.

## cleanup-git.sh

Removes build artifacts, dependencies, and generated files from git history.

**Why?**
- `node_modules/` shouldn't be committed (100-500 MB of bloat)
- `dist/` and `build/` are generated outputs (recreated on build)
- `.env` files may contain secrets
- `data/` folders contain user uploads/outputs (not source code)

**Usage:**

```bash
bash scripts/cleanup-git.sh
```

**What it does:**
1. Detects common culprits in your git history
2. Shows you what it will remove
3. Asks for confirmation
4. Removes from git (keeps files locally)
5. Commits the cleanup
6. Shows before/after repo size

**Result:**
Repo size typically shrinks from **100+ MB → < 5 MB**

## Example Output

```
$ bash scripts/cleanup-git.sh

🧹 React Copilot Git Cleanup Script
====================================

📊 Current git repo size:
143M    .git/

🔍 Checking for build artifacts and dependencies...

  ✓ Found: node_modules
  ✓ Found: backend/node_modules
  ✓ Found: frontend/node_modules
  ✓ Found: backend/dist
  ✓ Found: frontend/dist
  ✓ Found: .env

⚠️  About to remove 6 item(s) from git history

Continue? (y/n) y

🗑️  Removing from git...
💾 Committing cleanup...

✅ Cleanup complete!

📊 New git repo size:
4.2M    .git/
```

## Next Steps

After cleanup, push to remote:

```bash
git push origin main
```

To force-update remote (if already pushed):

```bash
git push origin main --force  # Use with caution!
```

## Future Prevention

The `.gitignore` file already includes these patterns, so they won't be committed going forward:

```
node_modules/
dist/
build/
.env
data/
```

Just run `npm install` and start developing—no manual cleanup needed!
