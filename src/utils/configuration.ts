/**use MASM or TASM
 * - MASM: including masm.exe,link.exe,debug.exe
 * - TASM: including tasm.exe,tlink.exe,TD.exe
 */
export enum ASMTYPE {
    MASM = 'MASM',
    TASM = 'TASM'
}

/**the emulator for the 16bit DOS environment
 * - `dosbox` is the most famous one
 * - `msdos`( player) is designed for running in windows cmd
 * - `jsdos` is designed for runing in browser
 * - `auto` is a mode to partly solve the problem of TD's hardly running in msdos
 */
export enum DOSEMU {
    dosbox = 'dosbox',
    msdos = 'msdos player',
    auto = 'auto',
    jsdos = 'jsdos',
}