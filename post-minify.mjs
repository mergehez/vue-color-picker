import * as fs from "node:fs";
import path from "node:path";
import { readFile, unlink } from 'fs/promises';
import {gzip} from "node:zlib";
import esbuild from "esbuild";
import {writeFile} from "node:fs/promises";

const jsFiles = fs.readdirSync("dist")
    .filter((file) => file.endsWith(".js") || file.endsWith(".css") || file.endsWith(".html"))
    .map((file) => `dist/${file}`)

jsFiles.sort((a, b) => {
    if(a.endsWith('.css')) return -1;
    if(b.endsWith('.css')) return 1;
    return fs.statSync(a).size - fs.statSync(b).size;
})

let maxLen = 0;
for (const path of jsFiles) {
    if (path.length > maxLen) {
        maxLen = path.length;
    }
}
async function compressContent(content) {
    return new Promise((resolve, reject) => {
        gzip(content, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}
export const compressor = options => ({
    name: 'compressor-plugin',
    setup(build) {
        build.initialOptions.metafile = true;
        build.onEnd(async result => {
            const outputs = result.metafile.outputs;
            const outputExt = '.gz';
            const outdir = options?.outdir || build.initialOptions.outdir || 'dist';
            const filesTypes = options?.fileTypes || ['js', 'css', 'html'];

            for (const filePath in outputs) {
                const fileType = filePath.substring(filePath.lastIndexOf('.') + 1);
                if (filesTypes.includes(fileType)) {
                    const fileName = filePath.split('/').at(-1);
                    const content = await readFile(filePath, 'utf8');
                    const compressedContent = await compressContent(content, outputExt);
                    const compressedFileName = `${fileName}${outputExt}`;
                    const compressedFilePath = path.join(outdir, compressedFileName);

                    await writeFile(compressedFilePath, compressedContent);

                    if (options?.deleteOrigin) {
                        await unlink(filePath);
                    }
                }
            }
        });
    },
});

function byteToSize(bytes) {
    if(bytes < 1024) return `${bytes} bytes`;
    const kb = bytes / 1024;
    if(kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${( kb / 1024).toFixed(2)} MB`;
}
const results = Object.fromEntries(jsFiles.map((path) => [path, {size:byteToSize(fs.statSync(path).size), sizeMin: 0, sizeGzip: 0}]));
function minify(path, index) {
    esbuild.build({
        entryPoints: [path],
        minify: true,
        outfile: path,
        allowOverwrite: true,
        plugins: [compressor()]
    }).then(() => {
        const size = byteToSize(fs.statSync(path).size);
        const sizeGzip = byteToSize(fs.statSync(path+'.gz').size);
        results[path].sizeMin = size;
        results[path].sizeGzip = sizeGzip;

        if (index + 1 < jsFiles.length) {
            minify(jsFiles[index + 1], index + 1);
        }else{
            const sizePad = Object.values(results).map(t => t.size).reduce((a, b) => a.length > b.length ? a : b, '').length;
            const sizeMinPad = Object.values(results).map(t => t.sizeMin).reduce((a, b) => a.length > b.length ? a : b, '').length;
            const sizeGzipPad = Object.values(results).map(t => t.sizeGzip).reduce((a, b) => a.length > b.length ? a : b, '').length;
            for (const k in results) {
                const result = results[k];
                console.log(`${k.padEnd(maxLen)}: ${result.size.padEnd(sizePad+1)} ->  ${result.sizeMin.padEnd(sizeMinPad+1)} ->  ${result.sizeGzip.padEnd(sizeGzipPad+1)}`);
            }
        }
    }).catch((e) => {
        console.error(`Failed to minify ${path}`);
        console.error(e);
    })
}

minify(jsFiles[0], 0)
