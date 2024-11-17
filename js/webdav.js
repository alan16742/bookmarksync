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
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`),
          'Depth': '0'
        }
      });

      // 处理不同的状态码
      if (response.status === 207) {
        return true;
      } else if (response.status === 401) {
        throw new WebDAVError('认证失败，请检查用户名和密码', 'AUTH_ERROR', 401);
      } else {
        throw new WebDAVError('服务器返回意外状态码：' + response.status, 'SERVER_ERROR', response.status);
      }
    } catch (error) {
      if (error instanceof WebDAVError) {
        throw error;
      }
      if (error.name === 'TypeError') {
        throw new WebDAVError('网络连接失败，请检查服务器地址', 'NETWORK_ERROR');
      }
      throw new WebDAVError('连接测试失败：' + error.message, 'UNKNOWN_ERROR');
    }
  }

  async uploadBookmarks(bookmarkData) {
    try {
      const response = await fetch(this.serverUrl + '/bookmarks.json', {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookmarkData)
      });
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
    } catch (error) {
      throw new Error('上传失败：' + error.message);
    }
  }

  async downloadBookmarks() {
    try {
      const response = await fetch(this.serverUrl + '/bookmarks.json', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
        }
      });
      
      if (!response.ok) {
        throw new Error('下载失败');
      }

      return await response.json();
    } catch (error) {
      throw new Error('下载失败：' + error.message);
    }
  }
}

export default WebDAVClient; 