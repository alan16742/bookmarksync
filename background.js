import BookmarkManager from "./js/bookmark.js";
import SyncManager from "./js/sync.js";
import HtmlEntityDecoder from "./js/services/HtmlEntityDecoder.js";

let isListenerDisabled = false;

// 监听连接
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "disable-bookmark-listener") {
    isListenerDisabled = true;
    port.onDisconnect.addListener(() => {
      isListenerDisabled = false;
    });
  }
});

// 内容脚本，用于处理HTML实体解码请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "decodeHtmlEntities") {
    // 在后台脚本中解码HTML实体
    const decoded = HtmlEntityDecoder.decodeWithoutDOM(message.html);
    sendResponse({ decoded: decoded });
    return false; // 同步响应，不需要保持通道开放
  }
});

async function handleBookmarkChange(text, color, bookmarksChanged = false) {
  // 首先检查是否需要禁用监听
  const data = await chrome.storage.local.get(["disableBookmarkListener"]);
  if (data.disableBookmarkListener) return;

  if (isListenerDisabled) return;

  await chrome.storage.local.set({ bookmarksChanged });
  chrome.action.setBadgeText({ text: text });

  // 只有当颜色值有效时才设置背景色
  if (color && color !== "") {
    chrome.action.setBadgeBackgroundColor({ color: color });
  }
}

// 监听书签变化
const bookmarkChangeListener = () => handleBookmarkChange("!", "#FF0000", true);

chrome.bookmarks.onCreated.addListener(bookmarkChangeListener);
chrome.bookmarks.onRemoved.addListener(bookmarkChangeListener);
chrome.bookmarks.onChanged.addListener(bookmarkChangeListener);
chrome.bookmarks.onMoved.addListener(bookmarkChangeListener);

// 可以在这里添加后台任务，比如定时同步等功能
const alarmName = "updateAlarm";
const intervalTime = 10; // 10 分钟
chrome.alarms.create(alarmName, {
  delayInMinutes: 1, // 延迟 1 分钟执行第一次
  periodInMinutes: intervalTime,
});
// 监听 alarm 触发事件
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmName) {
    updateBookmark();
  }
});

async function updateBookmark() {
  try {
    const client = await SyncManager.createClient();
    const localBookmarks = await BookmarkManager.getAllBookmarks();
    const result = await SyncManager.syncIfNeeded(client, localBookmarks);
    // 根据结果更新徽章
    if (result.messageKey === "status.downloadSuccess") {
      await handleBookmarkChange("↓", "#00FF00");
    } else if (result.messageKey === "status.uploadSuccess") {
      await handleBookmarkChange("↑", "#00FF00");
    } else {
      await handleBookmarkChange("", ""); // 清除徽章
    }
  } catch (error) {
    await handleBookmarkChange("X", "#FF0000");
  }
}
