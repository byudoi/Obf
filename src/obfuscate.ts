import { exec } from 'child_process';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs';

// Paths relativos al root del repo
const PROMETHEUS_BIN = path.join(__dirname, '..', 'bin', 'luajit.exe');
const PROMETHEUS_CLI = path.join(__dirname, '..', 'lua', 'cli.lua');
const HERCULES_CLI = path.join(__dirname, '..', 'hercules', 'hercules.lua');

const PRESET_MAP: Record<string, string> = {
    Weak: 'Weak',
    Medium: 'Medium',
    Strong: 'Strong',
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
    const prometheusPreset = PRESET_MAP[preset] || 'Weak';

    // --- Paso 1: Prometheus ---
    const prometheusOut = tmp.fileSync({ postfix: '.lua' });

    await runCommand(
        `"${PROMETHEUS_BIN}" "${PROMETHEUS_CLI}" --preset ${prometheusPreset} --out "${prometheusOut.name}" "${inputFile}"`
    );

    if (!fs.existsSync(prometheusOut.name) || fs.readFileSync(prometheusOut.name).length === 0) {
        throw new Error('Prometheus obfuscation failed or produced empty output.');
    }

    // --- Paso 2: Hercules sobre el output de Prometheus ---
    const herculesOut = tmp.fileSync({ postfix: '.lua' });

    // Hercules escribe en input_obfuscated.lua, así que usamos --overwrite y copiamos después
    const herculesInput = tmp.fileSync({ postfix: '.lua' });
    fs.copyFileSync(prometheusOut.name, herculesInput.name);

    await runCommand(
        `lua "${HERCULES_CLI}" "${herculesInput.name}" --max --overwrite`
    );

    if (!fs.existsSync(herculesInput.name) || fs.readFileSync(herculesInput.name).length === 0) {
        throw new Error('Hercules obfuscation failed or produced empty output.');
    }

    fs.copyFileSync(herculesInput.name, herculesOut.name);

    // Cleanup intermedios
    prometheusOut.removeCallback();
    herculesInput.removeCallback();

    return herculesOut;
}
