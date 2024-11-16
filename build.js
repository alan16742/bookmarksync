const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const ChromeExtension = require('crx');
const glob = require('glob');

// 将 glob 转换为 Promise
const globPromise = (pattern, options) => {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
};

const crx = new ChromeExtension({
  privateKey: fs.readFileSync('./key.pem')
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

    // 确保 dist 目录存在
    if (!fs.existsSync('./dist')) {
      fs.mkdirSync('./dist');
    }

    // 创建临时目录用于打包
    const tempDir = path.join('./dist', 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir);

    // 复制文件到临时目录
    const filesToInclude = [
      'manifest.json',
      'popup/**/*',
      'js/**/*',
      'icons/**/*'
    ];

    // 复制所需文件
    for (const pattern of filesToInclude) {
      const files = await globPromise(pattern, {
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

      for (const file of files) {
        const dest = path.join(tempDir, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(file, dest);
      }
    }

    // 打包 ZIP
    await buildZip(tempDir, manifestJson.version);
    
    // 打包 CRX
    await buildCrx(tempDir, manifestJson.version);

    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true });

    console.log('打包完成！');

  } catch (err) {
    console.error('打包失败:', err);
    process.exit(1);
  }
}

async function buildZip(sourceDir, version) {
  const output = fs.createWriteStream(`./dist/bookmark-sync-v${version}.zip`);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', () => {
    console.log(`ZIP打包完成！文件大小: ${archive.pointer()} bytes`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(sourceDir, false);
  await archive.finalize();
}

async function buildCrx(sourceDir, version) {
  try {
    const crxBuffer = await crx.load(sourceDir)
      .then(crx => crx.pack());

    const crxPath = `./dist/bookmark-sync-v${version}.crx`;
    fs.writeFileSync(crxPath, crxBuffer);
    console.log(`CRX打包完成！文件保存在: ${crxPath}`);
  } catch (err) {
    console.error('CRX打包失败:', err);
    throw err;
  }
}

build();