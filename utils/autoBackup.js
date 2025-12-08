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
}

module.exports = AutoBackup;
