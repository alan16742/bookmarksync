// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装');
});

// 可以在这里添加后台任务，比如定时同步等功能 