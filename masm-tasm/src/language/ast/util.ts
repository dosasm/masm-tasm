/**
 * Convert a character position in a string to a line number and column position.
 * @param input The input string.
 * @param position The character position.
 * @returns An object containing the line number and column position.
 */
export function positionToLineAndColumn(input: string, position: number): { line: number; column: number } {
    let line = 0;
    let column = 0;
    for (let i = 0; i < position; i++) {
        if (input[i] === '\n') {
            line++;
            column = 0;
        } else {
            column++;
        }
    }
    return { line: line + 1, column: column + 1 };
}

/**
 * Convert a line number and column position to a character position in a string.
 * @param input The input string.
 * @param line The line number (starting from 1).
 * @param column The column position (starting from 1).
 * @returns The character position.
 */
export function lineAndColumnToPosition(input: string, line: number, column: number): number {
    let currentLine = 1;
    let currentPosition = 0;
    for (let i = 0; i < input.length; i++) {
        if (currentLine === line && (i + 1) - currentPosition === column) {
            return i;
        }
        if (input[i] === '\n') {
            currentLine++;
            currentPosition = i + 1;
        }
    }
    return -1; // Return -1 if the line and column are out of bounds
}