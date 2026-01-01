import { EndOfLine } from "vscode";

export function eolString(eol: EndOfLine) {
    switch (eol) {
        case EndOfLine.CRLF:
            return "\r\n";
        case EndOfLine.LF:
            return "\n";
    }
}