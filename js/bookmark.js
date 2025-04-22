import BookmarkService from './services/BookmarkService.js';
import BrowserDetector from './services/BrowserDetector.js';
import BookmarkConverter from './services/BookmarkConverter.js';

class BookmarkManager {
  static async getAllBookmarks() {
    return BookmarkService.getAllBookmarks();
  }

  static async clearAllBookmarks() {
    return BookmarkService.clearAllBookmarks();
  }

  static async importBookmarks(bookmarkData) {
    return BookmarkService.importBookmarks(bookmarkData);
  }
  
  static getCurrentBrowser() {
    return BrowserDetector.getCurrentBrowser();
  }
  
  static getRootFolderId(title, browserType) {
    return BrowserDetector.getRootFolderId(title, browserType);
  }
  
  static async createBookmarkTree(node, parentId, browserType) {
    return BookmarkService.createBookmarkTree(node, parentId, browserType);
  }

  static convertObjToHtml(bookmarks, onlySyncMain = false) {
    return BookmarkConverter.convertObjToHtml(bookmarks, onlySyncMain);
  }
  
  static async convertHtmlToObj(html, onlySyncMain = false) {
    return BookmarkConverter.convertHtmlToObj(html, onlySyncMain);
  }
}

export default BookmarkManager;