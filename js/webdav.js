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
  constructor(serverUrl, username, password) {
    this.serverUrl = serverUrl;
    this.username = username;
    this.password = password;
  }

  async testConnection() {
    try {
      const response = await fetch(this.serverUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': 'Basic ' + btoa(this.username + ':' + this.password),
          'Depth': '0'
        }
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

  async uploadBookmarks(bookmarkData) {
    try {
      const response = await fetch(this.serverUrl + '/bookmarks.html', {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
        },
        body: bookmarkData
      });
      
      if (!response.ok) {
        throw new Error(I18n.t('errors.uploadFailed'));
      }
    } catch (error) {
      throw new Error(I18n.t('errors.uploadFailed') + ': ' + error.message);
    }
  }

  async downloadBookmarks() {
    try {
      const response = await fetch(this.serverUrl + '/bookmarks.html', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(this.username + ':' + this.password)
        }
      });
      
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