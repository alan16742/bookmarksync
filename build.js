const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const glob = require('glob');

const globPromise = (pattern, options) => {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
};

async function build() {
  try {
    console.log('开始打包扩展...');
    const packageJson = require('./package.json');
    const manifestJson = require('./manifest.json');
    
    // 确保版本号一致
    if (packageJson.version !== manifestJson.version) {
      manifestJson.version = packageJson.version;
      fs.writeFileSync('./manifest.json', JSON.stringify(manifestJson, null, 2));
      console.log(`已更新 manifest.json 版本号为 ${packageJson.version}`);
    }

    // 确保 dist 目录存在
    if (!fs.existsSync('./dist')) {
      fs.mkdirSync('./dist');
    }

    // 创建临时目录
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
          '**/*.map',
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/*.crx',
          '**/*.pem',
          '**/build.js',
          '**/package.json',
          '**/package-lock.json'
        ]
      });

      for (const file of files) {
        const dest = path.join(tempDir, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(file, dest);
      }
    }

    // 打包 ZIP
    await buildZip(tempDir, packageJson.version);

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

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`ZIP打包完成！文件大小: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

build();