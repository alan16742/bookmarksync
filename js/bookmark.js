import I18n from './i18n.js';

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
    const BROWSER_TYPE = {
      FIREFOX: 'firefox',
      CHROME: 'chrome'
    };

    const ROOT_FOLDERS = {
      FIREFOX: {
        MENU: 'menu________',
        MOBILE: 'mobile______',
        TOOLBAR: 'toolbar_____',
        UNFILED: 'unfiled_____'
      },
      CHROME: {
        TOOLBAR: '1',
        OTHER: '2',
        MOBILE: '3'
      }
    };

    // 检测当前浏览器类型
    const getCurrentBrowser = () => {
      return typeof browser !== 'undefined' ? BROWSER_TYPE.FIREFOX : BROWSER_TYPE.CHROME;
    };

    // 获取根文件夹ID
    const getRootFolderId = (folderTitle, browserType) => {
      if (browserType === BROWSER_TYPE.FIREFOX) {
        switch (folderTitle) {
          case I18n.t('bookmarks.menu'):
          case I18n.t('bookmarks.menuZh'): return ROOT_FOLDERS.FIREFOX.MENU;
          case I18n.t('bookmarks.mobile'):
          case I18n.t('bookmarks.mobileZh'): return ROOT_FOLDERS.FIREFOX.MOBILE;
          case I18n.t('bookmarks.toolbar'):
          case I18n.t('bookmarks.toolbarZh'): return ROOT_FOLDERS.FIREFOX.TOOLBAR;
          default: return ROOT_FOLDERS.FIREFOX.UNFILED;
        }
      } else {
        switch (folderTitle) {
          case I18n.t('bookmarks.bar'):
          case I18n.t('bookmarks.barZh'): return ROOT_FOLDERS.CHROME.TOOLBAR;
          case I18n.t('bookmarks.mobile'):
          case I18n.t('bookmarks.mobileZh'): return ROOT_FOLDERS.CHROME.MOBILE;
          default: return ROOT_FOLDERS.CHROME.OTHER;
        }
      }
    };

    async function createBookmarkTree(node, parentId, browserType) {
      try {
        if (node.url) {
          // 处理特殊URL格式
          let url = node.url;
          if (browserType === BROWSER_TYPE.FIREFOX && url.startsWith('chrome://')) {
            url = url.replace('chrome://', 'about:');
          }

          const bookmarkAPI = browserType === BROWSER_TYPE.FIREFOX ? browser.bookmarks : chrome.bookmarks;
          await bookmarkAPI.create({
            parentId: parentId,
            title: node.title,
            url: url
          });
        } else {
          const bookmarkAPI = browserType === BROWSER_TYPE.FIREFOX ? browser.bookmarks : chrome.bookmarks;
          const folder = await bookmarkAPI.create({
            parentId: parentId,
            title: node.title
          });
          
          if (node.children) {
            for (const child of node.children) {
              await createBookmarkTree(child, folder.id, browserType);
            }
          }
        }
      } catch (error) {
        console.error(I18n.t('errors.createBookmarkFailed'), error, node);
      }
    }

    try {
      const browserType = getCurrentBrowser();
      const bookmarkAPI = browserType === BROWSER_TYPE.FIREFOX ? browser.bookmarks : chrome.bookmarks;
      
      // 在导入开始前临时禁用书签变更监听
      const port = chrome.runtime.connect({ name: 'disable-bookmark-listener' });
      
      // 清空现有书签
      await this.clearAllBookmarks();
      
      // 导入书签
      for (const node of bookmarkData[0].children) {
        const rootId = getRootFolderId(node.title, browserType);
        if (node.children) {
          for (const child of node.children) {
            await createBookmarkTree(child, rootId, browserType);
          }
        }
      }
      
      // 重新启用书签变更监听
      port.disconnect();
    } catch (error) {
      console.error(I18n.t('errors.importFailed'), error);
      throw new Error(I18n.t('errors.importFailed') + ': ' + error.message);
    }
  }
}

export default BookmarkManager; 