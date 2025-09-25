import BrowserDetector from "./BrowserDetector.js";
import BookmarkGetDel from "./BookmarkGetDel.js";

class BookmarkService {
  static async importBookmarks(bookmarkData) {
    // 使用存储来标记状态，而不是创建连接
    await chrome.storage.local.set({ disableBookmarkListener: true });

    try {
      await BookmarkGetDel.clearAllBookmarks();

      // 获取当前浏览器类型
      const browserType = BrowserDetector.getCurrentBrowser();

      // 导入书签
      if (bookmarkData && bookmarkData.length > 0) {
        // 获取默认的书签栏ID（通常是第一个可用的根节点）
        let defaultRootId = await BookmarkGetDel.findAvailableRootFolder();

        // 如果仍然没有找到，抛出错误
        if (!defaultRootId) {
          throw new Error("No valid root folder found for bookmark import");
        }

        // 将所有书签导入到默认的书签栏中，保持原有的层级结构
        for (const node of bookmarkData) {
          await this.createBookmarkTree(node, defaultRootId, browserType);
        }
      }

      return true;
    } catch (error) {
      console.error("Error importing bookmarks:", error);
      throw error;
    } finally {
      // 无论导入成功还是失败，都确保重新启用监听
      await chrome.storage.local.set({ disableBookmarkListener: false });
    }
  }

  static async createBookmarkTree(node, parentId, browserType) {
    try {
      let newNode;
      if (node.children) {
        // 创建文件夹
        newNode = await chrome.bookmarks.create({
          parentId: parentId,
          title: node.title,
        });

        // 递归创建子节点
        for (const child of node.children) {
          await this.createBookmarkTree(child, newNode.id, browserType);
        }
      } else {
        // 处理特殊URL格式（针对Firefox浏览器）
        let url = node.url;
        if (
          browserType === BrowserDetector.BROWSER_TYPE.FIREFOX &&
          url &&
          url.startsWith("chrome://")
        ) {
          url = url.replace("chrome://", "about:");
        }

        // 创建书签
        await chrome.bookmarks.create({
          parentId: parentId,
          title: node.title,
          url: url,
        });
      }
    } catch (error) {
      console.error(
        `Error creating bookmark node with parentId ${parentId}:`,
        error,
      );
      // 如果父节点不存在，尝试使用根节点
      if (
        error.message &&
        error.message.includes("Can't find parent bookmark")
      ) {
        // 查找可用的根文件夹
        const fallbackParentId = await BookmarkGetDel.findAvailableRootFolder();

        // 如果仍然没有找到，抛出错误
        if (!fallbackParentId) {
          throw new Error("No valid root folder found for bookmark creation");
        }

        try {
          if (node.children) {
            // 创建文件夹
            const newNode = await chrome.bookmarks.create({
              parentId: fallbackParentId,
              title: node.title,
            });

            // 递归创建子节点
            for (const child of node.children) {
              await this.createBookmarkTree(child, newNode.id, browserType);
            }
          } else {
            // 处理特殊URL格式（针对Firefox浏览器）
            let url = node.url;
            if (
              browserType === BrowserDetector.BROWSER_TYPE.FIREFOX &&
              url &&
              url.startsWith("chrome://")
            ) {
              url = url.replace("chrome://", "about:");
            }

            // 创建书签
            await chrome.bookmarks.create({
              parentId: fallbackParentId,
              title: node.title,
              url: url,
            });
          }
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }
}

export default BookmarkService;
