const gulp = require('gulp');
//copy files from jsdos
const copyJsdos = function () {
	return gulp.src(
		[
			'node_modules/js-dos/dist/wdosbox.js',
			'node_modules/js-dos/dist/wdosbox.wasm.js',
            'node_modules/js-dos/dist/js-dos.js',
            'extJs-dos.css'
		]
	).pipe(gulp.dest('resources/'));
};

gulp.task('default', copyJsdos);