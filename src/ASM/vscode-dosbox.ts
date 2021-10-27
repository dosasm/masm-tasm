/**
 * API from extension [vscode-dosbox](https://marketplace.visualstudio.com/items?itemName=xsro.vscode-dosbox)
 * originally from https://github.com/dosasm/vscode-dosbox/blob/main/src/api.ts
 */

import { CommandInterface, Emulators } from 'emulators';
import * as Jszip from 'jszip';
import * as vscode from 'vscode';

export interface DosboxResult {
    stdout: string,
    stderr: string,
    exitCode: number | null;
}

export interface Dosbox {
    /**
     * update the main part of the dosbox configuration file
     */
    updateConf(section: string, key: string, value: string | number | boolean): boolean,
    /**
     * update the autoexec section of the dosbox configuration file
     */
    updateAutoexec(context: string[]): void,
    /**
     * update the conf file from jsdos bundle
     * 
     * @param bundle the bundle data
     * @param tempFolder the destination to exact the bundle file
     */
    fromBundle(bundle: Uint8Array, tempFolder: vscode.Uri): Promise<void>
    /**
     * run the emulator 
     * 
     * @param params the parameter passed to dosbox via command line
     */
    run(params?: string[]): Promise<DosboxResult>
}

export interface Jsdos {
    jszip: Jszip,
    /**
     * set the jsdos bundle to use
     * @param bundle the Uint8Array data of the jsdos bundle or its Uri
     * @param updateConf use the conf file in the bundle
     */
    setBundle(bundle: vscode.Uri | Uint8Array, updateConf?: boolean): void,
    updateConf(section: string, key: string, value: string | number | boolean): boolean,
    updateAutoexec(context: string[]): void,
    /**
     * run jsdos in the VSCode's extension Host
     * 
     * @todo make this also work in web extension
     * @returns [CommandInterface](https://js-dos.com/v7/build/docs/command-interface)
     */
    runInHost(): Promise<CommandInterface>,
    /**
     * run **jsdos in the webview**. This works in all platform including web
     * 
     * @param bundle the Uint8Array data of the jsdos bundle
     * @returns the vscode webview running JSDos
     */
    runInWebview(): Promise<vscode.Webview>,
}

export interface API {
    /**
     * [jsdos](https://js-dos.com/v7/build/) emulator 
     *  is the core of jsdos -- the simpliest API to run DOS games in browser
     * 
     * @see https://github.com/js-dos/emulators
     */
    emulators: Emulators;

    /**
     * run Jsdos in ExtensionHost or Webview
     */
    jsdos: Jsdos;

    /**
     * run DOSBox via child_process
     */
    dosbox: Dosbox
    ;
    /**
     * run DOSBox-x via child_process
     */
    dosboxX: Dosbox;
    /**
     * run msdos player via cmd.exe
     * 
     * @returns a terminal to control
     */
    msdosPlayer: () => vscode.Terminal;

}