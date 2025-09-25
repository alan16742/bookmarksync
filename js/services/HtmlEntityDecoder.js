class HtmlEntityDecoder {
  /**
   * 解码HTML实体（自动解析，无需维护映射表）
   * @param {string} encodedStr - 包含HTML实体的字符串
   * @returns {string} 解码后的字符串
   */
  static decode(encodedStr) {
    if (!encodedStr) return encodedStr;

    // 创建一个临时的div元素用于解码HTML实体
    // 这种方法可以自动处理所有标准HTML实体，无需维护映射表
    const textArea = document.createElement("textarea");
    textArea.innerHTML = encodedStr;
    return textArea.value;
  }

  /**
   * 在没有DOM环境下的解码方法（使用常见的HTML实体映射）
   * @param {string} encodedStr - 包含HTML实体的字符串
   * @returns {string} 解码后的字符串
   */
  static decodeWithoutDOM(encodedStr) {
    if (!encodedStr) return encodedStr;
    const entityMap = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
    };

    return encodedStr.replace(/&([a-zA-Z]+);/g, (match, entity) => {
      return entityMap[entity] || match;
    });
  }
}

export default HtmlEntityDecoder;
