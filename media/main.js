// function dragstart_handler(event) {
//   event.dataTransfer.setData("text/plain", `for i in range(2): pass`);
// }

// function variable_drag_handler(event) {
//   console.log(event);
// }

function variable_dragstart_handler(event) {
  const varName = document.querySelector('input[name="var-name"]').value;
  const varType = document.querySelector("#select-var-type").value;
  let varValue = document.querySelector('input[name="var-value"]').value;

  if (!varName) {
    return;
  }

  event.dataTransfer.setData("text/plain", event.target.id);

  if (varType === "number") {
    if (!varValue) {
      varValue = "None";
    }

    event.dataTransfer.setData("text/x-python", `${varName} = ${varValue}`);
  } else if (varType === "string") {
    if (!varValue) {
      varValue = "";
    }

    event.dataTransfer.setData("text/x-python", `${varName} = "${varValue}"`);
  }
}

function variable_dragend_handler(event) {
  document.querySelector('input[name="var-name"]').value = "";
  document.querySelector('input[name="var-value"]').value = "";
}

// application/x-python-code

function main() {
  // @ts-ignore
  const variableBlock = document.querySelector("#variable-block");
  variableBlock.addEventListener("dragstart", variable_dragstart_handler);
  variableBlock.addEventListener("dragend", variable_dragend_handler);
}

main();
