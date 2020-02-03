import gulp from "gulp";
import yargs from "yargs";
import sass from "gulp-sass";
import cleanCSS from "gulp-clean-css";
import gulpif from "gulp-if";
import uglify from "gulp-uglify";
import sourcemaps from "gulp-sourcemaps";
import imagemin from "gulp-imagemin";
import webpack from "webpack-stream";
import named from "vinyl-named";
import browserSync from "browser-sync";
import zip from "gulp-zip";
import replace from "gulp-replace";
import info from "./package.json";

const browserSyncInstance = browserSync.create();
const SERVE_ROOT = "./app";
const PROXY_URL = "http://localhost/";

const PRODUCTION = yargs.argv.prod;

const paths = {
    watch_files: {
        src: "**/*.{html,php,js}"
    },
    styles: {
        src: "app/src/assets/styles/scss/**/*.scss",
        dest_comp: "app/compiled/assets/css/",
        dest_dist: "app/dist/assets/css/"
    },
    scripts: {
        src: "app/src/assets/scripts/js/**/*.js",
        dest_comp: "app/compiled/assets/js/",
        dest_dist: "app/dist/assets/js/"
    },
    images: {
        src: "app/src/assets/images/**/*.{png,jpg,jpeg,svg}",
        dest_comp: "app/compiled/assets/images/",
        dest_dist: "app/dist/assets/images/"
    },
    other: {
        src: [
            "app/src/assets/**/*",
            "!app/src/assets/{styles,scripts,images}",
            "!app/src/assets/{styles,scripts,images}/**/*",
            "!app/compiled/assets/{styles,scripts,images}",
            "!app/compiled/assets/{styles,scripts,images}/**/*"
        ],
        dest_comp: "app/compiled/",
        dest_dist: "app/dist/"
    },
    package: {
        package_name: `${info.name}.7z`,
        src: [
            "**/**",
            "!.vscode",
            "!node_modules{,/**}",
            "!packaged{,/**}",
            "!src{,/**}",
            "!.babelrc",
            "!.gitignore",
            "!git{,/**}",
            "!gulpfile.babel.js",
            "!package.json",
            "!package-lock.json"
        ],
        dest: "packaged"
    }
};

export const serve = done => {
    browserSyncInstance.init({
        // watch: true,
        server: SERVE_ROOT,
        // cannot specify both server and proxy at same time
        // proxy: PROXY_URL,
    });
    done();
};

export const reload = done => {
    browserSyncInstance.reload();
    done();
};

export const styles = () => {
    return gulp
        .src(paths.styles.src)
        .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
        .pipe(sass().on("error", sass.logError))
        .pipe(gulpif(PRODUCTION, cleanCSS({ compatibility: "ie8" })))
        .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
        .pipe(gulp.dest(paths.styles.dest_comp))
        .pipe(gulpif(PRODUCTION, gulp.dest(paths.styles.dest_dist)))
        .pipe(browserSyncInstance.stream());
};

export const scripts = () => {
    return gulp
        .src(paths.scripts.src)
        .pipe(named())
        .pipe(
            webpack({
                module: {},
                output: {
                    filename: "[name].js"
                },
                devtool: !PRODUCTION ? "inline-source-map" : false
            })
        )
        .pipe(gulpif(PRODUCTION, uglify()))
        .pipe(gulp.dest(paths.scripts.dest_comp))
        .pipe(gulpif(PRODUCTION, gulp.dest(paths.scripts.dest_dist)));
};

export const images = () => {
    return gulp
        .src(paths.images.src)
        .pipe(gulpif(PRODUCTION, imagemin()))
        .pipe(gulp.dest(paths.images.dest_comp))
        .pipe(gulpif(PRODUCTION, gulp.dest(paths.images.dest_dist)));
};

export const copy = () => {
    return gulp
        .src(paths.other.src)
        .pipe(gulp.dest(paths.other.dest_comp))
        .pipe(gulpif(PRODUCTION, gulp.dest(paths.other.dest_dist)));
};

function watchFiles() {
    gulp.watch(paths.watch_files.src, reload);
    gulp.watch(paths.styles.src, styles);
    gulp.watch(paths.scripts.src, gulp.series(scripts, reload));
    gulp.watch(paths.images.src, gulp.series(images, reload));
    gulp.watch(paths.other.src, gulp.series(copy, reload));
}

export { watchFiles as watch };

export const compress = () => {
    return gulp
        .src(paths.package.src)
        .pipe(replace("_themename", info.name))
        .pipe(zip(paths.package.package_name))
        .pipe(gulp.dest(paths.package.dest));
};

export const dev = gulp.series(
    gulp.parallel(styles, scripts, images, copy),
    serve,
    watchFiles
);
export const build = gulp.series(gulp.parallel(styles, scripts, images, copy));
export const bundle = gulp.series(build, compress);

export default dev;