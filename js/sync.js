import WebDAVClient from "./webdav.js";
import BookmarkManager from "./bookmark.js";
import SecureStorage from "./storage.js";

class SyncManager {
  static async createClient() {
    const credentials = await SecureStorage.getCredentials();
    return new WebDAVClient(credentials);
  }

  static async uploadBookmarks(client) {
    const obj = await BookmarkManager.getAllBookmarks();
    const convertedObj = await BookmarkManager.extractSyncableBookmarks(obj);
    const html = BookmarkManager.convertObjToHtml(convertedObj);
    await client.uploadBookmarks(html);
    await SecureStorage.clearBookmarksChangedFlag();

    // 如果在 popup 中调用，需要 showStatus；但在 background 中不需要。
    // 所以这里不处理 UI，只抛出成功或错误，由调用方决定如何展示。
    return { success: true, messageKey: "status.uploadSuccess" };
  }

  static async downloadBookmarks(client) {
    const html = await client.downloadBookmarks();
    const obj = await BookmarkManager.convertHtmlToObj(html);
    await BookmarkManager.importBookmarks(obj);
    await SecureStorage.clearBookmarksChangedFlag();

    return { success: true, messageKey: "status.downloadSuccess" };
  }

  // 可选：封装双向同步逻辑（popup 和 background 共用）
  static async syncIfNeeded(client, localBookmarks = null) {
    if (!localBookmarks) {
      localBookmarks = await BookmarkManager.getAllBookmarks();
    }
    const davNewer = await client.isDavBookmarksNewer(localBookmarks);

    if (davNewer) {
      return await this.downloadBookmarks(client);
    } else {
      const hasChanges = await SecureStorage.hasBookmarksChanged();
      if (hasChanges) {
        return await this.uploadBookmarks(client);
      } else {
        return { success: true, messageKey: "status.noChanges" };
      }
    }
  }
}

export default SyncManager;
