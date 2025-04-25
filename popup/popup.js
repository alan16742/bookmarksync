import WebDAVClient from '../js/webdav.js';
import BookmarkManager from '../js/bookmark.js';
import SecureStorage from '../js/storage.js';
import I18n from '../js/i18n.js';

// 更新页面上的所有翻译
function updateTranslations() {
  // 更新文本内容
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = I18n.t(el.getAttribute('data-i18n'));
  });
  
  // 更新占位符
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = I18n.t(el.getAttribute('data-i18n-placeholder'));
  });
}

function showStatus(message, success) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + (success ? 'success' : 'error');
}

function toggleButtonLoading(button, isLoading) {
  button.disabled = isLoading;
  button.classList.toggle('loading', isLoading);
}

function getInputValues() {
  return {
    serverUrl: document.getElementById('serverUrl').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value,
  };
}

async function createWebDAVClient() {
  const credentials = await SecureStorage.getCredentials();
  return new WebDAVClient(credentials);
}

async function handleUpload(client) {
  const obj = await BookmarkManager.getAllBookmarks();
  const syncOptions = await SecureStorage.getSyncOptions();
  const html = BookmarkManager.convertObjToHtml(obj, syncOptions.onlySyncMain);
  await client.uploadBookmarks(html);
  await SecureStorage.clearBookmarksChangedFlag();
  showStatus(I18n.t('status.uploadSuccess'), true);
}

async function handleDownload(client) {
  const html = await client.downloadBookmarks();
  const syncOptions = await SecureStorage.getSyncOptions();
  const obj = await BookmarkManager.convertHtmlToObj(html, syncOptions.onlySyncMain);
  await BookmarkManager.importBookmarks(obj);
  await SecureStorage.clearBookmarksChangedFlag();
  showStatus(I18n.t('status.downloadSuccess'), true);
}

const handleSync = async (mode) => {
  const button = document.getElementById(`${mode}Btn`);
  toggleButtonLoading(button, true);
  try {
    const client = await createWebDAVClient();
    if (mode === 'update') {
      const localBookmarks = await BookmarkManager.getAllBookmarks();
      const davNewer = await client.isDavBookmarksNewer(localBookmarks);
      if (davNewer) {
        await handleDownload(client);
      } else {
        await handleUpload(client);
      }
    } else if (mode === 'upload') {
      await handleUpload(client);
    } else if (mode === 'download') {
      await handleDownload(client);
    }
  } catch (error) {
    showStatus(error.message, false);
  } finally {
    toggleButtonLoading(button, false);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await I18n.initialize();
  const languageSelect = document.getElementById('language');
  languageSelect.value = I18n.currentLocale;
  updateTranslations();

  languageSelect.addEventListener('change', async (e) => {
    await I18n.setLocale(e.target.value);
    updateTranslations();
  });

  if (await SecureStorage.hasBookmarksChanged()) {
    showStatus(I18n.t('status.changes'), false);
  }

  const { serverUrl, username, password } = await SecureStorage.getCredentials();
  Object.assign(document.getElementById('serverUrl'), { value: serverUrl });
  Object.assign(document.getElementById('username'), { value: username });
  Object.assign(document.getElementById('password'), { value: password });
  
  // 加载同步设置
  const syncOptions = await SecureStorage.getSyncOptions();
  document.getElementById('onlySyncMain').checked = syncOptions.onlySyncMain;
  
  // 保存同步设置的事件监听器
  document.getElementById('onlySyncMain').addEventListener('change', async (e) => {
    await SecureStorage.saveSyncOptions({
      onlySyncMain: e.target.checked
    });
  });

  document.getElementById('testConnection').addEventListener('click', async () => {
    try {
      const creds = getInputValues();
      if (!creds.serverUrl || !creds.username || !creds.password) {
        throw new Error(I18n.t('errors.allFieldsRequired'));
      }
      const client = new WebDAVClient(creds);
      const status = await client.testConnection();
      showStatus(
        status ? I18n.t('status.connectionSuccess') : I18n.t('status.connectionFailed'),
        status
      );
    } catch (error) {
      showStatus(error.message, false);
    }
  });

  document.getElementById('saveSettings').addEventListener('click', async () => {
    try {
      const { serverUrl, username, password } = getInputValues();
      await SecureStorage.saveCredentials(serverUrl, username, password);
      
      showStatus(I18n.t('status.settingsSaved'), true);
    } catch (error) {
      showStatus(I18n.t('errors.saveFailed') + ': ' + error.message, false);
    }
  });

  // 为每个同步模式添加事件监听器
  ['update', 'upload', 'download'].forEach(mode => {
    document.getElementById(`${mode}Btn`).addEventListener('click', () => handleSync(mode));
  });

  const settingsHeader = document.querySelector('.settings-header');
  const settingsContent = document.querySelector('.settings-content');
  const arrow = document.querySelector('.arrow');

  settingsHeader.addEventListener('click', () => {
    settingsContent.classList.toggle('hidden');
    arrow.classList.toggle('up');
  });
});
