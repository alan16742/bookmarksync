import WebDAVClient from './webdav.js';
import BookmarkManager from './bookmark.js';
import SecureStorage from './storage.js';

let isListenerDisabled = false;

// 监听连接
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'disable-bookmark-listener') {
    isListenerDisabled = true;
    port.onDisconnect.addListener(() => {
      isListenerDisabled = false;
    });
  }
});

async function handleBookmarkChange(text, color, bookmarkChanged = false) {
  // 首先检查是否需要禁用监听
  const data = await chrome.storage.local.get(['disableBookmarkListener']);
  if (data.disableBookmarkListener) return;
  
  if (isListenerDisabled) return;

  await chrome.storage.local.set({ bookmarksChanged: bookmarkChanged });
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// 监听书签变化
const bookmarkChangeListener = () => handleBookmarkChange('!', '#FF0000', true);

chrome.bookmarks.onCreated.addListener(bookmarkChangeListener);
chrome.bookmarks.onRemoved.addListener(bookmarkChangeListener);
chrome.bookmarks.onChanged.addListener(bookmarkChangeListener);
chrome.bookmarks.onMoved.addListener(bookmarkChangeListener);

// 可以在这里添加后台任务，比如定时同步等功能
const alarmName = 'updateAlarm';
const intervalTime = 10; // 10 分钟
chrome.alarms.create(alarmName, {
  delayInMinutes: 1, // 延迟 1 分钟执行第一次
  periodInMinutes: intervalTime
});
// 监听 alarm 触发事件
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmName) {
    updateBookmark();
  }
});

async function updateBookmark() {
  try {
    const davCredentials = await SecureStorage.getCredentials();
    // 获取本地书签变更状态
    const data = await chrome.storage.local.get(['bookmarksChanged']);
    const bookmarksChanged = data.bookmarksChanged || false;
    
    const bookmarksObj = await BookmarkManager.getAllBookmarks();
    const client = new WebDAVClient(davCredentials);
    const davNewer = await client.isDavBookmarksNewer(bookmarksObj);
    
    if (davNewer) {
      // 下载
      const downloadData = await chrome.storage.local.get(['downloadTime']);
      const downloadTime = downloadData.downloadTime || 0;
      const davlastModified = (await client.davFetch(`${client.serverUrl}/bookmarks.html`, 'HEAD')).headers.get('Last-Modified');
      if (new Date(davlastModified) - new Date(downloadTime) < 1000 * 20) return; // 20秒内判断云端文件是否更新

      const bookmarksHtml = await client.downloadBookmarks();
      const updatedBookmarksObj = await BookmarkManager.convertHtmlToObj(bookmarksHtml, true);
      await BookmarkManager.importBookmarks(updatedBookmarksObj);
      await SecureStorage.clearBookmarksChangedFlag();
      await handleBookmarkChange('↓', '#00FF00');
      await chrome.storage.local.set({ downloadTime: davlastModified });
    } else if (bookmarksChanged) {
      // 仅当本地有变更时才上传
      const bookmarksHtml = BookmarkManager.convertObjToHtml(bookmarksObj, true);
      await client.uploadBookmarks(bookmarksHtml);
      await SecureStorage.clearBookmarksChangedFlag();
      await handleBookmarkChange('↑', '#00FF00');
    } else {
      // 两边都没有变更，清除徽章
      await SecureStorage.clearBookmarksChangedFlag();
    }
  } catch (error) {
    await handleBookmarkChange('X', '#FF0000');
  }
}