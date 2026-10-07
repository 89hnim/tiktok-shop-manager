const { app, shell, ipcMain } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function parseSemver(v) {
  if (!v) return [0, 0, 0];
  const clean = v.replace(/^v/i, '').trim();
  const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(latest, current) {
  const [lMaj, lMin, lPat] = parseSemver(latest);
  const [cMaj, cMin, cPat] = parseSemver(current);

  if (lMaj > cMaj) return true;
  if (lMaj < cMaj) return false;
  if (lMin > cMin) return true;
  if (lMin < cMin) return false;
  return lPat > cPat;
}

/**
 * Fetch GitHub Releases API with redirects and standard headers
 */
function fetchGitHubJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'TikTok-Shop-Manager-Desktop',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    https.get(url, options, (res) => {
      // Handle redirects (e.g. 301, 302)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchGitHubJson(res.headers.location).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', chunk => { errBody += chunk; });
        res.on('end', () => {
          reject(new Error(`GitHub API returned status ${res.statusCode}: ${errBody}`));
        });
        return;
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Không thể phân tích dữ liệu phản hồi từ GitHub'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Download a file with progress reporting
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    function doRequest(targetUrl) {
      const client = targetUrl.startsWith('https') ? https : http;
      const options = {
        headers: {
          'User-Agent': 'TikTok-Shop-Manager-Desktop',
        },
      };

      client.get(targetUrl, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location);
        }

        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Tải file thất bại với mã lỗi HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (onProgress && totalBytes > 0) {
            const percent = Math.round((receivedBytes / totalBytes) * 100);
            onProgress({ percent, receivedBytes, totalBytes });
          }
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve(destPath));
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    doRequest(url);
  });
}

function setupUpdater(mainWindow) {
  // 1. Get current version
  ipcMain.handle('get-version', () => {
    return app.getVersion();
  });

  // 2. Open external URL in browser
  ipcMain.handle('open-external-url', async (event, url) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Đường dẫn không hợp lệ' };
  });

  // 3. Check for updates on GitHub
  ipcMain.handle('check-update', async (event, customRepo) => {
    const repo = (customRepo && customRepo.trim()) ? customRepo.trim() : '89hnim/tiktok-shop-manager';
    const currentVersion = app.getVersion();

    try {
      const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
      const release = await fetchGitHubJson(apiUrl);

      const latestTag = release.tag_name || '';
      const updateAvailable = isNewerVersion(latestTag, currentVersion);

      // Find suitable download asset for current OS
      const assets = Array.isArray(release.assets) ? release.assets : [];
      let targetAsset = null;

      if (process.platform === 'darwin') {
        // macOS: prefer .dmg or .zip
        targetAsset = assets.find(a => a.name.endsWith('.dmg')) || assets.find(a => a.name.endsWith('.zip')) || assets[0];
      } else if (process.platform === 'win32') {
        // Windows: prefer .exe
        targetAsset = assets.find(a => a.name.endsWith('.exe')) || assets.find(a => a.name.endsWith('.zip')) || assets[0];
      } else {
        targetAsset = assets[0];
      }

      return {
        success: true,
        updateAvailable,
        currentVersion,
        latestVersion: latestTag,
        releaseName: release.name || latestTag,
        releaseNotes: release.body || '',
        publishedAt: release.published_at,
        htmlUrl: release.html_url,
        downloadUrl: targetAsset ? targetAsset.browser_download_url : release.html_url,
        assetName: targetAsset ? targetAsset.name : '',
        assetSize: targetAsset ? targetAsset.size : 0,
        platform: process.platform,
      };
    } catch (err) {
      console.warn('Check update failed:', err.message);
      return {
        success: false,
        updateAvailable: false,
        currentVersion,
        error: err.message.includes('404') 
          ? `Chưa tìm thấy mục Releases trên repo GitHub "${repo}". Bạn cần tạo ít nhất 1 bản Release trên GitHub.`
          : err.message,
      };
    }
  });

  // 4. Download update file with progress
  ipcMain.handle('download-update', async (event, { downloadUrl, assetName }) => {
    if (!downloadUrl) {
      return { success: false, error: 'Không có đường dẫn tải file' };
    }

    try {
      const downloadsDir = app.getPath('downloads');
      const fileName = assetName || path.basename(downloadUrl) || `TikTokShopManager_Update_${Date.now()}`;
      const destPath = path.join(downloadsDir, fileName);

      await downloadFile(downloadUrl, destPath, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', progress);
        }
      });

      // Automatically open / run the installer after download
      if (fs.existsSync(destPath)) {
        await shell.openPath(destPath);
      }

      return {
        success: true,
        filePath: destPath,
      };
    } catch (err) {
      return {
        success: false,
        error: `Lỗi tải bản cập nhật: ${err.message}`,
      };
    }
  });
}

module.exports = { setupUpdater, isNewerVersion };
