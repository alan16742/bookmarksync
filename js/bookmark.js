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

    try {
      await this.clearAllBookmarks();
      
      const bookmarkBar = '1';    // 书签栏的ID
      const otherBookmarks = '2'; // 其他书签的ID
      
      for (const node of bookmarkData[0].children) {
        if (node.title === 'Bookmarks Bar' || node.title === '书签栏') {
          for (const child of node.children || []) {
            await createBookmarkTree(child, bookmarkBar);
          }
        } else if (node.title === 'Other Bookmarks' || node.title === '其他书签') {
          for (const child of node.children || []) {
            await createBookmarkTree(child, otherBookmarks);
          }
        }
      }
    } catch (error) {
      console.error('导入书签失败:', error);
      throw new Error('导入书签失败: ' + error.message);
    }
  }
}

export default BookmarkManager; 