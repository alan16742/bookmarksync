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

  static convertBookmarksToHTML(bookmarks) {
    const escapeHtml = str => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
    function formatDate(ms) {
      return Math.floor(ms / 1000);
    }
  
    function processNode(node, indent = '  ') {
      let html = '';
  
      if (node.children && node.children.length > 0) {
        const addDate = node.dateAdded ? formatDate(node.dateAdded) : '';
        html += `${indent}<DT><H3 ADD_DATE="${addDate}">${escapeHtml(node.title)}</H3>\n`;
        html += `${indent}<DL><p>\n`;
        for (const child of node.children) {
          html += processNode(child, indent + '  ');
        }
        html += `${indent}</DL><p>\n`;
      } else if (node.url) {
        const addDate = node.dateAdded ? formatDate(node.dateAdded) : '';
        html += `${indent}<DT><A HREF="${node.url}" ADD_DATE="${addDate}">${escapeHtml(node.title || node.url)}</A>\n`;
      }
  
      return html;
    }
  
    const bookmarksHTML = [
      `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n` +
      `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n` +
      `<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n`
    ];
    for (const item of bookmarks) {
      bookmarksHTML.push(processNode(item));
    }
    bookmarksHTML.push(`</DL><p>\n`);
  
    return bookmarksHTML.join('');
  }
  
  static parseBookmarksHTML(html) {
    // 只保留从第一个 <DL> 开始的内容
    const start = html.indexOf('<DL>');
    if (start === -1) return [];
    html = html.slice(start);
  
    // 去掉所有换行和空白字符（可选）
    html = html.replace(/\r?\n|\r/g, '');
  
    // 递归解析
    function parseDL(str) {
      const items = [];
      let i = 0;
  
      while (i < str.length) {
        if (str.startsWith('<DT><H3', i)) {
          // 是文件夹
          const h3Start = str.indexOf('<H3', i);
          const h3End = str.indexOf('</H3>', h3Start);
          const h3Tag = str.slice(h3Start, h3End + 5);
          const titleMatch = h3Tag.match(/<H3[^>]*>(.*?)<\/H3>/i);
          const addDateMatch = h3Tag.match(/ADD_DATE="(\d+)"/i);
          const title = titleMatch?.[1] || '';
          const addDate = addDateMatch?.[1] || '';
  
          const dlStart = str.indexOf('<DL><p>', h3End);
          const dlEnd = findClosingDL(str, dlStart);
          const innerDL = str.slice(dlStart + 7, dlEnd); // skip <DL><p>
          const children = parseDL(innerDL);
  
          items.push({ title, addDate, children });
          i = dlEnd + 9; // skip </DL><p>
        } else if (str.startsWith('<DT><A', i)) {
          // 是书签链接
          const aStart = str.indexOf('<A', i);
          const aEnd = str.indexOf('</A>', aStart);
          const aTag = str.slice(aStart, aEnd + 4);
  
          const urlMatch = aTag.match(/HREF="(.*?)"/i);
          const addDateMatch = aTag.match(/ADD_DATE="(\d+)"/i);
          const titleMatch = aTag.match(/<A[^>]*>(.*?)<\/A>/i);
  
          items.push({
            title: titleMatch?.[1] || '',
            url: urlMatch?.[1] || '',
            addDate: addDateMatch?.[1] || ''
          });
  
          i = aEnd + 4;
        } else {
          i++;
        }
      }
  
      return items;
    }
  
    // 帮助函数：找到匹配的 </DL><p>
    function findClosingDL(str, from) {
      let depth = 1;
      let i = from + 1;
      while (i < str.length) {
        if (str.startsWith('<DL><p>', i)) depth++;
        else if (str.startsWith('</DL><p>', i)) depth--;
        if (depth === 0) return i;
        i++;
      }
      return -1;
    }
  
    return parseDL(html);
  }  
}

export default BookmarkManager; 