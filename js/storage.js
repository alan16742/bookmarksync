class SecureStorage {
  static async saveCredentials(serverUrl, username, password) {
    await chrome.storage.sync.set({
      'webdav_server': serverUrl,
      'webdav_username': username,
      'webdav_password': btoa(password) // 简单加密
    });
  }

  static async getCredentials() {
    const data = await chrome.storage.sync.get([
      'webdav_server',
      'webdav_username',
      'webdav_password'
    ]);
    
    return {
      serverUrl: data.webdav_server || '',
      username: data.webdav_username || '',
      password: data.webdav_password ? atob(data.webdav_password) : ''
    };
  }
}

export default SecureStorage; 