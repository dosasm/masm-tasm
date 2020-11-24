//clean files
const del = require('del');
const cleanTask = function () {
	return del(['out/**', 'dist/**', 'package.nls.*.json', 'masm-tasm*.vsix']);
};

//build nls
const gulp = require('gulp');
const filter = require('gulp-filter');
const ts = require('gulp-typescript');
const typescript = require('typescript');
const sourcemaps = require('gulp-sourcemaps');
const nls = require('vscode-nls-dev');
const tsProject = ts.createProject('./tsconfig.json', { typescript });
const languages = [
	{ id: "zh-cn", folderName: "chs", transifexId: "zh-hans" }];
const generateAdditionalLocFiles = () => {
	return gulp.src(['package.nls.json'])
		.pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
		.pipe(gulp.dest('.'));
};
// Generates ./dist/nls.bundle.<language_id>.json from files in ./i18n/** *//<src_path>/<filename>.i18n.json
// Localized strings are read from these files at runtime.
const generateSrcLocBundle = () => {
	// Transpile the TS to JS, and let vscode-nls-dev scan the files for calls to localize.
	return tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		.pipe(nls.createMetaDataFiles())
		.pipe(nls.createAdditionalLanguageFiles(languages, "i18n"))
		.pipe(nls.bundleMetaDataFiles('xsro.masm-tasm', 'dist'))
		.pipe(nls.bundleLanguageFiles())
		.pipe(filter(['**/nls.bundle.*.json', '**/nls.metadata.header.json', '**/nls.metadata.json']))
		.pipe(gulp.dest('dist'));
};
//package and publish
const fs = require('fs');
const vsce = require('vsce');
function getOption(date) {
	const packageJson = fs.readFileSync('./package.json', { encoding: 'utf-8' });
	const version = JSON.parse(packageJson).version;
	let ver = "main"
	if (typeof (version) === 'string') {
		if (version.match(/^\d+\.\d+\.\d+$/)) {
			ver = 'v' + version;
		}
	}
	let opt = {
		baseContentUrl: `https://github.com/xsro/masm-tasm/blob/${ver}/`,
		baseImagesUrl: `https://github.com/xsro/masm-tasm/raw/main/`
	};
	if (date) {
		let date = new Date();
		let month = date.getMonth();
		let day = date.getDate();
		let hour = date.getHours();
		let minute = date.getMinutes();
		let second = date.getSeconds();
		hour = hour > 9 ? hour : `0${hour}`
		minute = minute > 9 ? minute : `0${minute}`
		second = second > 9 ? second : `0${second}`
		opt.packagePath = `masm-tasm_${version}_${month}-${day}_${hour}${minute}${second}.vsix`; //获取日期与时间
	}
	return opt;
}

const vscePublishTask = function () {
	return vsce.publish(getOption());
};
const vscePackageTask = function () {

	return vsce.createVSIX(getOption(true));
};

gulp.task('clean', cleanTask);
gulp.task('translations-generate', gulp.series(generateSrcLocBundle, generateAdditionalLocFiles));

gulp.task('publish', gulp.series(vscePublishTask));

gulp.task('package', gulp.series(vscePackageTask));
