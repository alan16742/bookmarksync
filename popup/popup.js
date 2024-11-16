import WebDAVClient from '../js/webdav.js';
import BookmarkManager from '../js/bookmark.js';
import SecureStorage from '../js/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const credentials = await SecureStorage.getCredentials();
  
  // 填充已保存的设置
  document.getElementById('serverUrl').value = credentials.serverUrl;
  document.getElementById('username').value = credentials.username;
  document.getElementById('password').value = credentials.password;

  // 测试连接
  document.getElementById('testConnection').addEventListener('click', async () => {
    try {
      const serverUrl = document.getElementById('serverUrl').value.trim();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      // 验证必填字段
      if (!serverUrl) {
        throw new Error('请输入服务器地址');
      }
      if (!username) {
        throw new Error('请输入用户名');
      }
      if (!password) {
        throw new Error('请输入密码');
      }

      const client = new WebDAVClient(serverUrl, username, password);
      const status = await client.testConnection();
      showStatus(status ? '连接成功' : '连接失败', status);
    } catch (error) {
      showStatus(error.message, false);
    }
  });

  // 保存设置
  document.getElementById('saveSettings').addEventListener('click', async () => {
    try {
      await SecureStorage.saveCredentials(
        document.getElementById('serverUrl').value,
        document.getElementById('username').value,
        document.getElementById('password').value
      );
      showStatus('设置已保存', true);
    } catch (error) {
      showStatus('保存设置失败：' + error.message, false);
    }
  });

  // 上传书签
  document.getElementById('uploadBtn').addEventListener('click', async () => {
    try {
      const bookmarks = await BookmarkManager.getAllBookmarks();
      const client = await getWebDAVClient();
      await client.uploadBookmarks(bookmarks);
      showStatus('书签上传成功', true);
    } catch (error) {
      showStatus(error.message, false);
    }
  });

  // 下载书签
  document.getElementById('downloadBtn').addEventListener('click', async () => {
    try {
      const client = await getWebDAVClient();
      const bookmarks = await client.downloadBookmarks();
      await BookmarkManager.importBookmarks(bookmarks);
      showStatus('书签下载成功', true);
    } catch (error) {
      showStatus(error.message, false);
    }
  });

  // 清空书签
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (confirm('确定要清空所有本地书签吗？')) {
      try {
        await BookmarkManager.clearAllBookmarks();
        showStatus('书签已清空', true);
      } catch (error) {
        showStatus('清空书签失败：' + error.message, false);
      }
    }
  });

  // 添加设置区域展开/收起功能
  const settingsHeader = document.querySelector('.settings-header');
  const settingsContent = document.querySelector('.settings-content');
  const arrow = document.querySelector('.arrow');
  
  settingsHeader.addEventListener('click', () => {
    settingsContent.classList.toggle('hidden');
    arrow.classList.toggle('up');
  });
});

function showStatus(message, success) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + (success ? 'success' : 'error');
}

async function getWebDAVClient() {
  const credentials = await SecureStorage.getCredentials();
  return new WebDAVClient(
    credentials.serverUrl,
    credentials.username,
    credentials.password
  );
} 