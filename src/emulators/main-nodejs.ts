import { Dosbox } from "./dosbox";
import { msdos } from "./msdos-player";

export const nodejs_emu_list = [
    new Dosbox(),
    new msdos(),
];