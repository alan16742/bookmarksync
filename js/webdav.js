import I18n from "./i18n.js";

class WebDAVError extends Error {
  constructor(message, type, statusCode, details = {}) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class WebDAVClient {
  constructor(credentials) {
    this.serverUrl = credentials.serverUrl;
    this.username = credentials.username;
    this.password = credentials.password;
  }

  async davFetch(url, method, options = {}) {
    return fetch(url, {
      method: method,
      ...options,
      headers: {
        Authorization: "Basic " + btoa(this.username + ":" + this.password),
        ...(options.headers || {}),
      },
    });
  }

  async testConnection() {
    try {
      const response = await this.davFetch(this.serverUrl, "PROPFIND", {
        headers: { Depth: "0" },
      });

      if (response.status === 401) {
        throw new WebDAVError(I18n.t("errors.authFailed"), "auth", 401);
      }

      return response.ok;
    } catch (error) {
      if (error instanceof WebDAVError) {
        throw error;
      }
      throw new WebDAVError(I18n.t("errors.networkError"), "network", 0);
    }
  }

  async isDavBookmarksNewer(bookmarkObj) {
    // Always fetch the latest server modification time
    const response = await this.davFetch(
      `${this.serverUrl}/bookmarks.html`,
      "HEAD",
    );

    if (!response.ok) {
      throw new Error("Failed to fetch server bookmark modification time");
    }

    const davlastModified = Math.round(
      new Date(response.headers.get("Last-Modified")).getTime() / 1000,
    );

    // 获取本地保存的服务器书签修改时间
    const result = await chrome.storage.local.get([
      "serverBookmarkModificationTime",
    ]);
    const localServerBookmarkModificationTime =
      result.serverBookmarkModificationTime || 0;

    // 比较远程书签文件的修改时间和本地保存的服务器书签修改时间
    return davlastModified > localServerBookmarkModificationTime;
  }

  async updateServerModificationTime() {
    // Get the updated modification time after successful operation
    const modificationTime = await this.getFileModificationTime();

    // Store the server modification time
    if (modificationTime) {
      await chrome.storage.local.set({
        serverBookmarkModificationTime: modificationTime,
      });
    }
  }

  async uploadBookmarks(bookmarkData) {
    try {
      const response = await this.davFetch(
        `${this.serverUrl}/bookmarks.html`,
        "PUT",
        { body: bookmarkData },
      );

      if (!response.ok) {
        throw new Error(I18n.t("errors.uploadFailed"));
      }

      // Update the server modification time
      await this.updateServerModificationTime();
    } catch (error) {
      throw new Error(I18n.t("errors.uploadFailed") + ": " + error.message);
    }
  }

  async downloadBookmarks() {
    try {
      const response = await this.davFetch(
        `${this.serverUrl}/bookmarks.html`,
        "GET",
      );

      if (!response.ok) {
        throw new Error(I18n.t("errors.downloadFailed"));
      }

      // Update the server modification time
      await this.updateServerModificationTime();

      return await response.text();
    } catch (error) {
      throw new Error(I18n.t("errors.downloadFailed") + ": " + error.message);
    }
  }

  async getFileModificationTime() {
    try {
      const response = await this.davFetch(
        `${this.serverUrl}/bookmarks.html`,
        "HEAD",
      );

      if (!response.ok) {
        throw new Error(I18n.t("errors.downloadFailed"));
      }

      const lastModified = response.headers.get("Last-Modified");
      if (lastModified) {
        return Math.round(new Date(lastModified).getTime() / 1000);
      }

      return null;
    } catch (error) {
      throw new Error(I18n.t("errors.downloadFailed") + ": " + error.message);
    }
  }
}

export default WebDAVClient;
