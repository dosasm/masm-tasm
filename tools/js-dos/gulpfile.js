const gulp = require('gulp');
const replace = require('gulp-replace');

//copy jsdos
const copyJsdos = function () {
	const sourceMap = '# sourceMappingURL='
	return gulp.src(
		[
			'node_modules/js-dos/dist/js-dos.js',
		])
		.pipe(replace(sourceMap, sourceMap + 'https://js-dos.com/6.22/current/'))
		.pipe(gulp.dest('out/'));
}
//copy wdosbox
const copywDosbox = function () {
	return gulp.src(
		[
			'node_modules/js-dos/dist/wdosbox.js',
			'node_modules/js-dos/dist/wdosbox.wasm.js',
		])
		.pipe(gulp.dest('out/'));
};

gulp.task('default', gulp.parallel(copyJsdos, copywDosbox));