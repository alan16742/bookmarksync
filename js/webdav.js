import I18n from './i18n.js';

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
        'Authorization': 'Basic ' + btoa(this.username + ':' + this.password),
        ...(options.headers || {}),
      },
    });
  }

  async testConnection() {
    try {
      const response = await this.davFetch(this.serverUrl, 'PROPFIND', {
        headers: { 'Depth': '0' }
      });

      if (response.status === 401) {
        throw new WebDAVError(I18n.t('errors.authFailed'), 'auth', 401);
      }

      return response.ok;
    } catch (error) {
      if (error instanceof WebDAVError) {
        throw error;
      }
      throw new WebDAVError(I18n.t('errors.networkError'), 'network', 0);
    }
  }

  async isDavBookmarksNewer(bookmarkObj) {
    const response = await this.davFetch(`${this.serverUrl}/bookmarks.html`, 'HEAD');
    const davlastModified = Math.round(new Date(response.headers.get('Last-Modified')).getTime()/1000);

    // 遍历书签对象，检查每个书签的 ADD_DATE
    let latestModifiedTime;
    for (const bookmark of Object.values(bookmarkObj)) {
      const addTime = new Date(bookmark.LastModified).getTime();
      if (!latestModifiedTime || addTime > latestModifiedTime) {
        latestModifiedTime = addTime;
      }
    }

    return davlastModified > latestModifiedTime;
  }

  async uploadBookmarks(bookmarkData) {
    try {
      const response = await this.davFetch(`${this.serverUrl}/bookmarks.html`, 'PUT', { body: bookmarkData} );
      
      if (!response.ok) {
        throw new Error(I18n.t('errors.uploadFailed'));
      }
    } catch (error) {
      throw new Error(I18n.t('errors.uploadFailed') + ': ' + error.message);
    }
  }

  async downloadBookmarks() {
    try {
      const response = await this.davFetch(`${this.serverUrl}/bookmarks.html`, 'GET');
      
      if (!response.ok) {
        throw new Error(I18n.t('errors.downloadFailed'));
      }

      return await response.text();
    } catch (error) {
      throw new Error(I18n.t('errors.downloadFailed') + ': ' + error.message);
    }
  }
}

export default WebDAVClient; 