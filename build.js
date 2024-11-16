const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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

    // 确保 dist 目录存在
    if (!fs.existsSync('./dist')) {
      fs.mkdirSync('./dist');
    }

    // 创建 zip 文件流
    const output = fs.createWriteStream(`./dist/bookmark-sync-v${manifestJson.version}.zip`);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    // 监听打包完成事件
    output.on('close', () => {
      console.log(`打包完成！文件大小: ${archive.pointer()} bytes`);
      console.log(`文件保存在: ./dist/bookmark-sync-v${manifestJson.version}.zip`);
    });

    // 监听错误
    archive.on('error', (err) => {
      throw err;
    });

    // 将输出流连接到压缩器
    archive.pipe(output);

    // 添加文件到压缩包
    const filesToInclude = [
      'manifest.json',
      'popup/**/*',
      'js/**/*',
      'icons/**/*'
    ];

    // 添加所有需要的文件
    for (const pattern of filesToInclude) {
      archive.glob(pattern, {
        ignore: [
          '**/*.map',        // 忽略 source map 文件
          '**/node_modules/**', // 忽略 node_modules
          '**/.git/**',      // 忽略 git 文件
          '**/dist/**',      // 忽略 dist 目录
          '**/*.crx',        // 忽略 crx 文件
          '**/*.pem',        // 忽略密钥文件
          '**/build.js',     // 忽略构建脚本
          '**/package.json', // 忽略 package.json
          '**/package-lock.json' // 忽略 package-lock.json
        ]
      });
    }

    // 完成打包
    await archive.finalize();

  } catch (err) {
    console.error('打包失败:', err);
    process.exit(1);
  }
}

build();