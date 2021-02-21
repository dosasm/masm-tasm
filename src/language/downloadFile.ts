//https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
/* eslint-disable */

import * as https from 'https';
import * as fs from 'fs';

function download(url: string, dest: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest, { flags: "wx" });

        const request = https.get(url, response => {
            if (response.statusCode === 200) {
                response.pipe(file);
            } else {
                file.close();
                fs.unlink(dest, () => { }); // Delete temp file
                reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
            }
        });

        request.on("error", err => {
            file.close();
            fs.unlink(dest, () => { }); // Delete temp file
            reject(err.message);
        });

        file.on("finish", () => {
            resolve(true);
        });

        file.on("error", err => {
            file.close();

            if (err.message === "EEXIST") {
                reject(err);
            } else {
                fs.unlink(dest, () => { }); // Delete temp file
                reject(err.message);
            }
        });
    });
}

export async function downloadFromMultiSources(urls: string[], dest: string) {
    const downloaded = fs.existsSync(dest);
    if (downloaded === false) {
        for (const url of urls) {
            const result = await download(url, dest).catch(e => {
                console.log(e);
            });
            if (result) {
                break;
            }
        }
    }

    return fs.existsSync(dest);
}