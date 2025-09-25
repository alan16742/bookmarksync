import BrowserDetector from "./BrowserDetector.js";

class BookmarkGetDel {
  static async getAllBookmarks() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree(resolve);
    });
  }

  static async clearAllBookmarks() {
    const bookmarks = await this.getAllBookmarks();
    const rootNodes = bookmarks[0].children;

    for (const node of rootNodes) {
      for (const child of node.children || []) {
        if (child.title === "placeholder") {
          continue;
        }
        await chrome.bookmarks.removeTree(child.id);
      }
    }
  }

  static async findAvailableRootFolder() {
    // 获取根文件夹ID的优先级列表
    const rootFolderIds = BrowserDetector.getRootFolderIds();

    // 按优先级顺序在本地书签中查找可用的根节点
    for (const folderId of rootFolderIds) {
      try {
        // 直接尝试获取根文件夹，确保它确实存在
        const rootFolder = await chrome.bookmarks.getSubTree(folderId);
        if (rootFolder && rootFolder.length > 0) {
          return folderId;
        }
      } catch (e) {
        // 如果获取失败，继续尝试下一个
        continue;
      }
    }

    // 如果还是没有找到，使用第一个可用的根节点
    const browserRoots = await this.getAllBookmarks();
    const rootNodes = browserRoots[0]?.children || [];
    for (const rootNode of rootNodes) {
      try {
        // 验证节点确实存在
        await chrome.bookmarks.getSubTree(rootNode.id);
        return rootNode.id;
      } catch (e) {
        // 如果获取失败，继续尝试下一个
        continue;
      }
    }

    // 如果仍然没有找到，返回 null
    return null;
  }
}

export default BookmarkGetDel;
