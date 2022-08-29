var gulp = require('gulp');
var minify = require('gulp-minify');
var sourcemaps = require('gulp-sourcemaps');
var strip = require('gulp-strip-comments');
var beautify = require('gulp-beautify');

gulp.task('create-dist', function () {
  return gulp.src('src/elmahio.js')
    .pipe(sourcemaps.init())
    .pipe(strip({ safe: true }))
    .pipe(beautify({ indent_size: 2, preserve_newlines: false }))
    .pipe(minify({ ext: { min: '.min.js' }, preserveComments: 'some' }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'))
});

gulp.task('build', gulp.parallel(['create-dist']));
