function dragstart_handler(event) {
  event.dataTransfer.setData("text/plain", `for i in range(2): pass`);
}

function main() {
  // @ts-ignore
  const element = document.querySelector("#loop-for");
  element.addEventListener("dragstart", dragstart_handler);
}

main();
