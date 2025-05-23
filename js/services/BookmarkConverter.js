import BookmarkService from './BookmarkService.js';

class BookmarkConverter {
  static convertObjToHtml(bookmarks, onlySyncMain = false) {
    if (onlySyncMain) {
      // 常见名称：Chrome的"书签栏"/"Bookmarks Bar"，Firefox的"书签工具栏"/"Bookmarks Toolbar"
      const commonBarNames = ["bookmarks bar", "bookmarks toolbar"];
      let bookmarkBarFolder = null;
      
      // 搜索根级别
      for (const root of bookmarks) {
        if (root.children) {
          // 在一级文件夹中查找书签栏
          bookmarkBarFolder = root.children.find(folder => 
            folder.title && commonBarNames.some(name => 
              folder.title.toLowerCase() === name || 
              folder.title.toLowerCase().includes(name)
            )
          );
          
          if (bookmarkBarFolder) {
            bookmarks = bookmarkBarFolder.children;
            break;
          }
        }
      }
      
      // 如果找不到匹配的名称，回退到第一个根节点的第一个子文件夹（通常是Chrome的默认位置）
      if (!bookmarkBarFolder && bookmarks[0]?.children && bookmarks[0].children.length > 0) {
        bookmarks = bookmarks[0].children[0]?.children || [];
      }
    }

    function formatDate(ms) {
      return Math.floor(ms / 1000);
    }
  
    function processNode(node, indent = '  ') {
      let html = '';
  
      if (node.children && node.children.length > 0) {
        const addDate = node.dateAdded ? formatDate(node.dateAdded) : '';
        html += `${indent}<DT><H3 ADD_DATE="${addDate}">${node.title}</H3>\n`;
        html += `${indent}<DL><p>\n`;
        for (const child of node.children) {
          html += processNode(child, indent + '  ');
        }
        html += `${indent}</DL><p>\n`;
      } else if (node.url) {
        const addDate = node.dateAdded ? formatDate(node.dateAdded) : '';
        html += `${indent}<DT><A HREF="${node.url}" ADD_DATE="${addDate}">${node.title || node.url}</A>\n`;
      }
  
      return html;
    }
  
    const bookmarksHTML = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n',
      `<!-- This is an automatically generated file.\n     It will be read and overwritten.\n     DO NOT EDIT! -->\n`,
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n',
      '<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n'
    ];
    for (const item of bookmarks) {
      bookmarksHTML.push(processNode(item));
    }
    bookmarksHTML.push(`</DL><p>\n`);
  
    return bookmarksHTML.join('');
  }
  
  static async convertHtmlToObj(html, onlySyncMain = false) {
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

      // 解码 HTML 实体
      function decodeHtmlEntities(encodedStr) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = encodedStr;
        return textarea.value;
      }
  
      while (i < str.length) {
        if (str.startsWith('<DT><H3', i)) {
          // 是文件夹
          const h3Start = str.indexOf('<H3', i);
          const h3End = str.indexOf('</H3>', h3Start);
          const h3Tag = str.slice(h3Start, h3End + 5);
          const titleMatch = h3Tag.match(/<H3[^>]*>(.*?)<\/H3>/i);
          const addDateMatch = h3Tag.match(/ADD_DATE="(\d+)"/i);
          const title = decodeHtmlEntities(titleMatch?.[1] || ''); // 解码标题
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
            title: decodeHtmlEntities(titleMatch?.[1] || ''), // 解码标题
            url: decodeHtmlEntities(urlMatch?.[1] || ''), // 解码 URL
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

    const remoteObj = parseDL(html);

    if (onlySyncMain) {
      const bookmarksNow = await BookmarkService.getAllBookmarks();
      return bookmarksNow.map((item) => {
        if (item.children && item.children.length > 0) {
          for (let i = 0; i < item.children.length; i++) {
            const child = item.children[i];
            if (child.index === 0) {
              item.children[i] = {
                ...child,
                children: remoteObj,
              };
              break;
            }
          }
        }
        return item;
      });
    }

    return remoteObj;
  }
}

export default BookmarkConverter;
