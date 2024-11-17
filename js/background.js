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

async function handleBookmarkChange() {
  if (isListenerDisabled) return;
  
  // 设置书签已更改状态
  await chrome.storage.local.set({ bookmarksChanged: true });
  
  // 使用徽章（badge）来显示提醒
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF0000" }); // 红色背景
}

// 监听书签变化
chrome.bookmarks.onCreated.addListener(handleBookmarkChange);
chrome.bookmarks.onRemoved.addListener(handleBookmarkChange);
chrome.bookmarks.onChanged.addListener(handleBookmarkChange);
chrome.bookmarks.onMoved.addListener(handleBookmarkChange);

// 可以在这里添加后台任务，比如定时同步等功能 