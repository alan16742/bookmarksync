class SecureStorage {
  // 生成加密密钥
  static async generateKey() {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebDAV-Bookmark-Sync'), // 使用固定的密钥材料
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return { key, salt };
  }

  // 加密数据
  static async encrypt(data) {
    try {
      const { key, salt } = await this.generateKey();
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encoder.encode(data)
      );

      // 将加密后的数据、IV和salt打包在一起
      const encryptedArray = new Uint8Array(encryptedData);
      const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

      // 转换为Base64以便存储
      return btoa(String.fromCharCode.apply(null, combined));
    } catch (error) {
      console.error('加密失败:', error);
      throw new Error('加密失败');
    }
  }

  // 解密数据
  static async decrypt(encryptedData) {
    try {
      // 将Base64转换回二进制数据
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // 提取salt、IV和加密数据
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);

      // 重新生成密钥
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode('WebDAV-Bookmark-Sync'),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // 解密数据
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        data
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error('解密失败');
    }
  }

  static async saveCredentials(serverUrl, username, password) {
    if (!serverUrl || !username || !password) {
      throw new Error('所有字段都必须填写');
    }

    if (!this.validatePassword(password)) {
      throw new Error('密码长度至少需要8个字符');
    }

    const encryptedPassword = await this.encrypt(password);
    
    // 存储凭证
    await chrome.storage.sync.set({
      'webdav_server': serverUrl,
      'webdav_username': username,
      'webdav_password': encryptedPassword
    });
  }

  static validatePassword(password) {
    // 简单的密码验证，只检查长度
    const minLength = 8;
    
    if (password.length < minLength) {
      throw new Error('密码长度至少需要8个字符');
    }

    return true;
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
      password: data.webdav_password ? await this.decrypt(data.webdav_password) : ''
    };
  }

  static async clearBookmarksChangedFlag() {
    await chrome.storage.local.set({ bookmarksChanged: false });
    // 清除徽章
    await chrome.action.setBadgeText({ text: "" });
  }

  static async hasBookmarksChanged() {
    const data = await chrome.storage.local.get(['bookmarksChanged']);
    return data.bookmarksChanged === true;
  }

  // 建议添加版本控制机制
  static VERSION = '1.0';

  // 建议添加数据迁移机制
  static async migrateIfNeeded() {
    const version = await chrome.storage.local.get(['version']);
    if (version !== this.VERSION) {
      // 执行迁移
    }
  }

  // 建议添加数据验证
  static validateServerUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      throw new Error('无效的服务器地址');
    }
  }

  // 使用随机生成的密钥材料
  static async generateKeyMaterial() {
    return crypto.getRandomValues(new Uint8Array(32));
  }
}

export default SecureStorage; 