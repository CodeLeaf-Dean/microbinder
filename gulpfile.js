const { series, parallel, src, dest } = require('gulp');
const rollup = require('gulp-rollup');
const terser = require('gulp-terser');
const rename = require('gulp-rename');

function concat() {
  return src('./src2/**/*.js')
    .pipe(rollup({
      input: './src2/mb.debug.js',
      output:{
        format: 'esm'
      }
    }))
    .pipe(dest('dist/'));
};

function minify() {
  return src('./src2/**/*.js')
    .pipe(rollup({
      input: './src2/mb.debug.js',
      output:{
        format: 'esm'
      }
    }))
    .pipe(terser({ mangle: { properties:{regex: /_.*/ }} }))
    .pipe(rename('mb.js'))
    .pipe(dest('dist/'));
};

exports.default = parallel(concat, minify);