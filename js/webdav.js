class WebDAVClient {
  constructor(serverUrl, username, password) {
    this.serverUrl = serverUrl;
    this.username = username;
    this.password = password;
  }

  async testConnection() {
    try {
      if (!this.serverUrl || this.serverUrl.trim() === '') {
        throw new Error('服务器地址不能为空');
      }

      const response = await fetch(this.serverUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`),
          'Depth': '0'
        }
      });
      return response.ok;
    } catch (error) {
      throw new Error('连接测试失败：' + error.message);
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
      throw new Error('上传书签失败：' + error.message);
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
      throw new Error('下载书签失败：' + error.message);
    }
  }
}

export default WebDAVClient; 