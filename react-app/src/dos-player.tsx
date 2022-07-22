import React, { useRef, useEffect, useState } from "react";

import { CommandInterface, Emulators } from "emulators";
import { EmulatorsUi } from "emulators-ui";
import { Layers } from "emulators-ui/dist/types/dom/layers";
import { Popover, Typography } from "@material-ui/core";
import CloseIcon from '@material-ui/icons/Close';
import { EmulatorFunction } from "emulators-ui/dist/types/js-dos";

declare const emulators: Emulators;
declare const emulatorsUi: EmulatorsUi;

interface PlayerProps {
    bundle: Uint8Array;
    dosboxFunction?: EmulatorFunction
}

let ci: CommandInterface | null = null;

export default function DosPlayer(props: PlayerProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [layers, setlayers] = useState<Layers | null>(null);
    const [popup, setPopup] = useState<string | undefined>();

    useEffect(() => {
        if (rootRef === null || rootRef.current === null) {
            return;
        }

        const root = rootRef.current as HTMLDivElement;
        const layers = emulatorsUi.dom.layers(root);
        setlayers(layers);
        layers.showLoadingLayer();

        return () => {
            if (ci) { ci.exit() }
        };
    }, [rootRef]);

    useEffect(() => {
        if (layers !== null) {
            const ciP = props.dosboxFunction === "dosboxDirect" ?
                emulators.dosboxDirect(props.bundle) :
                emulators.dosboxWorker(props.bundle)
                ;
            ciP.then(
                _ci => {
                    ci = _ci;
                    layers.hideLoadingLayer();
                    console.log('module get😀', !!(ci as any).transport.module)
                    emulatorsUi.graphics.webGl(layers, ci);
                    emulatorsUi.controls.mouse(layers, ci);
                    emulatorsUi.sound.audioNode(ci);
                    emulatorsUi.controls.options(layers, ["default"], () => {/**/ }, 54, 54 / 4, 0);

                    let rec: string | undefined = undefined;
                    let timerId: NodeJS.Timeout | undefined = undefined;
                    ci.events().onStdout(val => {
                        timerId && clearTimeout(timerId);
                        if (val.includes(">type")) {
                            rec = "";
                        }
                        if (rec !== undefined) {
                            timerId = setTimeout(() => {
                                rec && rec.length > 50 && setPopup(rec);
                                rec = undefined;
                            }, 1000);
                            rec += val;
                        }
                    })
                }
            );
        }
        return () => {
            if (ci) { ci.exit() }
        }
    }, [layers, props.bundle, props.dosboxFunction]);

    const preventUp = function (event: any) {
        event.preventDefault();
    }
    const preventDown = function (event: any) {
        event.preventDefault();
    }

    return <div ref={rootRef} tabIndex={0}
        onBlur={
            e => {
                if (layers && ci) {
                    //use a psedo ci to prevent the key events to emulators
                    //@see https://github.com/caiiiycuk/js-dos/issues/94
                    const pseudo = { sendKeyEvent: () => { } }
                    emulatorsUi.controls.keyboard(layers, pseudo as any as CommandInterface, {});
                }
                document.removeEventListener("keyup", preventUp, true);
                document.removeEventListener("keydown", preventDown, true);
            }
        }
        onFocus={
            event => {
                if (layers && ci) {
                    emulatorsUi.controls.keyboard(layers, ci, {});
                }
                document.addEventListener("keyup", preventUp, true);
                document.addEventListener("keydown", preventDown, true);
            }
        }
    >
        {popup && <Popover
            id="type stdout hover"
            open={true}
            anchorEl={rootRef.current}
        >
            <CloseIcon onClick={() => { setPopup(undefined) }} style={{ float: "right" }} />
            <Typography>The full Content</Typography>
            <textarea className="popup-stdout" value={popup} readOnly={true} cols={80} rows={10}
            ></textarea>
        </Popover>
        }
    </div >;
}