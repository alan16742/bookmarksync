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

async function handleBookmarkChange(text, color) {
  if (isListenerDisabled) return;
  
  // 设置书签已更改状态
  await chrome.storage.local.set({ bookmarksChanged: true });
  
  // 使用徽章（badge）来显示提醒
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color }); // 红色背景
}

// 监听书签变化
chrome.bookmarks.onCreated.addListener(handleBookmarkChange('!', '#FF0000'));
chrome.bookmarks.onRemoved.addListener(handleBookmarkChange('!', '#FF0000'));
chrome.bookmarks.onChanged.addListener(handleBookmarkChange('!', '#FF0000'));
chrome.bookmarks.onMoved.addListener(handleBookmarkChange('!', '#FF0000'));

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
    const bookmarksObj = await BookmarkManager.getAllBookmarks();
    const client = new WebDAVClient(davCredentials);
    const davNewer = await client.isDavBookmarksNewer(bookmarksObj);
    if (davNewer) {
      // 下载
      const bookmarksHtml = await client.downloadBookmarks();
      const bookmarksObj = await BookmarkManager.convertHtmlToObj(bookmarksHtml, true);
      await BookmarkManager.importBookmarks(bookmarksObj);
      await SecureStorage.clearBookmarksChangedFlag();
      await handleBookmarkChange('↓', '#00FF00');
    } else {
      // 上传
      const bookmarksHtml = BookmarkManager.convertObjToHtml(bookmarksObj, true);
      await client.uploadBookmarks(bookmarksHtml);
      await SecureStorage.clearBookmarksChangedFlag();
      await handleBookmarkChange('↑', '#00FF00');
    }
  } catch (error) {
    await handleBookmarkChange('X', '#FF0000');
  }
}