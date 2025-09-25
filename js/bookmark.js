import BookmarkService from "./services/BookmarkService.js";
import BookmarkConverter from "./services/BookmarkConverter.js";
import BookmarkGetDel from "./services/BookmarkGetDel.js";

class BookmarkManager {
  static async getAllBookmarks() {
    return BookmarkGetDel.getAllBookmarks();
  }

  static async importBookmarks(bookmarkData) {
    return BookmarkService.importBookmarks(bookmarkData);
  }

  static async createBookmarkTree(node, parentId) {
    return BookmarkService.createBookmarkTree(node, parentId);
  }

  static convertObjToHtml(bookmarks) {
    return BookmarkConverter.convertObjToHtml(bookmarks);
  }

  static async convertHtmlToObj(html) {
    return BookmarkConverter.convertHtmlToObj(html);
  }

  static async extractSyncableBookmarks(bookmarks) {
    // 使用与导入相似的寻找本地收藏夹id优先级
    const rootFolderId = await BookmarkGetDel.findAvailableRootFolder();

    // 如果没有找到根文件夹，返回空数组
    if (!rootFolderId) {
      return [];
    }

    // 过滤掉 title 为 "placeholder" 的书签的辅助函数
    const filterPlaceholderBookmarks = (children) => {
      return children
        .filter((child) => child.title !== "placeholder") // 过滤当前层的 placeholder
        .map((child) => {
          // 如果是文件夹（有 children），递归处理其子项
          if (child.children && child.children.length > 0) {
            return {
              ...child,
              children: filterPlaceholderBookmarks(child.children),
            };
          }
          return child;
        });
    };

    // 先尝试查找指定的根文件夹
    for (const item of bookmarks) {
      if (item.id === rootFolderId && item.children) {
        return filterPlaceholderBookmarks(item.children);
      }
    }

    // 如果没有找到指定的根文件夹，返回第一个有子节点的根文件夹的子节点
    for (const item of bookmarks) {
      if (item.children) {
        return filterPlaceholderBookmarks(item.children);
      }
    }

    return [];
  }
}

export default BookmarkManager;
