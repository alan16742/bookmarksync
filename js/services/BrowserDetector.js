class BrowserDetector {
  static getCurrentBrowser() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') > -1 ? 'firefox' : 'chrome';
  }
  
  static getRootFolderId(title, browserType) {
    if (browserType === 'firefox') {
      return title === 'toolbar_____' ? 'toolbar_____' : 'menu________';
    } else {
      return title === '书签栏' ? '1' : '2';
    }
  }
  
  static BROWSER_TYPE = {
    FIREFOX: 'firefox',
    CHROME: 'chrome'
  };
}

export default BrowserDetector;
