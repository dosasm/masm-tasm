
const e = new Event('message');
const command = 'launch wDOSBox';
const text = {
    cycles: 700,
    wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js",
    extracts: [
        ['https://js-dos.com/6.22/current/test/digger.zip', '/digger']
    ],
    shellcmds: [
        'cd digger',
        'digger'
    ]
}
e.data = { command, text }
window.dispatchEvent(e)
