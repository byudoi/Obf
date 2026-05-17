import { exec } from 'child_process';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs';

const HERCULES_DIR = path.join(process.cwd(), 'hercules');
const HERCULES_CLI = path.join(HERCULES_DIR, 'hercules.lua');

const PRESET_MAP: Record<string, string> = {
    Weak: '--min',
    Medium: '--mid',
    Strong: '--max',
};

function runCommand(cmd: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve();
            }
        });
    });
}

export default async function obfuscate(inputFile: string, preset: string): Promise<tmp.SynchrounousResult> {
    const herculesPreset = PRESET_MAP[preset] || '--min';

    const outFile = tmp.fileSync({ postfix: '.lua' });
    fs.copyFileSync(inputFile, outFile.name);

    // cd al directorio de hercules para que encuentre pipeline.lua y módulos
    await runCommand(
        `cd "${HERCULES_DIR}" && lua "hercules.lua" "${outFile.name}" ${herculesPreset} --overwrite`
    );

    if (!fs.existsSync(outFile.name) || fs.readFileSync(outFile.name).length === 0) {
        throw new Error('Obfuscation failed or produced empty output.');
    }

    return outFile;
}
