const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoBackup {
  constructor() {
    this.storageDir = path.join(__dirname, '..', 'storage');
  }

  /**
   * Auto backup storage files to GitHub
   * @param {string} action - Description of what changed (e.g., "Upload PAR Stock", "Save Daily Sale")
   */
  async backupToGitHub(action) {
    try {
      // Check if git is initialized
      const gitDir = path.join(__dirname, '..', '.git');
      if (!fs.existsSync(gitDir)) {
        console.warn('⚠️ Git not initialized, skipping backup');
        return false;
      }

      // Check if storage directory exists
      if (!fs.existsSync(this.storageDir)) {
        console.warn('⚠️ Storage directory not found, skipping backup');
        return false;
      }

      // Check if there are any changes
      const status = execSync('git status --porcelain storage/', { encoding: 'utf-8' });
      if (!status.trim()) {
        console.log('✓ No changes to backup');
        return true;
      }

      // Add storage files
      execSync('git add storage/', { cwd: path.join(__dirname, '..') });

      // Create commit message
      const timestamp = new Date().toISOString();
      const commitMessage = `Auto-backup: ${action}

Timestamp: ${timestamp}
Files changed:
${status.trim()}

🤖 Automated backup`;

      // Commit changes
      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8'
      });

      // Push to remote (non-blocking, continue even if push fails)
      try {
        execSync('git push', {
          cwd: path.join(__dirname, '..'),
          timeout: 10000 // 10 second timeout
        });
        console.log('✅ Auto-backup successful:', action);
        return true;
      } catch (pushError) {
        console.warn('⚠️ Push failed, but commit saved locally:', pushError.message);
        // Even if push fails, the commit is saved locally
        return true;
      }

    } catch (error) {
      console.error('❌ Auto-backup failed:', error.message);
      return false;
    }
  }

  /**
   * Check if auto-backup is enabled
   * Can be disabled via environment variable
   */
  isEnabled() {
    return process.env.DISABLE_AUTO_BACKUP !== 'true';
  }

  /**
   * Restore storage files from GitHub if they're missing
   * Useful when restarting on Render (ephemeral filesystem)
   */
  async restoreFromGitHub() {
    try {
      // Check if git is initialized
      const gitDir = path.join(__dirname, '..', '.git');
      if (!fs.existsSync(gitDir)) {
        console.log('⚠️ Git not initialized, skipping restore');
        return false;
      }

      // Check if storage directory exists and has files
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }

      const files = fs.readdirSync(this.storageDir);
      const hasData = files.some(f => f.endsWith('.json') && fs.statSync(path.join(this.storageDir, f)).size > 2);

      if (hasData) {
        console.log('✓ Storage data already exists, no restore needed');
        return true;
      }

      // Storage is empty, restore from git
      console.log('📦 Storage is empty, restoring from GitHub...');

      // Check if remote origin exists
      try {
        execSync('git remote get-url origin', {
          cwd: path.join(__dirname, '..'),
          encoding: 'utf-8'
        });
      } catch (remoteError) {
        console.log('⚠️ No remote origin configured, skipping restore');
        return false;
      }

      // Pull latest changes from remote
      try {
        execSync('git fetch origin', {
          cwd: path.join(__dirname, '..'),
          timeout: 30000 // 30 second timeout
        });

        execSync('git checkout origin/main -- storage/', {
          cwd: path.join(__dirname, '..'),
          timeout: 10000
        });

        console.log('✅ Storage restored from GitHub successfully');
        return true;
      } catch (restoreError) {
        console.warn('⚠️ Could not restore from GitHub:', restoreError.message);
        console.log('💡 Starting with empty storage');
        return false;
      }

    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      return false;
    }
  }
}

module.exports = AutoBackup;
