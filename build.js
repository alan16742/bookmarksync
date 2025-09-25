const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const glob = require("glob");

// 添加调试日志
const debug = (...args) => console.log("[DEBUG]", ...args);

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
    console.log("开始打包扩展...");

    // 检查密钥文件是否存在
    const keyPath = "./key.pem";
    if (!fs.existsSync(keyPath)) {
      console.error("错误: key.pem 文件不存在，请先生成密钥文件");
      process.exit(1);
    }

    // 读取密钥文件
    const keyContent = fs.readFileSync(keyPath, "utf8");
    debug("已读取密钥文件");

    // 读取并更新 manifest.json
    const manifestPath = "./manifest.json";
    if (!fs.existsSync(manifestPath)) {
      throw new Error("manifest.json 文件不存在");
    }

    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const version = manifestJson.version;
    debug("当前版本:", version);

    // 更新 package.json 和 package-lock.json 的版本号
    await updatePackageVersions(version);

    // 添加 key 字段到 manifest
    manifestJson.key = keyContent
      .replace(/-----BEGIN PRIVATE KEY-----\n/, "")
      .replace(/\n-----END PRIVATE KEY-----\n/, "")
      .replace(/\n/g, "");

    // 确保 dist 目录存在
    const distDir = path.resolve("./dist");
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // 创建临时目录
    const tempDir = path.join(distDir, "temp");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    debug("创建临时目录:", tempDir);

    // 复制文件到临时目录
    const filesToInclude = [
      "manifest.json",
      "popup/**/*",
      "js/**/*",
      "icons/**/*",
      "_locales/**/*",
      "background.js",
    ];

    // 复制所需文件
    for (const pattern of filesToInclude) {
      debug("处理文件模式:", pattern);
      const files = await globPromise(pattern, {
        ignore: [
          "**/*.map",
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/*.crx",
          "**/build.js",
          "**/package*.json",
          "**/*.md",
          "**/test/**",
          "**/.DS_Store",
        ],
        nodir: true, // 只匹配文件，不匹配目录
      });

      debug("找到文件:", files);

      for (const file of files) {
        const dest = path.join(tempDir, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(file, dest);
        debug("复制文件:", file, "->", dest);
      }
    }

    // 写入更新后的 manifest.json 到临时目录
    const tempManifestPath = path.join(tempDir, "manifest.json");
    fs.writeFileSync(tempManifestPath, JSON.stringify(manifestJson, null, 2));
    debug("写入更新后的 manifest.json");

    // 打包 ZIP
    const zipPath = path.join(distDir, `bookmark-sync-v${version}.zip`);
    await buildZip(tempDir, zipPath);
    debug("创建ZIP文件:", zipPath);

    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true });
    debug("清理临时目录");

    console.log(`打包完成: ${zipPath}`);
  } catch (error) {
    console.error("打包失败:", error);
    process.exit(1);
  }
}

async function buildZip(sourceDir, outputPath) {
  debug("开始创建 ZIP:", sourceDir, "->", outputPath);

  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      console.log(`ZIP打包完成！文件大小: ${archive.pointer()} bytes`);
      resolve();
    });

    output.on("error", (err) => {
      reject(err);
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("ZIP警告:", err);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// 改进生成密钥的函数
async function generateKey() {
  const { promisify } = require("util");
  const execAsync = promisify(require("child_process").exec);
  const keyPath = "./key.pem";

  if (fs.existsSync(keyPath)) {
    console.log("密钥文件已存在，跳过生成");
    return;
  }

  try {
    console.log("正在生成新的密钥文件...");
    await execAsync("openssl genrsa -out key.pem 2048");
    console.log("密钥文件生成成功");
  } catch (error) {
    console.error("生成密钥失败:", error);
    process.exit(1);
  }
}

// 添加更新包版本的函数
async function updatePackageVersions(version) {
  // 更新 package.json
  const packagePath = "./package.json";
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    packageJson.version = version;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
    debug(`已更新 package.json 版本号为 ${version}`);
  }

  // 更新 package-lock.json
  const packageLockPath = "./package-lock.json";
  if (fs.existsSync(packageLockPath)) {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
    packageLock.version = version;
    packageLock.packages[""].version = version;

    // 更新依赖包的版本号
    if (packageLock.dependencies?.["webdav-bookmark-sync"]) {
      packageLock.dependencies["webdav-bookmark-sync"].version = version;
    }

    fs.writeFileSync(
      packageLockPath,
      JSON.stringify(packageLock, null, 2) + "\n",
    );
    debug(`已更新 package-lock.json 版本号为 ${version}`);
  }
}

// 导出函数供 npm 脚本使用
module.exports = {
  build,
  generateKey,
  updatePackageVersions,
};

// 直接执行 build
if (require.main === module) {
  build().catch((err) => {
    console.error("打包失败:", err);
    process.exit(1);
  });
}
