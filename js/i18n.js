const messages = {
  zh: {
    title: "WebDAV书签同步",
    update: "更新书签",
    upload: "上传书签",
    download: "下载书签",
    settings: {
      title: "WebDAV 设置",
      serverPlaceholder: "例如: https://dav.example.com",
      usernamePlaceholder: "请输入WebDAV用户名",
      passwordPlaceholder: "请输入WebDAV密码",
      test: "测试连接",
      save: "保存设置",
    },
    status: {
      changes: "书签有未同步的更改",
      connectionSuccess: "连接成功",
      connectionFailed: "连接失败",
      settingsSaved: "设置已保存",
      uploadSuccess: "书签上传成功",
      downloadSuccess: "书签下载成功",
      migrationNeeded: "需要进行数据迁移",
      noChanges: "书签无变化",
    },
    errors: {
      invalidServer: "无效的服务器地址",
      passwordLength: "密码长度至少需要8个字符",
      authFailed: "认证失败，请检查用户名和密码",
      networkError: "网络连接失败，请检查服务器地址",
      uploadFailed: "上传失败",
      downloadFailed: "下载失败",
      saveFailed: "保存设置失败",
      createBookmarkFailed: "创建书签失败",
      importFailed: "导入书签失败",
      encryptFailed: "加密失败",
      decryptFailed: "解密失败",
      allFieldsRequired: "所有字段都必须填写",
      unknown: "未知错误",
    },
  },
  en: {
    title: "Bookmark Sync",
    update: "Update Bookmarks",
    upload: "Upload Bookmarks",
    download: "Download Bookmarks",
    settings: {
      title: "WebDAV Settings",
      serverPlaceholder: "e.g. https://dav.example.com",
      usernamePlaceholder: "Enter WebDAV username",
      passwordPlaceholder: "Enter WebDAV password",
      test: "Test Connection",
      save: "Save Settings",
    },
    status: {
      changes: "Bookmarks have unsynchronized changes",
      connectionSuccess: "Connection successful",
      connectionFailed: "Connection failed",
      settingsSaved: "Settings saved",
      uploadSuccess: "Bookmarks uploaded successfully",
      downloadSuccess: "Bookmarks downloaded successfully",
      migrationNeeded: "Data migration needed",
      noChanges: "No changes to bookmarks",
    },
    errors: {
      invalidServer: "Invalid server address",
      passwordLength: "Password must be at least 8 characters",
      authFailed: "Authentication failed, please check username and password",
      networkError: "Network connection failed, please check server address",
      uploadFailed: "Upload failed",
      downloadFailed: "Download failed",
      saveFailed: "Failed to save settings",
      createBookmarkFailed: "Failed to create bookmark",
      importFailed: "Failed to import bookmarks",
      encryptFailed: "Encryption failed",
      decryptFailed: "Decryption failed",
      allFieldsRequired: "All fields are required",
      unknown: "Unknown error",
    },
  },
};

class I18n {
  static currentLocale = null;

  static async initialize() {
    const result = await chrome.storage.sync.get(["userLanguage"]);
    this.currentLocale =
      result.userLanguage ||
      (navigator.language.startsWith("zh") ? "zh" : "en");
  }

  static async setLocale(locale) {
    if (messages[locale]) {
      this.currentLocale = locale;
      await chrome.storage.sync.set({ userLanguage: locale });
      return true;
    }
    return false;
  }

  static t(key) {
    if (!this.currentLocale) {
      this.currentLocale = "en";
    }

    const keys = key.split(".");
    let value = messages[this.currentLocale];

    for (const k of keys) {
      value = value[k];
      if (!value) return key;
    }

    return value;
  }
}

export default I18n;
