class BookmarkManager {
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
        await chrome.bookmarks.removeTree(child.id);
      }
    }
  }

  static async importBookmarks(bookmarkData) {
    async function createBookmarkTree(node, parentId) {
      if (node.url) {
        await chrome.bookmarks.create({
          parentId: parentId,
          title: node.title,
          url: node.url
        });
      } else {
        const folder = await chrome.bookmarks.create({
          parentId: parentId,
          title: node.title
        });
        
        if (node.children) {
          for (const child of node.children) {
            await createBookmarkTree(child, folder.id);
          }
        }
      }
    }

    await this.clearAllBookmarks();
    
    // 获取书签栏和其他书签的ID
    const bookmarkBar = '1';    // 书签栏的ID
    const otherBookmarks = '2'; // 其他书签的ID
    
    // 分别处理书签栏和其他书签
    for (const node of bookmarkData[0].children) {
      if (node.title === 'Bookmarks Bar' || node.title === '书签栏') {
        // 处理书签栏内容
        for (const child of node.children || []) {
          await createBookmarkTree(child, bookmarkBar);
        }
      } else if (node.title === 'Other Bookmarks' || node.title === '其他书签') {
        // 处理其他书签内容
        for (const child of node.children || []) {
          await createBookmarkTree(child, otherBookmarks);
        }
      }
    }
  }
}

export default BookmarkManager; 