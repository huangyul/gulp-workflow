const { src, dest, parallel, series, watch } = require('gulp')

const sass = require('gulp-sass')(require('sass'))
const babel = require('gulp-babel')
const swig = require('gulp-swig')
const imagemin = require('gulp-imagemin')
const del = require('del')
const useRef = require('gulp-useref')
const browserSync = require('browser-sync')
const gulpIf = require('gulp-if')
const htmlmin = require('gulp-htmlmin')
const cssmin = require('gulp-clean-css')
const jsmin = require('gulp-uglify')


const bs = browserSync.create()

// 读取配置文件
const cwd = process.cwd()
let config = {
  // default config
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      style: 'assets/style/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}
try {
  const res = require(`${cwd}/workflow.config.js`)
  config = Object.assign({}, config, res)
} catch (e) {

}


// 清空
const clean = () => {
  return del([config.build.dist, config.build.temp])
}


// 样式文件处理
function style() {
  return src(`${config.build.src}/${config.build.paths.style}`, { base: config.build.src })
    .pipe(sass({ outputStyle: "expanded" }))
    .pipe(dest(config.build.temp))
}

// 脚本文件处理
function scripts() {
  return src(`${config.build.src}/${config.build.paths.scripts}`, { base: config.build.src })
    // .pipe(babel({ presets: ['@babel/preset-env'] }))
    .pipe(babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
}

// 模板文件
const page = () => {
  return src(`${config.build.src}/${config.build.paths.pages}`, { base: config.build.src })
    .pipe(swig({ data: config.data }))
    .pipe(dest(config.build.temp))
}

// 图片
const image = () => {
  return src(`${config.build.src}/${config.build.paths.images}`, { base: config.build.src })
    .pipe(imagemin())
    .pipe(dest(config.build.dist))
}

// 字体
const font = () => {
  return src(`${config.build.src}/${config.build.paths.fonts}`, { base: config.build.src })
    .pipe(imagemin())
    .pipe(dest(config.build.dist))
}

// public文件夹下的
const extra = () => {
  return src('**', { base: config.build.public })
    .pipe(dest(config.build.dist))
}

// 开发服务器
const serve = () => {
  // 监听文件变化，执行重新打包
  watch(`${config.build.src}/${config.build.paths.style}`, style)
  watch(`${config.build.src}/${config.build.paths.scripts}`, scripts)
  watch(`${config.build.src}/${config.build.paths.pages}`, page)
  // 这类文件不需要，因为会降低构建效率
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)

  bs.init({
    port: 3000,
    notify: false,
    // open: false,
    files: `${config.build.temp}/**`, // 监听哪些路径的文件
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 处理html文件中的链接
const useref = () => {
  return src(`${config.build.temp}/${config.build.paths.pages}`, { base: config.build.temp })
    .pipe(useRef({ searchPath: [config.build.temp, '.'] }))
    // 压缩html，js，css
    .pipe(gulpIf(/\.js$/, jsmin()))
    .pipe(gulpIf(/\.css$/, cssmin()))
    .pipe(gulpIf(/\.html$/, htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}

// 编译
const compile = parallel(style, scripts, page)

// 打包
const build = series(
  clean,
  parallel(
    series(compile, useref), image, font, extra),
  useref)

// 开发
const develop = series(compile, serve)

module.exports = {
  compile,
  build,
  develop,
  clean,
}
