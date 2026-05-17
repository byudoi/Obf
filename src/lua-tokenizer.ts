export type TokenType = 'code' | 'string' | 'comment' | 'whitespace';

export interface Token {
    type: TokenType;
    value: string;
}

export function tokenizeLua(code: string): Token[] {
    const tokens: Token[] = [];
    let current = 0;
    
    while (current < code.length) {
        const char = code[current];
        
        if (char === '-' && code[current + 1] === '-') {
            const start = current;
            let isBlock = false;
            let level = 0;
            let contentStart = current + 2;
            
            if (code[contentStart] === '[') {
                isBlock = true;
                level = 0;
                contentStart++;
            } else if (code[contentStart] === '=') {
                let check = contentStart;
                while (check < code.length && code[check] === '=') { check++; }
                if (code[check] === '[') {
                    isBlock = true;
                    level = check - contentStart;
                    contentStart = check + 1;
                }
            }
            
            if (isBlock) {
                const closePattern = ']' + '='.repeat(level) + ']';
                const closeIndex = code.indexOf(closePattern, contentStart);
                if (closeIndex !== -1) {
                    current = closeIndex + closePattern.length;
                } else {
                    current = code.length;
                }
            } else {
                const newlineIndex = code.indexOf('\n', current);
                if (newlineIndex !== -1) {
                    current = newlineIndex;
                } else {
                    current = code.length;
                }
            }
            tokens.push({ type: 'comment', value: code.slice(start, current) });
            continue;
        }
        
        if (char === '"' || char === "'") {
            const start = current;
            const quote = char;
            current++;
            while (current < code.length) {
                if (code[current] === quote) {
                    let backslashCount = 0;
                    let i = current - 1;
                    while (i >= start && code[i] === '\\') { backslashCount++; i--; }
                    if (backslashCount % 2 === 0) { current++; break; }
                }
                current++;
            }
            tokens.push({ type: 'string', value: code.slice(start, current) });
            continue;
        }
        
        if (char === '[') {
            let isLongString = false;
            let level = 0;
            let contentStart = current + 1;
            if (code[contentStart] === '[') {
                isLongString = true; level = 0; contentStart++;
            } else if (code[contentStart] === '=') {
                let check = contentStart;
                while (check < code.length && code[check] === '=') { check++; }
                if (code[check] === '[') {
                    isLongString = true; level = check - contentStart; contentStart = check + 1;
                }
            }
            if (isLongString) {
                const start = current;
                const closePattern = ']' + '='.repeat(level) + ']';
                const closeIndex = code.indexOf(closePattern, contentStart);
                if (closeIndex !== -1) { current = closeIndex + closePattern.length; }
                else { current = code.length; }
                tokens.push({ type: 'string', value: code.slice(start, current) });
                continue;
            }
        }
        
        const start = current;
        while (current < code.length) {
            const c = code[current];
            if (c === '-' && code[current + 1] === '-') break;
            if (c === '"' || c === "'") break;
            if (c === '[') {
                let check = current + 1;
                if (code[check] === '[') break;
                if (code[check] === '=') {
                    while (check < code.length && code[check] === '=') check++;
                    if (code[check] === '[') break;
                }
            }
            current++;
        }
        
        if (current > start) {
            tokens.push({ type: 'code', value: code.slice(start, current) });
        } else if (current === start && current < code.length) {
            tokens.push({ type: 'code', value: code[current] });
            current++;
        }
    }
    
    return tokens;
}
