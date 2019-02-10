const { src, dest, parallel } = require('gulp');
const concat = require('gulp-concat');
//const replace = require('gulp-replace');
//const uglify = require('gulp-uglify-es').default;
const terser = require('gulp-terser');
//const uglify = require('gulp-uglify');

function js() {
  return src('mb.debug.js', { sourcemaps: false })
    .pipe(concat('mb.js'))
    .pipe(terser({ mangle: { properties:{regex: /_.*/ }} }))
    .pipe(dest('dist/', { sourcemaps: false }))
}

exports.js = js;
exports.default = parallel(js);