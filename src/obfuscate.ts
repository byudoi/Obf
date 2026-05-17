import fs from 'fs';
import tmp from 'tmp';
import { tokenizeLua } from './lua-tokenizer';

export type ObfuscationLevel = 'weak' | 'medium' | 'harder' | 'strong' | 'premium';

const PRESET_MAP: Record<string, ObfuscationLevel> = {
    Weak: 'weak',
    Medium: 'medium',
    Strong: 'strong',
};

const randomVar = (length = 6) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    res += chars.charAt(Math.floor(Math.random() * 52));
    for (let i = 1; i < length; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
};

const minify = (code: string): string => {
    try {
        const tokens = tokenizeLua(code);
        return tokens.map(t => {
            if (t.type === 'comment') return ' ';
            if (t.type === 'whitespace') return ' ';
            return t.value;
        }).join(' ').replace(/\s+/g, ' ');
    } catch (e) {
        return code;
    }
};

const obfuscateLua = (code: string, level: ObfuscationLevel): string => {
    const safeMinified = minify(code);
    const payload = safeMinified;

    const OPS_COUNT = 15;
    const ops = Array.from({length: OPS_COUNT}, (_, i) => i);
    for (let i = ops.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ops[i], ops[j]] = [ops[j], ops[i]];
    }

    const OP_START = ops[0];
    const OP_STRING_BUILD = ops[1];
    const OP_JUNK_1 = ops[2];
    const OP_KEY_ROTATE = ops[3];
    const OP_CHECK = ops[4];
    const OP_END = ops[5];
    const OP_JUMP = ops[6];
    const OP_RESET = ops[7];
    const OP_MATH = ops[8];

    const vmTable = randomVar(8);
    const vmPC = randomVar(4);
    const vmKey = randomVar(4);
    const vmBuffer = randomVar(6);
    const vmRun = randomVar(5);
    const vmInstr = randomVar(5);
    const vOp = randomVar(3);
    const vArg = randomVar(3);
    const vC = randomVar(3);
    const vXor = randomVar(5);

    let bytecode: number[] = [];
    let key = Math.floor(Math.random() * 255);
    const initialKey = key;

    bytecode.push(OP_START);
    bytecode.push(Math.floor(Math.random() * 255));

    for (let i = 0; i < payload.length; i++) {
        const charCode = payload.charCodeAt(i);
        const encChar = charCode ^ key;

        bytecode.push(OP_STRING_BUILD);
        bytecode.push(encChar);

        const rand = Math.random();

        if (rand > 0.6) {
            if (Math.random() > 0.5) {
                bytecode.push(OP_JUNK_1);
                bytecode.push(Math.floor(Math.random() * 255));
            } else {
                bytecode.push(OP_MATH);
                bytecode.push(Math.floor(Math.random() * 255));
            }
        }

        if (rand > 0.8) {
            const rotateVal = Math.floor(Math.random() * 100);
            bytecode.push(OP_KEY_ROTATE);
            bytecode.push(rotateVal);
            key = (key + rotateVal) % 255;
        }

        if (rand > 0.95) {
            bytecode.push(OP_CHECK);
            bytecode.push(0);
        }
    }

    bytecode.push(OP_END);
    bytecode.push(0);

    const bytecodeString = bytecode.map(b => {
        const offset = Math.floor(Math.random() * 50);
        return `(${b - offset} + ${offset})`;
    }).join(',');

    const xorFunc = `
    local function ${vXor}(a, b)
        local p, q = a, b
        local z = 0
        local w = 1
        while p > 0 or q > 0 do
            local ra = p % 2
            local rb = q % 2
            if ra ~= rb then z = z + w end
            p = math.floor(p / 2)
            q = math.floor(q / 2)
            w = w * 2
        end
        return z
    end
    `;

    const dispatcherBlocks = [
        { op: OP_START, code: `` },
        { op: OP_STRING_BUILD, code: `
                local ${vC} = 0
                if bit32 then
                    ${vC} = bit32.bxor(${vArg}, ${vmKey})
                elseif bit then
                    ${vC} = bit.bxor(${vArg}, ${vmKey})
                else
                    ${vC} = ${vXor}(${vArg}, ${vmKey})
                end
                table.insert(${vmBuffer}, string.char(${vC}))
            `.trim() },
        { op: OP_KEY_ROTATE, code: `${vmKey} = (${vmKey} + ${vArg}) % 255` },
        { op: OP_CHECK, code: `local _ = debug and 1 or (function() while true do end end)()` },
        { op: OP_JUNK_1, code: `local _ = ${vArg} * 2` },
        { op: OP_MATH, code: `local _ = math.floor(${vArg} / 2)` },
        { op: OP_END, code: `${vmRun} = nil` },
        { op: OP_JUMP, code: `local _ = ${vArg} % 3` },
        { op: OP_RESET, code: `${vmKey} = ${initialKey}` }
    ];

    for (let i = dispatcherBlocks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dispatcherBlocks[i], dispatcherBlocks[j]] = [dispatcherBlocks[j], dispatcherBlocks[i]];
    }

    let dispatcherStr = '';
    for (let i = 0; i < dispatcherBlocks.length; i++) {
        const block = dispatcherBlocks[i];
        const prefix = i === 0 ? 'if' : 'elseif';
        dispatcherStr += `${prefix} ${vOp} == ${block.op} then\n            ${block.code}\n        `;
    }
    dispatcherStr += `else\n    end`;

    const vPayload = randomVar(5);
    const vLoad = randomVar(5);

    const interpreter = `-- obfuscated by y8y9 obf https://discord.gg/2DQbVrXJ8A
local ${vmTable} = {${bytecodeString}}
local ${vmKey} = ${initialKey}
local ${vmBuffer} = {}
local ${vmPC} = 1
local ${vmRun} = true

${xorFunc}

while ${vmRun} do
    local ${vmInstr} = ${vmTable}[${vmPC}]
    local ${vOp} = ${vmInstr}
    local ${vArg} = ${vmTable}[${vmPC} + 1]
    
    ${dispatcherStr}
    
    ${vmPC} = ${vmPC} + 2
end

local ${vPayload} = table.concat(${vmBuffer})
local ${vLoad} = loadstring(${vPayload}) or load(${vPayload})
${vLoad}()`;

    return interpreter;
};

export default async function obfuscate(inputFile: string, preset: string): Promise<tmp.SynchrounousResult> {
    const level = PRESET_MAP[preset] || 'weak';
    const code = fs.readFileSync(inputFile, 'utf8');
    const obfuscated = obfuscateLua(code, level);
    const outFile = tmp.fileSync({ postfix: '.lua' });
    fs.writeFileSync(outFile.name, obfuscated, 'utf8');
    return outFile;
}
