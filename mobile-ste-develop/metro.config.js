/* eslint-env node */
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config")
const fs = require("fs")
const path = require("path")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

config.transformer.getTransformOptions = async () => ({
  transform: {
    // Inline requires are very useful for deferring loading of large dependencies/components.
    // For example, we use it in app.tsx to conditionally load Reactotron.
    // However, this comes with some gotchas.
    // Read more here: https://reactnative.dev/docs/optimizing-javascript-loading
    // And here: https://github.com/expo/expo/issues/27279#issuecomment-1971610698
    inlineRequires: true,
  },
})

// This is a temporary fix that helps fixing an issue with axios/apisauce.
// See the following issues in Github for more details:
// https://github.com/infinitered/apisauce/issues/331
// https://github.com/axios/axios/issues/6899
// The solution was taken from the following issue:
// https://github.com/facebook/metro/issues/1272
config.resolver.unstable_conditionNames = ["require", "default", "browser"]

// This helps support certain popular third-party libraries
// such as Firebase that use the extension cjs.
config.resolver.sourceExts.push("cjs")

const publicDir = path.join(__dirname, "public")

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const urlPath = req?.url?.split("?")[0] ?? ""

      // Serve static ScratchJr assets during development from /public/ScratchJr
      // Handle both /scratchjr and /ScratchJr paths (case-insensitive)
      if (urlPath.toLowerCase().startsWith("/scratchjr")) {
        // Map /scratchjr to /ScratchJr (actual directory name)
        const correctedPath = urlPath.replace(/^\/scratchjr/i, "/ScratchJr")
        const normalizedPath = path.normalize(path.join(publicDir, correctedPath))
        const safePath = normalizedPath.startsWith(publicDir) ? normalizedPath : null

        if (safePath) {
          const isDir = fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()
          const finalPath = isDir ? path.join(safePath, "index.html") : safePath

          if (fs.existsSync(finalPath) && fs.statSync(finalPath).isFile()) {
            const stream = fs.createReadStream(finalPath)
            res.setHeader("Content-Type", getMimeType(finalPath))
            stream.pipe(res)
            stream.on("error", next)
            return
          }
        }
      }

      return middleware(req, res, next)
    }
  },
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  switch (ext) {
    case ".html":
      return "text/html"
    case ".js":
      return "application/javascript"
    case ".css":
      return "text/css"
    case ".json":
      return "application/json"
    case ".svg":
      return "image/svg+xml"
    case ".png":
      return "image/png"
    case ".mp3":
      return "audio/mpeg"
    case ".wav":
      return "audio/wav"
    case ".map":
      return "application/json"
    default:
      return "application/octet-stream"
  }
}

module.exports = config
