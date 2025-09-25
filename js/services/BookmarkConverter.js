import HtmlEntityDecoder from "./HtmlEntityDecoder.js";

class BookmarkConverter {
  static convertObjToHtml(bookmarks) {
    const bookmarksHTML = [
      "<!DOCTYPE NETSCAPE-Bookmark-file-1>\n",
      `<!-- This is an automatically generated file.\n     It will be read and overwritten.\n     DO NOT EDIT! -->\n`,
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n',
      "<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n",
    ];

    for (const item of bookmarks) {
      if (item.children) {
        for (const child of item.children) {
          bookmarksHTML.push(processNode(child));
        }
      }
    }
    bookmarksHTML.push(`</DL><p>\n`);

    return bookmarksHTML.join("");

    function formatDate(ms) {
      return Math.floor(ms / 1000);
    }

    function processNode(node, indent = "  ") {
      let html = "";

      if (node.children && node.children.length > 0) {
        const addDate = node.dateAdded ? formatDate(node.dateAdded) : "";
        html += `${indent}<DT><H3 ADD_DATE="${addDate}">${node.title}</H3>\n`;
        html += `${indent}<DL><p>\n`;
        for (const child of node.children) {
          html += processNode(child, indent + "  ");
        }
        html += `${indent}</DL><p>\n`;
      } else if (node.url) {
        const addDate = node.dateAdded ? formatDate(node.dateAdded) : "";
        html += `${indent}<DT><A HREF="${node.url}" ADD_DATE="${addDate}">${
          node.title || node.url
        }</A>\n`;
      }

      return html;
    }
  }

  static async convertHtmlToObj(html) {
    // 只保留从第一个 <DL> 开始的内容
    const start = html.indexOf("<DL>");
    if (start === -1) return [];
    html = html.slice(start);

    // 去掉所有换行和空白字符（可选）
    html = html.replace(/\r?\n|\r/g, "");

    // 递归解析
    function parseDL(str) {
      const items = [];
      let i = 0;

      // 解码 HTML 实体
      function decodeHtmlEntities(encodedStr) {
        // 使用统一的HTML实体解码函数
        return HtmlEntityDecoder.decode(encodedStr);
      }

      while (i < str.length) {
        if (str.startsWith("<DT><H3", i)) {
          // 是文件夹
          const h3Start = str.indexOf("<H3", i);
          const h3End = str.indexOf("</H3>", h3Start);
          const h3Tag = str.slice(h3Start, h3End + 5);
          const titleMatch = h3Tag.match(/<H3[^>]*>(.*?)<\/H3>/i);
          const addDateMatch = h3Tag.match(/ADD_DATE="(\d+)"/i);
          const title = decodeHtmlEntities(titleMatch?.[1] || ""); // 解码标题
          const addDate = addDateMatch?.[1] || "";

          const dlStart = str.indexOf("<DL><p>", h3End);
          const dlEnd = findClosingDL(str, dlStart);
          const innerDL = str.slice(dlStart + 7, dlEnd); // skip <DL><p>
          const children = parseDL(innerDL);

          items.push({ title, addDate, children });
          i = dlEnd + 9; // skip </DL><p>
        } else if (str.startsWith("<DT><A", i)) {
          // 是书签链接
          const aStart = str.indexOf("<A", i);
          const aEnd = str.indexOf("</A>", aStart);
          const aTag = str.slice(aStart, aEnd + 4);

          const urlMatch = aTag.match(/HREF="(.*?)"/i);
          const addDateMatch = aTag.match(/ADD_DATE="(\d+)"/i);
          const titleMatch = aTag.match(/<A[^>]*>(.*?)<\/A>/i);

          items.push({
            title: decodeHtmlEntities(titleMatch?.[1] || ""), // 解码标题
            url: decodeHtmlEntities(urlMatch?.[1] || ""), // 解码 URL
            addDate: addDateMatch?.[1] || "",
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
        if (str.startsWith("<DL><p>", i)) depth++;
        else if (str.startsWith("</DL><p>", i)) depth--;
        if (depth === 0) return i;
        i++;
      }
      return -1;
    }

    return parseDL(html);
  }
}

export default BookmarkConverter;
