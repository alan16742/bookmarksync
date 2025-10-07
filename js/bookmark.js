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
    return BookmarkGetDel.extractSyncableBookmarks(bookmarks);
  }
}

export default BookmarkManager;
