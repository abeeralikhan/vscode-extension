(function () {
  // blocks and data-blocks
  const vscode = acquireVsCodeApi();
  const blocks = document.querySelectorAll("[draggable='true']");

  // drop areas
  const dropZone = document.querySelector(".code-blocks");
  const dataStores = document.querySelectorAll(".data-store");
  const childHolders = document.querySelectorAll(".holder.children");
  const dataHoldersLogic = [
    ...document.querySelectorAll("[data-block-type='logic'] > .left-holder"),
    ...document.querySelectorAll("[data-block-type='logic'] > .right-holder"),
  ];

  const dataHoldersMath = [
    ...document.querySelectorAll("[data-block-type='math'] > .left-holder"),
    ...document.querySelectorAll("[data-block-type='math'] > .right-holder"),
  ];

  // TODO: Instead of accepting class name as parameter, accept an actual container like in the video
  function getDragAfterBlock(containerClass, y) {
    const blocks = [
      ...document.querySelectorAll(`.${containerClass} > div:not(.dragging)`),
    ];

    return blocks.reduce(
      (closest, block) => {
        const box = block.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: block };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  function closeSideBar(block) {
    if (block.classList.contains("persist")) {
      setTimeout(() => makeAllHiddenAndRemoveColor(), 100);
    }
  }

  function addDraggingClass(block) {
    block.addEventListener("dragstart", (e) => {
      e.stopPropagation();

      closeSideBar(block);
      block.classList.add("dragging");
    });
  }

  function removeDraggingClass(block) {
    block.addEventListener("dragend", (e) => {
      e.stopPropagation();

      block.classList.remove("dragging");
    });
  }

  /*
TODO: Register a new event listener on blocks having persist class
      Close the sidebar and add the block into the dom
      When user has clicked on one of the blocks from the sidebar
*/

  blocks.forEach((block) => {
    addDraggingClass(block);
    removeDraggingClass(block);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedBlock = document.querySelector(".dragging");
    const afterBlock = getDragAfterBlock("code-blocks", e.clientY);

    if (!afterBlock) {
      try {
        dropZone.appendChild(draggedBlock);
        return;
      } catch (e) {
        return;
      }
    }

    try {
      dropZone.insertBefore(draggedBlock, afterBlock);
    } catch (e) {
      return;
    }
  });

  function getSubsideName(constructType) {
    switch (constructType) {
      case "math":
        return "math-subside";
      case "variable":
        return "variable-subside";
      case "loop":
        return "loop-subside";
      case "logic":
        return "logic-subside";
      case "text":
        return "text-subside";
      case "procedure":
        return "procedure-subside";
      default:
        return "";
    }
  }

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedBlock = document.querySelector(".dragging");

    if (!draggedBlock.classList.contains("persist")) return;

    draggedBlock.classList.remove("persist");

    const parentName = getSubsideName(draggedBlock.dataset.blockType);
    const parentNode = document.querySelector(`.${parentName} .blocks-list`);

    // if (!parentNode.childElementCount) return;

    const nodeIndex = +draggedBlock.dataset.index;
    const clonedBlock = draggedBlock.cloneNode(true);

    clonedBlock.classList.remove("dragging");
    clonedBlock.classList.add("persist");

    addDraggingClass(clonedBlock);
    removeDraggingClass(clonedBlock);

    if (
      clonedBlock.dataset.variableType === "set-variable" ||
      clonedBlock.dataset.blockType === "loop"
    ) {
      const dataStore = clonedBlock.children[0].children[1];
      listenToSomeNewBlocks(dataStore, {
        toInclude: [
          "math",
          "text",
          "get-variable",
          "logical-operation",
          "boolean-operation",
        ],
      });
    }

    // Same condition will be used for if then block etc
    if (clonedBlock.dataset.blockType === "loop") {
      const container = clonedBlock.children[1].children[1];
      listenToAllNewBlocks(container);
    }

    if (clonedBlock.dataset.mathType === "arithmetic-operation") {
      const leftContainer = clonedBlock.children[0];
      const rightContainer = clonedBlock.children[2];

      listenToSomeNewBlocks(leftContainer, {
        toInclude: ["math", "get-variable"],
      });
      listenToSomeNewBlocks(rightContainer, {
        toInclude: ["math", "get-variable"],
      });
    }

    if (
      clonedBlock.dataset.logicType === "logical-operation" ||
      clonedBlock.dataset.logicType === "boolean-operation"
    ) {
      const leftContainer = clonedBlock.children[0];
      const rightContainer = clonedBlock.children[2];

      listenToSomeNewBlocks(leftContainer, {
        toInclude: [
          "math",
          "text",
          "get-variable",
          "logical-operation",
          "boolean-operation",
        ],
      });
      listenToSomeNewBlocks(rightContainer, {
        toInclude: [
          "math",
          "text",
          "get-variable",
          "logical-operation",
          "boolean-operation",
        ],
      });
    }

    if (!parentNode.children[nodeIndex]) {
      try {
        parentNode.appendChild(clonedBlock);
        return;
      } catch (e) {
        console.error(e);
        return;
      }
    }

    try {
      parentNode.insertBefore(clonedBlock, parentNode.children[nodeIndex]);
      return;
    } catch (e) {
      console.error(e);
      return;
    }
  });

  // TODO: Implement a different after block detecting algorithm for holders
  function listenToAllNewBlocks(container) {
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedBlock = document.querySelector(".dragging");
      const afterBlock = getDragAfterBlock("holder.children", e.clientY);

      if (!container.children.length) {
        try {
          container.appendChild(draggedBlock);
          return;
        } catch (e) {
          return;
        }
      }

      if (!afterBlock) {
        try {
          container.appendChild(draggedBlock);
          return;
        } catch (e) {
          return;
        }
      }

      try {
        container.insertBefore(draggedBlock, afterBlock);
      } catch (e) {
        return;
      }
    });
  }

  childHolders.forEach((holder) => listenToAllNewBlocks(holder));

  function listenToSomeNewBlocks(container, config) {
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (container.children.length) return;

      const draggedBlock = document.querySelector(".dragging");

      // TODO: Run a For..in loop over dataset, and dynamically check for the block type
      if (
        !config.toInclude.includes(draggedBlock.dataset.blockType) &&
        !config.toInclude.includes(draggedBlock.dataset.logicType) &&
        !config.toInclude.includes(draggedBlock.dataset.loopType) &&
        !config.toInclude.includes(draggedBlock.dataset.variableType) &&
        !config.toInclude.includes(draggedBlock.dataset.mathType) &&
        !config.toInclude.includes(draggedBlock.dataset.textType)
      )
        return;

      try {
        container.appendChild(draggedBlock);
        return;
      } catch (e) {
        return;
      }
    });
  }

  dataStores.forEach((dataStore) =>
    listenToSomeNewBlocks(dataStore, {
      toInclude: [
        "math",
        "text",
        "get-variable",
        "logical-operation",
        "boolean-operation",
      ],
    })
  );

  dataHoldersLogic.forEach((dataHolderLogic) =>
    listenToSomeNewBlocks(dataHolderLogic, {
      toInclude: [
        "math",
        "text",
        "get-variable",
        "logical-operation",
        "boolean-operation",
      ],
    })
  );

  dataHoldersMath.forEach((dataHolderMath) =>
    listenToSomeNewBlocks(dataHolderMath, {
      toInclude: ["math", "get-variable"],
    })
  );

  const sidebarLis = document.querySelectorAll(".navs > p");
  const subSidebars = document.querySelectorAll(".target-div");
  const closeButtons = document.querySelectorAll(".sidebar-header > span");

  function getBlockColorClass(blockType) {
    switch (blockType) {
      case "math-subside":
        return "math-color";
      case "variable-subside":
        return "variable-color";
      case "loop-subside":
        return "loop-color";
      case "logic-subside":
        return "logic-color";
      case "text-subside":
        return "text-color";
      case "procedure-subside":
        return "procedure-color";
      default:
        return "";
    }
  }

  function makeAllHiddenAndRemoveColor(ignoreSubSidebar = "") {
    subSidebars.forEach((subSidebar) => {
      if (
        !subSidebar.classList.contains("hidden") &&
        subSidebar.classList[1] !== ignoreSubSidebar
      ) {
        subSidebar.classList.add("hidden");
        subSidebar.parentNode.classList.remove(
          getBlockColorClass(subSidebar.classList[1])
        );
        subSidebar.parentNode.classList.remove("fg-color");
      }
    });
  }

  sidebarLis.forEach((sidebarLi) => {
    sidebarLi.addEventListener("click", () => {
      const subSidebar = sidebarLi.parentNode.querySelector(".target-div");
      makeAllHiddenAndRemoveColor(subSidebar.classList[1]);

      subSidebar.classList.toggle("hidden");
      subSidebar.parentNode.classList.toggle(
        getBlockColorClass(subSidebar.classList[1])
      );
      subSidebar.parentNode.classList.toggle("fg-color");
    });
  });

  closeButtons.forEach((closeButton) => {
    closeButton.addEventListener("click", makeAllHiddenAndRemoveColor);
  });

  // CREATE VARIABLE

  const createVariableBtn = document.querySelector(".create-var");
  const variables = [];

  createVariableBtn.addEventListener("click", (e) => {
    e.preventDefault();

    vscode.postMessage({
      command: "prompt",
      payload: variables,
    });

    return;
  });

  window.addEventListener("message", (e) => {
    if (e.data.command === "addNewVariable") {
      const newVariableName = e.data.payload;
      const newVariableEl = createNewVariable(newVariableName);

      appendNewVariableToDom(newVariableEl);
      appendNewVariableToVariables(newVariableName);

      const variableBlocksContainer = document.querySelector(
        ".variable-subside .blocks-list"
      );

      if (
        variables.length > 0 &&
        variableBlocksContainer.classList.contains("hidden")
      ) {
        variableBlocksContainer.classList.remove("hidden");
      }

      return;
    }
  });

  function createNewVariable(name) {
    if (variables.includes(name)) return;

    const newVariableEl = document.createElement("option");
    newVariableEl.setAttribute("value", name);
    newVariableEl.innerText = name;

    return newVariableEl;
  }

  function appendNewVariableToDom(element) {
    const variableLists = document.querySelectorAll(".variable-list > select");

    variableLists.forEach((variableList) => {
      // we're cloning the original block because we wanna insert
      // the copies of a single block to multiple elements
      // if not cloned, then original block will move from one element to another
      variableList.appendChild(element.cloneNode(true));
    });
  }

  function appendNewVariableToVariables(variableName) {
    variables.push(variableName);
  }

  /// Algo Func
  // C language Transpiler
  class ProgCLang {
    createChar(char) {
      return `'${char}'`;
    }

    createString(string) {
      return `"${string}"`;
    }

    // return var wrap
    createVar(varType, varName, varValue) {
      if (varType == "number") {
        varType = "int";
      } else {
        varType = "char";
      }

      if (varValue != "''") {
        return `${varType} ${varName} = ${varValue};`;
      } else {
        return `${varType} ${varName};`;
      }
    }

    createNumber(value) {
      if (value == "") {
        return 0;
      }
      return `${value}`;
    }

    getVariable(varName) {
      return `${varName}`;
    }

    // return +, - .... || &&
    createOperator(operatorType, leftOperator, rightOperator) {
      return `(${leftOperator} ${operatorType} ${rightOperator})`;
    }

    // will create while, do-while & for loops
    createWhileLoop(loopCondition, loopBody) {
      return `while (${loopCondition}){
    ${loopBody}
};`;
    }

    // will create break & continue statements
    createIntruder(intruderType) {
      return `${intruderType}`;
    }
  }

  /// Algo Func
  class BlocktoCode {
    constructor() {
      const cLang = new ProgCLang();
      this.languages = { c: cLang };
      this.languageObj = "";
      this.root = document.querySelector(".code-blocks");
      this.textMethods = { number: this.handleValueBlock };
      this.procs = {
        variable: this.handleVariable,
        logic: this.handleOperators,
        while: this.handleLoop,
      };
    }

    // 1. Code Blocks Iterator
    generateCode(lang) {
      // Selecting conversion language
      this.languageObj = this.languages[lang];
      let res = ``;

      for (let i = 0; i < this.root.childElementCount; i++) {
        let block = this.root.children[i];

        if (
          block.dataset.blockType == "text" ||
          block.dataset.blockType == "math" ||
          block.dataset.blockType == "logic"
        ) {
          //
          if (
            block.dataset.mathType == "single-num" ||
            block.dataset.dtype == "string"
          ) {
            res += this.handleValueBlock(block) + "\n";
          } else if (block.dataset.mathType == "arithmetic-operation") {
            res += this.handleOperators(block) + "\n";
          } else if (
            block.dataset.logicType == "logical-operation" ||
            block.dataset.logicType == "boolean-operation"
          ) {
            res += this.handleOperators(block) + "\n";
          }
        } else if (block.dataset.blockType == "variable") {
          res += this.handleVariable(block) + "\n";
        } else if (block.dataset.blockType == "loop") {
          if (block.dataset.loopType == "while") {
            res += this.handleLoop(block) + "\n";
          }
        } else {
          // console.log(typeof(block.children[0].value));
          // console.log(this.handleValueBlock(block));
        }
      }
      // console.log('Done Iteration on DOM.');
      // document.querySelector(".procedure-nav").children[0].textContent = res;
      return res;
    }

    // 2. Value Blocks Handler
    handleValueBlock(element) {
      let dict = {
        string: this.languageObj.createChar,
        number: this.languageObj.createNumber,
      };
      return dict[element.dataset.dtype](element.children[0].value);
    }

    // 3. Variable Block Handler
    handleVariable(element) {
      if (element.dataset.variableType == "set-variable") {
        // getting value element connected to set block
        let valueElement = element.children[0].children[1].children[0];
        let val = "''";
        let dtype = "char";
        let varName =
          element.children[0].children[0].children[0].children[0].value;

        if (valueElement != undefined) {
          if (
            valueElement.dataset.blockType == "text" ||
            valueElement.dataset.blockType == "math"
          ) {
            if (
              valueElement.dataset.dtype == "string" ||
              valueElement.dataset.dtype == "number"
            ) {
              val = this.handleValueBlock(valueElement);
              dtype = valueElement.dataset.dtype;
            } else if (
              valueElement.dataset.mathType == "arithmetic-operation"
            ) {
              val = this.handleOperators(valueElement);
              dtype = "int";
            }
          } else if (valueElement.dataset.variableType == "get-variable") {
            val = this.handleVariable(valueElement);
          }
        }

        return this.languageObj.createVar(dtype, varName, val);
      } else if (element.dataset.variableType == "get-variable") {
        return element.children[0].children[0].children[0].children[0].value;
      }
    }

    // Operators Handler
    handleOperators(element) {
      // let dict = {'string':this.handleValueBlock, 'number':this.handleValueBlock};

      let leftOp = 0;
      let rightOp = 0;
      let operator = element.children[1].value;
      // console.log(element.children[0].childElementCount, element.children[2].childElementCount);

      // wrap left operand
      if (element.children[0].childElementCount > 0) {
        if (
          element.children[0].children[0].dataset.dtype == "number" ||
          element.children[0].children[0].dataset.dtype == "string"
        ) {
          leftOp = this.handleValueBlock(element.children[0].children[0]);
        } else if (
          element.children[0].children[0].dataset.mathType ==
          "arithmetic-operation"
        ) {
          leftOp = this.handleOperators(element.children[0].children[0]);
        } else if (
          element.children[0].children[0].dataset.variableType == "get-variable"
        ) {
          leftOp = this.handleVariable(element.children[0].children[0]);
        } else if (
          element.children[0].children[0].dataset.logicType ==
          "logical-operation"
        ) {
          leftOp = this.handleOperators(element.children[0].children[0]);
        } else if (
          element.children[0].children[0].dataset.logicType ==
          "boolean-operation"
        ) {
          leftOp = this.handleOperators(element.children[0].children[0]);
        }

        // console.log(this.handleValueBlock(element.children[0].children[0]));
        // console.log(element.children[0].children[0].dataset.dtype, dict['number'](element.children[0].children[0]));
      }

      // wrap right operand
      if (element.children[2].childElementCount > 0) {
        if (
          element.children[2].children[0].dataset.dtype == "number" ||
          element.children[2].children[0].dataset.dtype == "string"
        ) {
          rightOp = this.handleValueBlock(element.children[2].children[0]);
        } else if (
          element.children[2].children[0].dataset.mathType ==
          "arithmetic-operation"
        ) {
          rightOp = this.handleOperators(element.children[2].children[0]);
        } else if (
          element.children[2].children[0].dataset.variableType == "get-variable"
        ) {
          rightOp = this.handleVariable(element.children[2].children[0]);
        } else if (
          element.children[2].children[0].dataset.logicType ==
          "logical-operation"
        ) {
          rightOp = this.handleOperators(element.children[2].children[0]);
        } else if (
          element.children[2].children[0].dataset.logicType ==
          "boolean-operation"
        ) {
          rightOp = this.handleOperators(element.children[2].children[0]);
        }
      }

      // console.log(operator, leftOp, rightOp);
      return this.languageObj.createOperator(operator, leftOp, rightOp);
    }

    handleLoop(element) {
      let loopCondition = 0;
      let loopBody = ``;

      // Wrap Loop Condition
      if (element.children[0].children[1].childElementCount > 0) {
        if (
          element.children[0].children[1].children[0].dataset.blockType ==
            "math" ||
          element.children[0].children[1].children[0].dataset.logicType ==
            "boolean-operation" ||
          element.children[0].children[1].children[0].dataset.logicType ==
            "logical-operation"
        ) {
          loopCondition = this.handleOperators(
            element.children[0].children[1].children[0]
          );
        } else if (
          element.children[0].children[1].children[0].dataset.dtype ==
            "number" ||
          element.children[0].children[1].children[0].dataset.dtype == "string"
        ) {
          loopCondition = this.handleValueBlock(
            element.children[0].children[1].children[0]
          );
        }
      }

      // Wrap Loop Body
      if (element.children[1].children[1].childElementCount > 0) {
        for (
          let i = 0;
          i < element.children[1].children[1].childElementCount;
          i++
        ) {
          let block = element.children[1].children[1].children[i];
          if (block.dataset.blockType == "loop") {
            if (block.dataset.loopType == "while") {
              loopBody += "\t" + this.handleLoop(block);
            }
          } else if (block.dataset.blockType == "variable") {
            loopBody += "\t" + this.handleVariable(block);
          }

          if (i + 1 < element.children[1].children[1].childElementCount) {
            loopBody += "\n";
          }
        }
      }

      // if (loopCondition.dataset.blockType in this.procs){
      //     loopCondition = this.procs[loopCondition.dataset.blockType](loopCondition);
      //     loopBody =  this.procs[loopBody.dataset.blockType](loopBody);
      // }
      return this.languageObj.createWhileLoop(loopCondition, loopBody);
    }
  }

  const generateCodeBtn = document.querySelector(".code-generate-btn");
  const codeHolder = document.querySelector(".code-holder");
  const codeGeneration = new BlocktoCode();

  generateCodeBtn.addEventListener("click", (e) => {
    const code = codeGeneration.generateCode("c");
    vscode.postMessage({
      command: "beautifyC",
      payload: code,
    });
  });

  window.addEventListener("message", (e) => {
    if (e.data.command === "codeGenerate") {
      const code = e.data.payload;
      codeHolder.innerHTML = code
        .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
        .replace(/\n/g, "<br>");
    }
  });

  // Delete Blocks
  const deleteBtn = document.querySelector(".code-delete-btn");
  deleteBtn.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("drag over");
    const draggedBlock = document.querySelector(".dragging");
    draggedBlock.remove();
  });
})();
