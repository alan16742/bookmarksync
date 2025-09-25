class BrowserDetector {
  static BROWSER_TYPE = {
    FIREFOX: "firefox",
    CHROME: "chrome",
  };

  static ROOT_FOLDERS = {
    FIREFOX: {
      MENU: "menu________",
      MOBILE: "mobile______",
      TOOLBAR: "toolbar_____",
      UNFILED: "unfiled_____",
    },
    CHROME: {
      TOOLBAR: "1",
      OTHER: "2",
      MOBILE: "3",
    },
  };

  static getCurrentBrowser() {
    return typeof browser !== "undefined"
      ? this.BROWSER_TYPE.FIREFOX
      : this.BROWSER_TYPE.CHROME;
  }

  static getRootFolderIds() {
    const browserType = this.getCurrentBrowser();

    if (browserType === this.BROWSER_TYPE.FIREFOX) {
      return [
        this.ROOT_FOLDERS.FIREFOX.MENU,
        this.ROOT_FOLDERS.FIREFOX.TOOLBAR,
        this.ROOT_FOLDERS.FIREFOX.MOBILE,
        this.ROOT_FOLDERS.FIREFOX.UNFILED,
      ];
    } else {
      return [
        this.ROOT_FOLDERS.CHROME.TOOLBAR,
        this.ROOT_FOLDERS.CHROME.MOBILE,
        this.ROOT_FOLDERS.CHROME.OTHER,
      ];
    }
  }
}

export default BrowserDetector;
