var gulp = require('gulp');
var minify = require('gulp-minify');
var sourcemaps = require('gulp-sourcemaps');
var strip = require('gulp-strip-comments');
var beautify = require('gulp-beautify');

gulp.task('source', function(){
  return gulp.src('src/elmahio.js')
    .pipe(strip({ safe: true }))
    .pipe(beautify({ indent_size: 2, preserve_newlines: false }))
    .pipe(gulp.dest('dist'))
});

gulp.task('source-map', function(){
  return gulp.src('src/elmahio.js')
    .pipe(sourcemaps.init())
    .pipe(strip({ safe: true }))
    .pipe(beautify({ indent_size: 2, preserve_newlines: false }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'))
});

gulp.task('minify', function () {
  return gulp.src('src/elmahio.js')
    .pipe(minify({ ext: { min: '.min.js' }, preserveComments: 'some' }))
    .pipe(gulp.dest('dist'))
});

gulp.task('minify-map', function () {
  return gulp.src('src/elmahio.js')
    .pipe(sourcemaps.init())
    .pipe(minify({ ext: { min: '.min.js' }, preserveComments: 'some' }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'))
});

gulp.task('default', ['source', 'source-map', 'minify', 'minify-map']);
