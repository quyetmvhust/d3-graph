const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const browserSync = require('browser-sync').create();

//compile scss into css
function style() {
    //1.where is my scss
    return gulp.src('assets/scss/*.scss') //gets all files ending with .scss in src/scss
    //2. pass that file through sass compiler
    .pipe(sass().on('error',sass.logError))
    //3. where do I save the compiled css file
    .pipe(gulp.dest('assets/css'))
    //4. stream change to all browsers
    .pipe(browserSync.stream());
}

function watch() {
    browserSync.init({
        server: {
            baseDir: ".",
            index: "index.html"
        }
    });
    gulp.watch('assets/scss/*.scss', style);
    gulp.watch('./*.html').on('change',browserSync.reload);
    gulp.watch('./**/*.html').on('change',browserSync.reload);
    gulp.watch('./**/**/*.html').on('change',browserSync.reload);
    gulp.watch('assets/js/*.js').on('change', browserSync.reload);
}

exports.style = style;
exports.watch = watch;