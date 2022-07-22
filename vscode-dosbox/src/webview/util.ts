export function loghtml(msg: string, add: boolean = true) {
  const e = document.getElementById("loadingInfo");
  if (e?.innerHTML) {
    if (add) {
      e.innerHTML += ";" + msg;
    } else {
      e.innerHTML = msg;
    }
  }
}
