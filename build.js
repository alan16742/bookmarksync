const fs = require('fs');
const path = require('path');
const ChromeExtension = require('crx');
 
// 创建新的 .pem 密钥（如果不存在）
if (!fs.existsSync('key.pem')) {
  console.log('生成新的密钥文件...');
  const { generateKeyPairSync } = require('crypto');
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  fs.writeFileSync('key.pem', privateKey);
}

const crx = new ChromeExtension({
  privateKey: fs.readFileSync('key.pem')
});

async function build() {
  try {
    console.log('开始打包扩展...');
    const packageJson = require('./package.json');
    const manifestJson = require('./manifest.json');
    
    // 确保版本号一致
    if (packageJson.version !== manifestJson.version) {
      manifestJson.version = packageJson.version;
      fs.writeFileSync('./manifest.json', JSON.stringify(manifestJson, null, 2));
    }

    // 打包扩展
    const crxBuffer = await crx.load(path.resolve(__dirname))
      .then(crx => crx.pack());

    // 保存 .crx 文件
    const outputPath = `./dist/bookmark-sync-v${manifestJson.version}.crx`;
    
    // 确保 dist 目录存在
    if (!fs.existsSync('./dist')) {
      fs.mkdirSync('./dist');
    }
    
    fs.writeFileSync(outputPath, crxBuffer);
    console.log(`打包完成！文件保存在: ${outputPath}`);
  } catch (err) {
    console.error('打包失败:', err);
    process.exit(1);
  }
}

build();