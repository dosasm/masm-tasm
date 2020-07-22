import fs = require('fs');
import download = require('download');

(async () => {
    await download('http://file.cdn.cqttech.com/file/ChromeCore_1220_3.0.1.6.exe', 'dist');
 
    // fs.writeFileSync('dist/foo.jpg', await download('http://unicorn.com/foo.jpg'));
 
    // download('unicorn.com/foo.jpg').pipe(fs.createWriteStream('dist/foo.jpg'));
 
    // await Promise.all([
    //     'unicorn.com/foo.jpg',
    //     'cats.com/dancing.gif'
    // ].map(url => download(url, 'dist')));
})();