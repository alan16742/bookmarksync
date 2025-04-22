import BrowserDetector from './BrowserDetector.js';

class BookmarkService {
  static async getAllBookmarks() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree(resolve);
    });
  }

  static async clearAllBookmarks() {
    const roots = await this.getAllBookmarks();
    const rootNodes = roots[0].children;
    
    for (const root of rootNodes) {
      if (root.children) {
        for (const child of root.children) {
          try {
            await chrome.bookmarks.removeTree(child.id);
          } catch (e) {
            console.warn(`Could not remove bookmark ${child.id}: ${e.message}`);
          }
        }
      }
    }
  }

  static async importBookmarks(bookmarkData) {
    // 使用存储来标记状态，而不是创建连接
    await chrome.storage.local.set({ disableBookmarkListener: true });
    
    try {
      // 获取当前浏览器类型
      const browserType = BrowserDetector.getCurrentBrowser();
      
      // 清空现有书签
      await this.clearAllBookmarks();
      
      // 导入书签
      for (const node of bookmarkData[0].children) {
        const rootId = BrowserDetector.getRootFolderId(node.title, browserType);
        if (node.children) {
          for (const child of node.children) {
            await this.createBookmarkTree(child, rootId, browserType);
          }
        }
      }
      
      console.log('Bookmarks import completed successfully');
      return true;
    } catch (error) {
      console.error('Error importing bookmarks:', error);
      throw error;
    } finally {
      // 无论导入成功还是失败，都确保重新启用监听
      await chrome.storage.local.set({ disableBookmarkListener: false });
    }
  }
  
  static async createBookmarkTree(node, parentId, browserType) {
    let newNode;
    if (node.children) {
      // 创建文件夹
      newNode = await chrome.bookmarks.create({
        parentId: parentId,
        title: node.title
      });
      
      // 递归创建子节点
      for (const child of node.children) {
        await this.createBookmarkTree(child, newNode.id, browserType);
      }
    } else {
      // 创建书签
      await chrome.bookmarks.create({
        parentId: parentId,
        title: node.title,
        url: node.url
      });
    }
  }
}

export default BookmarkService;
