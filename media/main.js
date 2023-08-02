(function () {
  // blocks and data-blocks
  const vscode = acquireVsCodeApi();
  const blocks = document.querySelectorAll("[draggable='true']");
  const dropZone = document.querySelector(".code-blocks");
  const deleteZone = document.querySelector(".code-delete-btn");

  const COMMON_WHITELIST_BLOCKS = [
    "math",
    "text",
    "get-variable",
    "logical-operation",
    "boolean-operation",
    "boolean",
    "not",
  ];
  const MATH_WHITELIST_BLOCKS = ["math", "get-variable"];
  const DEFAULT_INPUT_WIDTH = "7rem";
  const DEFAULT_MATH_TEXT_INPUT_WIDTH = "4ch";
  const DEFAULT_SELECT_WIDTH = "12ch";

  let unnamedProcedures = 0;
  let unnamedVariables = 0;
  let varReferences = 0;

  let hasDeleteLogicRun = false;

  deleteZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("run 1");

    if (hasDeleteLogicRun) return;

    const draggedBlock = document.querySelector(".dragging");

    draggedBlock.addEventListener("dragend", (event) => {
      event.preventDefault();
      event.stopPropagation();

      hasDeleteLogicRun = false;
    });

    if (draggedBlock.classList.contains("persist")) return;

    console.log("run 2");

    hasDeleteLogicRun = true;

    draggedBlock.addEventListener("dragend", (event) => {
      event.preventDefault();
      event.stopPropagation();

      hasDeleteLogicRun = false;
    });

    try {
      if (draggedBlock.dataset.variableType === "create-variable") {
        deleteAllVariableOptions(draggedBlock.dataset.variableId);
        draggedBlock.remove();
        return;
      }

      if (draggedBlock.dataset.blockType === "procedure") {
        console.log("run 3");
        draggedBlock.remove();
        deleteProcedureCallBlocks(draggedBlock.dataset.procedureId);
        return;
      }

      draggedBlock.remove();
      return;
    } catch (error) {
      return;
    }
  });

  // deleteZone.addEventListener("drop", (event) => {
  //   event.preventDefault();
  //   event.stopPropagation();

  //   hasDeleteLogicRun = false;
  // });

  dropZone.addEventListener("drop", handleNewBlock);
  dropZone.addEventListener("dragover", addNewBlockToCanvas);

  blocks.forEach((block) => {
    addDraggingClass(block);
    removeDraggingClass(block);
  });

  (function initMainFunc() {
    const mainBlock = document.querySelector(".main-func");
    const container = mainBlock.querySelector(".block-body > .procedure");
    const returnDatastore = mainBlock.querySelector(
      ".block-footer > .data-store"
    );

    handleNewContainersListeners({
      listenToAll: [container],
      listenToSome: [returnDatastore],
      toInclude: MATH_WHITELIST_BLOCKS,
    });
  })();

  function addNewBlockToCanvas(e) {
    e.preventDefault();
    e.stopPropagation();
    const draggedBlock = document.querySelector(".dragging");
    const afterBlock = getDragAfterBlock("code-blocks", e.clientY);

    try {
      if (draggedBlock.dataset.procedureType === "input-value") {
        draggedBlock.remove();
        return;
      }
    } catch (error) {}

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
  }

  function addNewParam(event) {
    const createParamBtn = event.target;
    const paramInputEl = createParamBtn.previousElementSibling;
    let newParamName = paramInputEl.value;

    if (!newParamName) return;

    newParamName = newParamName.trim().split(" ").join("_");

    const viewParamsContainer =
      createParamBtn.parentNode.parentNode.nextElementSibling;
    const paramsContainer =
      viewParamsContainer.querySelector(".holder.children");

    // Paramter with that name already exists so return
    if (getAllParamNames(paramsContainer).includes(newParamName)) return;

    // variables needed in the creating of parameter block
    const newParamBlock = createNewParamBlock(newParamName);
    const datatypeField = newParamBlock.querySelector('[name="datatype"]');

    // variables needed to update procedure call blocks
    const procedureBlock =
      createParamBtn.parentNode.parentNode.parentNode.parentNode.parentNode;
    const procedureId = procedureBlock.dataset.procedureId;

    addDraggingClass(newParamBlock);
    removeDraggingClass(newParamBlock);

    newParamBlock.addEventListener("dragend", (event) => {
      updateParams(viewParamsContainer, paramsContainer);
      handleProcedureCallBlocks(procedureId, {
        type: "UPDATE_PARAMS",
        params: getParamsAndDatatypes(paramsContainer),
        paramsHolder: event.target.parentNode,
      });
    });

    datatypeField.addEventListener("change", (event) => {
      updateParams(viewParamsContainer, paramsContainer);
      handleProcedureCallBlocks(procedureId, {
        type: "UPDATE_DATATYPE",
        datatypeSelectEl: event.target,
      });
    });

    paramsContainer.appendChild(newParamBlock);
    updateParams(viewParamsContainer, paramsContainer);
    paramInputEl.value = "";

    // Code related to adding new parameter to relevant places
    const params = getParamsAndDatatypes(paramsContainer);
    const getNewlyAddedParam = () => {
      return params[params.length - 1];
    };
    const getOnlyParamName = () => {
      return getNewlyAddedParam().split(" ")[1];
    };

    handleProcedureCallBlocks(procedureId, {
      type: "ADD_NEW_PARAM",
      param: getNewlyAddedParam(),
    });

    handleArgsUpdate(procedureId, {
      type: "ADD_NEW_ARG",
      arg: getOnlyParamName(),
    });
  }

  function handleArgsUpdate(procedureId, action) {
    const argsListEls = [
      ...document.querySelectorAll(
        `[data-current-procedure="${procedureId}"] [name="variable-name"] > .args-section`
      ),
    ];

    // Procedure with that id does not have any arguements so return
    if (!argsListEls.length) return;

    if (action.type === "ADD_NEW_ARG") {
      const { arg } = action;
      argsListEls.forEach((argsListEl) =>
        argsListEl.appendChild(getNewArgOption(arg))
      );
    }
  }

  function handleProcedureCallBlocks(procedureId, action) {
    const argStores = [
      ...document.querySelectorAll(`.${procedureId} > .args-store`),
    ];

    if (action.type === "ADD_NEW_PARAM") {
      const { param } = action;
      addProcedureCallBlock(param, argStores);
    }

    if (action.type === "UPDATE_DATATYPE") {
      const { datatypeSelectEl } = action;
      const updatedDatatype = datatypeSelectEl.value;
      const param =
        datatypeSelectEl.nextElementSibling.innerText.split(": ")[1];

      updateProcedureCallBlocks(param, updatedDatatype, argStores);
    }

    if (action.type === "UPDATE_PARAMS") {
      const { params, paramsHolder } = action;
      if (paramsHolder.childElementCount === params.length) {
        // TODO
        // handleArgsPositionSwap(params, argStores);
        return;
      }
      // TODO
      // handleArgDeleted(params, argStores);
    }
  }

  function updateProcedureCallBlocks(param, datatype, argStores) {
    argStores.forEach((argStore) => {
      [...argStore.children].forEach((arg) => {
        if (getParamName(arg) !== param) return;

        if (datatype !== "string") {
          arg.children[0].innerText = `${datatype} ${param}`;
          return;
        }

        arg.children[0].innerText = `${datatype} ${param}[ ]`;
      });
    });
  }

  function getParamName(arg) {
    return arg.children[0].innerText.split(" ")[1];
  }

  function addProcedureCallBlock(arg, argStores) {
    argStores.forEach((argStore) => {
      if (argStore.classList.contains("hide")) {
        argStore.classList.remove("hide");
      }

      argStore.appendChild(createNewArg(arg));
    });
  }

  function createNewArg(arg) {
    const argBlock = document.createElement("div");
    const argHolder = document.createElement("div");
    const span = document.createElement("span");

    span.innerText = arg;

    argBlock.classList.add("arg");
    argHolder.classList.add("arg-holder");

    listenToSomeNewBlocks(argHolder, {
      toInclude: COMMON_WHITELIST_BLOCKS,
    });

    argBlock.append(span, argHolder);

    return argBlock;
  }

  function updateParams(paramViewsContainer, paramsContainer) {
    const paramDesc =
      paramViewsContainer.parentNode.parentNode.querySelector(
        ".parameter-display"
      );

    const paramsTitle = paramViewsContainer.parentNode.parentNode.querySelector(
      ".description.param-prefix"
    );

    const params = getParamsAndDatatypes(paramsContainer);

    if (!params.length) {
      if (!paramsTitle.classList.contains("hide")) {
        paramsTitle.classList.add("hide");
      }
    } else {
      if (paramsTitle.classList.contains("hide")) {
        paramsTitle.classList.remove("hide");
      }
    }

    paramDesc.innerText = params.join(", ");
  }

  function getAllParamNames(paramsContainer) {
    return [...paramsContainer.children].map((paramBlock) => {
      return paramBlock.querySelector(".description").innerText.split(": ")[1];
    });
  }

  function getParamsAndDatatypes(paramsContainer) {
    return [...paramsContainer.children].map((paramBlock) => {
      const paramNameContainer = paramBlock.querySelector(".description");
      const paramDatatype = paramNameContainer.previousElementSibling.value;

      if (paramDatatype === "string") {
        return `char ${paramNameContainer.innerText.split(": ")[1]}[ ]`;
      }

      return `${paramDatatype} ${paramNameContainer.innerText.split(": ")[1]}`;
    });
  }

  function toggleParameterStore(event) {
    const parameterStore =
      event.target.parentNode.querySelector(".parameter-store");
    parameterStore.classList.toggle("hide");
  }

  function createNewParamBlock(paramName) {
    const paramBlock = document.createElement("div");
    paramBlock.classList.add("code-block");
    paramBlock.setAttribute("draggable", "true");
    paramBlock.setAttribute("data-block-type", "procedure");
    paramBlock.setAttribute("data-procedure-type", "input-value");

    paramBlock.innerHTML += `
        <div class="block-header centered">
          <select name="datatype">
            <option value="int" selected>integer</option>
            <option value="float">float</option>
            <option value="double">double</option>
            <option value="char">character</option>
            <option value="string">string</option>
          </select>
          <p class="description">input name: ${paramName}</p>
        </div>
      `;

    return paramBlock;
  }

  function getNewProcedureName() {
    let DEFAULT_PROCEDURE_NAME = "doSomething";
    DEFAULT_PROCEDURE_NAME += unnamedProcedures ? unnamedProcedures : "";
    unnamedProcedures += 1;

    return DEFAULT_PROCEDURE_NAME;
  }

  function getNewVariableName() {
    let DEFAULT_VARIABLE_NAME = "myVariable";
    DEFAULT_VARIABLE_NAME += unnamedVariables ? unnamedVariables : "";
    unnamedVariables += 1;

    return DEFAULT_VARIABLE_NAME;
  }

  function createProcedureCallBlock(procedureName, id) {
    const block = document.createElement("div");
    block.classList.add("code-block", "persist", id);
    block.setAttribute("data-block-type", "procedure");
    block.setAttribute("data-procedure-type", "call-void");
    block.setAttribute("draggable", "true");
    block.setAttribute("data-index", getIndexForNewCallBlock());

    block.innerHTML += `
        <p class="description">${procedureName} <span>with:</span></p>
        <div class="block-header args-store centered hide"></div>
      `;

    return block;
  }

  function getIndexForNewCallBlock() {
    return document.querySelector(".procedure-subside .blocks-list")
      .childElementCount;
  }

  function getNewProcedureId() {
    return `P${unnamedProcedures}`;
  }

  function getNewVariableId() {
    return `V${unnamedVariables}`;
  }

  function getNewVariableRefId() {
    const newReferenceId = `R${varReferences}`;
    varReferences += 1;

    return newReferenceId;
  }

  function handleProcedureNameUpdate(block, inputEl) {
    inputEl.addEventListener("change", (event) => {
      if (!inputEl.value) {
        const newProcedureName = getNewProcedureName();
        inputEl.value = newProcedureName;
        updateAllCallBlocksName(block.dataset.procedureId, newProcedureName);
        return;
      }
      updateAllCallBlocksName(block.dataset.procedureId, inputEl.value);
    });
  }

  function handleVariableNameUpdate(block, inputEl) {
    inputEl.addEventListener("change", (event) => {
      if (!inputEl.value) {
        const newVariableName = getNewVariableName();
        inputEl.value = newVariableName;
        updateAllVariableOptions(block);

        // updateAllVariablesName(block.dataset.variableId, newVariableName);
        return;
      }
      updateAllVariableOptions(block);
      // updateAllVariablesName(block.dataset.variableId, inputEl.value);
    });
  }

  function updateAllVariableOptions(block) {
    const options = document.querySelectorAll(
      `option.${block.dataset.variableId}`
    );

    const dtype = block.querySelector('[name="datatype"]').value;
    const name = block.querySelector(".variable-name").value;

    options.forEach((option) => {
      option.innerText = name;
      option.value = `${dtype} ${name}`;
    });
  }

  function updateAllCallBlocksName(procedureId, procedureName) {
    const callProcedureBlocks = [
      ...document.querySelectorAll(`.${procedureId} > .description`),
    ];

    const WITH_SPAN_TAG = document.createElement("span");
    WITH_SPAN_TAG.innerText = "with:";

    callProcedureBlocks.forEach((callProcedureBlock) => {
      callProcedureBlock.innerText = procedureName;
      callProcedureBlock.appendChild(WITH_SPAN_TAG);
    });
  }

  function fetchVariables(block) {
    const { procedureId, didFound } = findAndGetProcedure(block);
    const selectEl = block.querySelector("[name='variable-name']");
    const variableList = block.querySelector(".vars-section");
    const warning = block.querySelector(".warning");
    const message = block.querySelector(".warning-message");

    hideError(warning);

    if (!didFound) {
      // clearOptionsButKeepSelection(selectEl, variableList);
      variableList.innerHTML = "";
      showError(warning, message);
      // console.log("is not inside any procedure");
      return;
    }

    // clearOptionsButKeepSelection(selectEl, variableList);
    variableList.innerHTML = "";
    const variables = getVariables(block);

    if (!variables.length) {
      // console.log("no variables found");
      return;
    }

    updateVariablesList(variableList, variables);
  }

  // function clearOptionsButKeepSelection(selectEl, targetSection) {
  //   if (selectEl.value === "default") return;

  //   const selectedOption = selectEl.options[selectEl.selectedIndex];
  //   targetSection.innerHTML = "";
  //   selectedOption.selected = true;
  //   selectEl.options[selectEl.selectedIndex].textContent =
  //     selectedOption.textContent;

  //   for (let i = 0; i < selectEl.options.length; i++) {
  //     if (selectEl.options[i] !== selectedOption) {
  //       selectEl.options[i].style.display = "none";
  //     }
  //   }
  // }

  function updateVariablesList(variableSelectEl, variables, reset = true) {
    if (reset) variableSelectEl.innerHTML = "";

    variables.forEach((variable) =>
      variableSelectEl.appendChild(getNewVariableOption(variable))
    );
  }

  function getNewVariableOption(variable) {
    const option = document.createElement("option");
    const [dtype, name, variableId] = variable.split(" ");
    option.value = `${dtype} ${name}`;
    option.innerText = name;
    option.classList.add(variableId);

    return option;
  }

  function getVariables(block) {
    const variables = [];

    while (!block.classList.contains("code-blocks")) {
      if (block.dataset.blockType === "procedure") break;

      if (block.dataset.variableType === "create-variable") {
        const dtype = block.querySelector('[name="datatype"]').value;
        const name = block.querySelector(".variable-name").value;
        const variableId = block.dataset.variableId;

        variables.push(`${dtype} ${name} ${variableId}`);
      }

      block = block.previousElementSibling
        ? block.previousElementSibling
        : block.parentNode;
    }

    return variables.reverse();
  }

  function deleteAllVariableOptions(variableId) {
    const options = document.querySelectorAll(`option.${variableId}`);
    options.forEach((option) => option.remove());
  }

  function deleteProcedureCallBlocks(procedureId) {
    console.log("deleteProcedureCallBlocks 1");
    const callBlocks = document.querySelectorAll(`.${procedureId}`);
    callBlocks.forEach((callBlock) => callBlock.remove());

    const sidebarName = getSubsideName("procedure");
    const sidebarEls = [
      ...document.querySelector(`.${sidebarName} .blocks-list`),
    ];

    console.log("deleteProcedureCallBlocks 2");

    sidebarEls.forEach((sidebarEl, idx) => {
      console.log(idx);
      sidebarEl.setAttribute("data-index", idx);
    });
    console.log(sidebarEls);
  }

  function updateVariablesOfThisProcedure(procedureId) {
    const variableBlocks = document.querySelectorAll(
      `[data-current-procedure="${procedureId}"]`
    );

    variableBlocks.forEach((variableBlock) => {
      if (variableBlock.dataset.variableType === "create-variable") return;

      const variables = getVariables(variableBlock);

      if (!variables.length) return;

      const variableEl = variableBlock.querySelector(".vars-section");
      updateVariablesList(variableEl, variables);
    });
  }

  function fetchArgs(block) {
    const { procedureId, params, didFound } = findAndGetProcedure(block);
    const argsListEl = block.querySelector(
      '[name="variable-name"] > .args-section'
    );

    if (!didFound) {
      block.removeAttribute("data-current-procedure", "");
      argsListEl.innerHTML = "";
      return;
    }

    // Dont update params if moving in the same procedure
    if (block.dataset.currentProcedure === procedureId) return;

    block.setAttribute("data-current-procedure", procedureId);

    argsListEl.innerHTML = "";

    params.forEach((param) => {
      argsListEl.appendChild(getNewArgOption(param));
    });
  }

  function getNewArgOption(paramName) {
    const option = document.createElement("option");
    option.value = paramName;
    option.innerText = paramName;

    return option;
  }

  function findAndGetProcedure(block) {
    let parentBlock = block.parentNode;

    if (!parentBlock)
      return {
        didFound: false,
      };

    while (!parentBlock.classList.contains("code-blocks")) {
      if (
        parentBlock.dataset.procedureType === "no-return" ||
        parentBlock.dataset.procedureType === "return"
      ) {
        const paramsContainer = parentBlock.querySelector(".all-params");
        const params = getAllParamNames(paramsContainer);

        return {
          params,
          procedureId: parentBlock.dataset.procedureId,
          didFound: true,
        };
      }
      parentBlock = parentBlock.parentNode;
    }

    return { didFound: false };
  }

  function findProcedureId(block) {
    let parentBlock = block.parentNode;
    while (!parentBlock.classList.contains("code-blocks")) {
      if (
        parentBlock.dataset.procedureType === "no-return" ||
        parentBlock.dataset.procedureType === "return"
      ) {
        return {
          procedureId: parentBlock.dataset.procedureId,
          didFound: true,
        };
      }
      parentBlock = parentBlock.parentNode;
    }

    return { didFound: false };
  }

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
    if (block.classList.contains("persist")) makeAllHiddenAndRemoveColor();
  }

  function addDraggingClass(block) {
    block.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      setTimeout(() => closeSideBar(block), 100);
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

  function makeInputWidthDynamic(inputEl, defaultWidth) {
    inputEl.addEventListener("keydown", (event) => {
      if (inputEl.value.length < 1) return;

      if (event.key === "Backspace" && inputEl.value.length === 1) {
        inputEl.style.width = defaultWidth;
        return;
      }

      inputEl.style.width = inputEl.value.length + 2 + "ch";
    });
  }

  function makeSelectWidthDynamic(selectEl) {
    selectEl.addEventListener("change", (event) => {
      selectEl.style.width = selectEl.value.length + 2 + "ch";
    });
  }

  // TODO: Group loops, procedures, variables, logics
  // Right now they all are together and kinda messy
  function handleNewBlock(e) {
    e.preventDefault();
    e.stopPropagation();

    const draggedBlock = document.querySelector(".dragging");

    if (!draggedBlock) return;

    if (!draggedBlock.classList.contains("persist")) return;

    draggedBlock.classList.remove("persist");

    const clonedBlock = draggedBlock.cloneNode(true);

    clonedBlock.classList.remove("dragging");
    clonedBlock.classList.add("persist");

    addDraggingClass(clonedBlock);
    removeDraggingClass(clonedBlock);
    addBlockBackToSidebar(clonedBlock);

    if (
      draggedBlock.dataset.procedureType === "no-return" ||
      draggedBlock.dataset.procedureType === "return"
    ) {
      const paramStoreBtn = draggedBlock.querySelector(".btn-parameter-store");
      const newParamBtn = draggedBlock.querySelector(
        ".parameter-input + button"
      );
      const blocksContainer = draggedBlock.querySelector(
        ".holder.children.procedure"
      );
      const paramsContainer = draggedBlock.querySelector(".all-params");
      const inputEl = draggedBlock.querySelector(".procedure-name");

      const procedureName = getNewProcedureName();
      const procedureId = getNewProcedureId();
      const procedureCallBlock = createProcedureCallBlock(
        procedureName,
        procedureId
      );

      inputEl.value = procedureName;

      paramStoreBtn.addEventListener("click", toggleParameterStore);
      newParamBtn.addEventListener("click", addNewParam);

      draggedBlock.setAttribute("data-procedure-id", procedureId);

      addDraggingClass(procedureCallBlock);
      removeDraggingClass(procedureCallBlock);
      addBlockBackToSidebar(procedureCallBlock);

      handleNewContainersListeners({
        listenToAll: [blocksContainer, paramsContainer],
      });
      handleProcedureNameUpdate(draggedBlock, inputEl);
      makeInputWidthDynamic(inputEl, DEFAULT_INPUT_WIDTH);
    }

    if (draggedBlock.dataset.procedureType === "return") {
      const dataStore = draggedBlock.querySelector(
        ".block-footer > .data-store"
      );

      handleNewContainersListeners({
        listenToSome: [dataStore],
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    if (
      draggedBlock.dataset.variableType === "set-variable" ||
      draggedBlock.dataset.variableType === "get-variable"
    ) {
      const selectEl = draggedBlock.querySelector(".variable-name > select");
      const warningBtn = draggedBlock.querySelector(".warning");
      const warningMsg = draggedBlock.querySelector(".warning-message");

      warningBtn.addEventListener("click", (event) => {
        warningMsg.classList.toggle("hide");
      });

      draggedBlock.setAttribute("data-reference-id", getNewVariableRefId());

      makeSelectWidthDynamic(selectEl);

      draggedBlock.addEventListener("dragend", (event) => {
        fetchArgs(draggedBlock);
        fetchVariables(draggedBlock);
      });
    }

    if (
      draggedBlock.dataset.variableType === "set-variable" ||
      draggedBlock.dataset.variableType === "create-variable"
    ) {
      // Same logic for set and create variable
      const dataStore = draggedBlock.querySelector(".data-store");

      handleNewContainersListeners({
        listenToSome: [dataStore],
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    if (draggedBlock.dataset.variableType === "create-variable") {
      const inputEl = draggedBlock.querySelector(".variable-name");
      const dtypeSelect = draggedBlock.querySelector("[name='datatype']");
      const variableName = getNewVariableName();
      const variableId = getNewVariableId();
      const { procedureId, didFound } = findProcedureId(draggedBlock);

      if (didFound) {
        draggedBlock.setAttribute("data-current-procedure", procedureId);
      }

      dtypeSelect.addEventListener("change", () =>
        updateAllVariableOptions(draggedBlock)
      );

      draggedBlock.setAttribute("data-variable-id", variableId);
      inputEl.value = variableName;

      handleVariableNameUpdate(draggedBlock, inputEl);
      makeInputWidthDynamic(inputEl, DEFAULT_INPUT_WIDTH);

      draggedBlock.addEventListener(
        "dragend",
        handleCreateVariableBlockMove(draggedBlock)
      );

      draggedBlock.addEventListener(
        "dragstart",
        handleCreateVariableBlockMove(draggedBlock)
      );
    }

    if (
      draggedBlock.dataset.loopType === "while" ||
      draggedBlock.dataset.loopType === "until" ||
      draggedBlock.dataset.loopType === "do-while"
    ) {
      // while, until, do while
      const container = draggedBlock.querySelector(".holder.children");
      const dataStore = draggedBlock.querySelector(".data-store");

      handleNewContainersListeners({
        listenToAll: [container],
        listenToSome: [dataStore],
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    // TODO: FIX IF BLOCK --> FETCH VARIABLES
    // 1. Detect In Which Procedure it is
    // 2. Climb up
    if (draggedBlock.dataset.loopType === "for") {
      const container = draggedBlock.children[1].children[1];
      const loopDataStore = draggedBlock.children[0].children[1].children[0];
      const datastores = [
        draggedBlock.children[0].children[1].children[0],
        draggedBlock.children[0].children[1].children[2],
        draggedBlock.children[0].children[1].children[4],
        draggedBlock.children[0].children[1].children[6],
      ];

      handleNewContainersListeners({
        listenToAll: [container],
        listenToSome: datastores,
        toInclude: MATH_WHITELIST_BLOCKS,
      });

      handleNewContainersListeners({
        listenToSome: loopDataStore,
        toInclude: ["get-variable"],
      });
    }

    if (draggedBlock.dataset.loopType === "break-continue") {
      const warningBtn = draggedBlock.querySelector(".warning");
      const warningMsg = draggedBlock.querySelector(".warning-message");
      const selectEl = draggedBlock.querySelector("select");

      makeSelectWidthDynamic(selectEl);

      warningBtn.addEventListener("click", (event) => {
        warningMsg.classList.toggle("hide");
      });

      draggedBlock.addEventListener("dragend", (event) =>
        handleBreakContinueBlock(draggedBlock, warningBtn, warningMsg)
      );
    }

    if (draggedBlock.dataset.mathType === "arithmetic-operation") {
      const leftContainer = draggedBlock.querySelector(".left-holder");
      const rightContainer = draggedBlock.querySelector(".right-holder");

      handleNewContainersListeners({
        listenToSome: [leftContainer, rightContainer],
        toInclude: MATH_WHITELIST_BLOCKS,
      });
    }

    if (
      draggedBlock.dataset.logicType === "logical-operation" ||
      draggedBlock.dataset.logicType === "boolean-operation"
    ) {
      const leftContainer = draggedBlock.querySelector(".left-holder");
      const rightContainer = draggedBlock.querySelector(".right-holder");

      handleNewContainersListeners({
        listenToSome: [leftContainer, rightContainer],
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    if (draggedBlock.dataset.logicType === "if") {
      const container = draggedBlock.children[1].children[1];
      const dataStore = draggedBlock.children[0].children[1];

      handleNewContainersListeners({
        listenToAll: [container],
        listenToSome: [dataStore],
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    if (draggedBlock.dataset.logicType === "if-else") {
      const containers = [
        draggedBlock.children[1].children[1],
        draggedBlock.children[3].children[1],
      ];
      const dataStores = [
        draggedBlock.children[0].children[1],
        draggedBlock.children[2].children[1],
      ];

      handleNewContainersListeners({
        listenToAll: containers,
        listenToSome: dataStores,
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    if (draggedBlock.dataset.logicType === "not") {
      const dataStore = draggedBlock.children[0].children[1];

      handleNewContainersListeners({
        listenToSome: [dataStore],
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    if (draggedBlock.dataset.textType === "print") {
      const dataStore = draggedBlock.children[0].children[1];

      handleNewContainersListeners({
        listenToSome: [dataStore],
        toInclude: COMMON_WHITELIST_BLOCKS,
      });
    }

    if (
      draggedBlock.dataset.textType === "single-text" ||
      draggedBlock.dataset.mathType === "single-num"
    ) {
      const inputEl = draggedBlock.querySelector("input");
      makeInputWidthDynamic(inputEl, DEFAULT_MATH_TEXT_INPUT_WIDTH);
    }

    if (draggedBlock.dataset.mathType === "single-num") {
      const inputEl = draggedBlock.querySelector("input");

      inputEl.addEventListener("change", (event) => {
        if (!Number.isInteger(+inputEl.value)) {
          inputEl.value = "";
          inputEl.style.width = DEFAULT_MATH_TEXT_INPUT_WIDTH;
        }
      });
    }
  }

  function handleCreateVariableBlockMove(block) {
    return () => {
      const { procedureId, didFound } = findAndGetProcedure(block);
      if (!didFound) {
        block.removeAttribute("data-current-procedure");
        return;
      }

      block.setAttribute("data-current-procedure", procedureId);
      updateVariablesOfThisProcedure(procedureId);
    };
  }

  function addBlockBackToSidebar(block) {
    const parentName = getSubsideName(block.dataset.blockType);
    const parentNode = document.querySelector(`.${parentName} .blocks-list`);
    const nodeIndex = +block.dataset.index;

    // if (!parentNode.childElementCount) return;

    if (!parentNode.children[nodeIndex]) {
      try {
        parentNode.appendChild(block);
        return;
      } catch (e) {
        console.error(e);
        return;
      }
    }

    try {
      parentNode.insertBefore(block, parentNode.children[nodeIndex]);
      return;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  function handleBreakContinueBlock(block, warning, message) {
    const isInsideIterator = checkIterator(block.parentNode);

    hideError(warning);

    if (isInsideIterator) return;

    showError(warning, message);
  }

  function showError(warning, message) {
    warning.classList.add("active");
    if (message.classList.contains("hide")) {
      message.classList.remove("hide");
    }
  }

  function hideError(warning) {
    if (warning.classList.contains("active")) {
      warning.classList.remove("active");
    }
  }

  function checkIterator(block) {
    // base case --> How will we know when to stop?
    if (block.classList.contains("code-blocks")) return false;

    // actual case --> What shall we do when we found our target?
    if (block.dataset.blockType === "loop") return true;

    // recursive call
    return checkIterator(block.parentNode);
  }

  function handleNewContainersListeners(config) {
    const { listenToAll, listenToSome, toInclude } = config;

    if (listenToAll?.length) {
      listenToAll.forEach((container) => listenToAllNewBlocks(container));
    }

    if (listenToSome?.length) {
      listenToSome.forEach((container) =>
        listenToSomeNewBlocks(container, { toInclude })
      );
    }
  }

  // TODO: Implement a different after block detecting algorithm for holders
  function listenToAllNewBlocks(container) {
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedBlock = document.querySelector(".dragging");
      const afterBlock = getDragAfterBlock("holder.children", e.clientY);

      if (
        container.classList.contains("all-params") &&
        draggedBlock.dataset.procedureType !== "input-value"
      )
        return;

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
        } catch {
          return;
        }
      }

      try {
        container.insertBefore(draggedBlock, afterBlock);
      } catch {
        return;
      }
    });
  }

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
        !config.toInclude.includes(draggedBlock.dataset.textType) &&
        !config.toInclude.includes(draggedBlock.dataset.procedureType)
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

  // Copy code
  const copyBtn = document.querySelector(".btn-copy-code");
  const generatedCode = document.querySelector(".code-holder");
  copyBtn.addEventListener("click", (event) => {
    navigator.clipboard.writeText(generatedCode.innerText);
    vscode.postMessage({
      command: "notifyCopied",
    });
  });

  // SIDEBAR
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

  /// Algo Func
  // C language Transpiler
  class ProgCLang {
    ////////////////// #01 Math Wrappers ////////////////////////
    createNumber(value) {
      if (value == "") {
        return 0;
      }
      return `${value}`;
    }

    createOperator(operatorType, leftOperator, rightOperator) {
      return `(${leftOperator} ${operatorType} ${rightOperator})`;
    }

    ////////////////// #02 Variable Wrappers ////////////////////
    createVariable(name, dtype, value) {
      let b = "";

      if (dtype === "string") {
        dtype = "char";
        b = "[]";
      }

      if (value != undefined) {
        return `${dtype} ${name}${b} = ${value}`;
      } else {
        return `${dtype} ${name}${b}`;
      }
    }

    setVariable(varName, varValue) {
      return `${varName} = ${varValue}`;
    }

    getVariable(varName) {
      return `${varName}`;
    }

    /////////////////// #03 Loop Wrappers ///////////////////////
    createWhileLoop(loopCondition, loopBody) {
      return `while (${loopCondition}){
    ${loopBody}
    }`;
    }

    createDoWhileLoop(loopCondition, loopBody) {
      return `do{
            ${loopBody}
        } while (${loopCondition})`;
    }

    createForLoop(i, from, till, incre, body) {
      return `for (${i} = ${from}; ${i} < ${till}; ${i} += ${incre}) {
            ${body}
        }`;
    }

    createIntruder(intruderType) {
      return `${intruderType}`;
    }

    /////////////////// #04 Logic Wrappers ////////////////////
    createIF(condition, body) {
      return `if (${condition}) {
            ${body}
        }`;
    }

    createElseIF(condition, body) {
      return `else if (${condition}) {
            ${body}
        }`;
    }

    createElse(body) {
      return `else {
            ${body}
        }`;
    }

    createSwitch(operation, cases, default_body) {
      return `switch (${operation}) {
            ${cases}
            default :
                ${default_body}
            }`;
    }

    createCase(i, body) {
      return `case ${i} :
            ${body}`;
    }

    createNot(body) {
      return `!${body}`;
    }

    ////////////////// #05 Text Wrappers ///////////////////////
    createChar(char) {
      return `'${char}'`;
    }

    createString(string) {
      return `"${string}"`;
    }

    createPrint(toPrint) {
      return `printf(${toPrint})`;
    }

    createPrintVar(dtype, toPrint) {
      return `printf("%${dtype}", ${toPrint})`;
    }

    ////////////////// #06 Procedure Wrappers //////////////////
    callFunc(name, args, end = true) {
      return `${name}(${args})`;
    }

    createProc(name, params, body, ret, retValue) {
      if (ret == false) {
        return `void ${name}(${params}) {
                ${body}
            }`;
      } else {
        return `${ret} ${name}(${params}) {
                ${body}
            return ${retValue};
            }`;
      }
    }

    ////////////////// #07 Misc. Wrappers /////////////////////
    createHeader(header) {
      return `#include <${header}>`;
    }

    createNull() {
      return `null`;
    }
  }

  ////////////////// Conversion Class /////////////////////
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
      this.headers = [];
      this.vars = {};
    }

    // 1. Code Blocks Iterator
    generateCode(lang) {
      // Selecting conversion language
      this.languageObj = this.languages[lang];
      let res = ``;
      let heads = ``;
      this.headers = [];

      for (let i = 0; i < this.root.childElementCount; i++) {
        let block = this.root.children[i];
        res += this.blocksManager(block, true) + "\n";
      }

      // Pushing header file names
      if (this.headers.length > 0) {
        for (let i = 0; i < this.headers.length; i++) {
          heads += this.languageObj.createHeader(this.headers[i]) + "\n";
        }
        // heads += "\n";
      }
      res = heads + res;
      return res;
    }

    blocksManager(block, end = false, set = false) {
      if (end) {
        end = ";";
      } else {
        end = "";
      }

      ////////////////// #01 Maths Call ////////////////////////
      if (block.dataset.blockType == "math") {
        return this.handleMath(block) + end;
      }

      ////////////////// #02 Variables Call ///////////////////
      else if (block.dataset.blockType == "variable") {
        let t = this.handleVariable(block);
        if (t != undefined) {
          return this.handleVariable(block) + end;
        } else {
          return "";
        }
      }

      ////////////////// #03 Loop Call ////////////////////////
      else if (block.dataset.blockType == "loop") {
        let t = this.handleLoop(block);
        if (t != undefined) {
          return this.handleLoop(block) + end;
        } else {
          return "";
        }
      }

      ////////////////// #04 Logics Call //////////////////////
      else if (block.dataset.blockType == "logic") {
        return this.handleLogic(block) + end;
      }

      ////////////////// #05 Texts Call ///////////////////////
      else if (block.dataset.blockType == "text") {
        return this.handleText(block, set) + end;
      }

      ////////////////// #06 Procedures Call //////////////////
      else if (block.dataset.blockType == "procedure") {
        return this.handleProc(block) + end;
      }
    }

    handleOperators(element) {
      let leftOp = 0;
      let rightOp = 0;
      let operator = element.children[1].value;
      // wrap left operand
      if (element.children[0].childElementCount > 0) {
        leftOp = this.blocksManager(element.children[0].children[0]);
      }
      // wrap right operand
      if (element.children[2].childElementCount > 0) {
        rightOp = this.blocksManager(element.children[2].children[0]);
      }
      return this.languageObj.createOperator(operator, leftOp, rightOp);
    }

    ////////////////// #01 Maths Handler ////////////////////////
    handleMath(element) {
      if (element.dataset.mathType == "single-num") {
        return this.languageObj.createNumber(element.children[0].value);
      } else if (element.dataset.mathType == "arithmetic-operation") {
        return this.handleOperators(element);
      }
    }

    ////////////////// #02 Variables Handler ////////////////////
    handleVariable(element) {
      if (element.dataset.variableType == "set-variable") {
        if (element.children[0].children[0].className != "warning active") {
          let valueElement = element.children[0].children[2].children[0];
          let val = "''";
          let varName =
            element.children[0].children[1].children[0].children[0].options[
              element.children[0].children[1].children[0].children[0]
                .selectedIndex
            ].text;

          // getting value element connected to set block (if found any)
          if (valueElement != undefined) {
            val = this.blocksManager(valueElement);
          }
          return this.languageObj.setVariable(varName, val);
        } else {
          return;
        }
      } else if (element.dataset.variableType == "get-variable") {
        if (element.children[0].children[0].className != "warning active") {
          return element.children[0].children[1].children[0].children[0]
            .options[
            element.children[0].children[1].children[0].children[0]
              .selectedIndex
          ].text;
        } else {
          return;
        }
      } else if (element.dataset.variableType == "create-variable") {
        let name = element.children[0].children[3].value;
        let valueElement = element.children[0].children[5].children[0];
        let dtype = element.children[0].children[1].value;
        let val = undefined;

        if (valueElement != undefined) {
          if (dtype == "char") {
            val = this.blocksManager(valueElement, false, true);
          } else {
            val = this.blocksManager(valueElement);
          }
        }

        this.vars[name] = dtype;
        return this.languageObj.createVariable(name, dtype, val);
      }
    }

    ////////////////// #03 Loops Handler ///////////////////////
    handleLoop(element) {
      if (element.dataset.loopType == "break-continue") {
        if (element.children[0].children[0].className != "warning active") {
          if (
            element.children[0].children[1].options[
              element.children[0].children[1].selectedIndex
            ].text == "break out"
          ) {
            return this.languageObj.createIntruder("break");
          } else {
            return this.languageObj.createIntruder("continue");
          }
        }
      } else if (
        element.dataset.loopType == "while" ||
        element.dataset.loopType == "until"
      ) {
        let loopCondition = 0;
        let loopBody = ``;
        let until = "";

        if (element.dataset.loopType == "until") {
          until = "!";
        }

        // Wrap Loop Condition
        if (element.children[0].children[1].childElementCount > 0) {
          let condition_block = element.children[0].children[1].children[0];
          loopCondition = this.blocksManager(condition_block);
        }

        // Wrap Loop Body
        if (element.children[1].children[1].childElementCount > 0) {
          for (
            let i = 0;
            i < element.children[1].children[1].childElementCount;
            i++
          ) {
            let block = element.children[1].children[1].children[i];
            loopBody += this.blocksManager(block, true);

            if (i + 1 < element.children[1].children[1].childElementCount) {
              loopBody += "\n";
            }
          }
        }
        return this.languageObj.createWhileLoop(
          until + loopCondition,
          loopBody
        );
      } else if (element.dataset.loopType == "do-while") {
        let loopCondition = 0;
        let loopBody = ``;

        // Wrap Loop Condition
        if (element.children[1].children[1].childElementCount > 0) {
          let condition_block = element.children[1].children[1].children[0];
          loopCondition = this.blocksManager(condition_block);
        }

        // Wrap Loop Body
        if (element.children[0].children[1].childElementCount > 0) {
          for (
            let i = 0;
            i < element.children[0].children[1].childElementCount;
            i++
          ) {
            let block = element.children[0].children[1].children[i];
            loopBody += this.blocksManager(block, true);

            if (i + 1 < element.children[0].children[1].childElementCount) {
              loopBody += "\n";
            }
          }
        }
        return this.languageObj.createDoWhileLoop(loopCondition, loopBody);
      } else if (element.dataset.loopType == "for") {
        let var_block = "__select__";
        let from = 0;
        let till = 0;
        let increm = 0;
        let loopBody = "";

        // Wrap Loop Variable
        if (
          element.children[0].children[1].children[0].children[0] != undefined
        ) {
          var_block = this.blocksManager(
            element.children[0].children[1].children[0].children[0]
          );
        }

        if (
          element.children[0].children[1].children[2].children[0] != undefined
        ) {
          from = this.blocksManager(
            element.children[0].children[1].children[2].children[0]
          );
        }

        if (
          element.children[0].children[1].children[4].children[0] != undefined
        ) {
          till = this.blocksManager(
            element.children[0].children[1].children[4].children[0]
          );
        }

        if (
          element.children[0].children[1].children[6].children[0] != undefined
        ) {
          increm = this.blocksManager(
            element.children[0].children[1].children[6].children[0]
          );
        }

        // Wrap Loop Body
        if (element.children[1].children[1].childElementCount > 0) {
          for (
            let i = 0;
            i < element.children[1].children[1].childElementCount;
            i++
          ) {
            let block = element.children[1].children[1].children[i];
            loopBody += this.blocksManager(block, true);

            if (i + 1 < element.children[1].children[1].childElementCount) {
              loopBody += "\n";
            }
          }
        }

        return this.languageObj.createForLoop(
          var_block,
          from,
          till,
          increm,
          loopBody
        );
      }
    }

    ////////////////// #04 Logics Handler ///////////////////////
    handleLogic(element) {
      if (
        element.dataset.logicType == "logical-operation" ||
        element.dataset.logicType == "boolean-operation"
      ) {
        return this.handleOperators(element);
      } else if (element.dataset.logicType == "if") {
        let condition = 0;
        let body = "";

        if (element.children[0].children[1].children[0] != undefined) {
          condition = this.blocksManager(
            element.children[0].children[1].children[0]
          );
        }

        if (element.children[1].children[1].childElementCount > 0) {
          for (
            let i = 0;
            i < element.children[1].children[1].childElementCount;
            i++
          ) {
            let block = element.children[1].children[1].children[i];
            body += this.blocksManager(block, true);

            if (i + 1 < element.children[1].children[1].childElementCount) {
              body += "\n";
            }
          }
        }
        return this.languageObj.createIF(condition, body);
      } else if (element.dataset.logicType == "switch-case") {
        return "0";
      } else if (element.dataset.logicType == "not") {
        let valueBlock = 1;

        if (element.children[0].children[1].children[0] != undefined) {
          valueBlock = this.blocksManager(
            element.children[0].children[1].children[0]
          );
        }
        return this.languageObj.createNot(valueBlock);
      } else if (element.dataset.logicType == "boolean") {
        if (!this.headers.includes("stdbool.h")) {
          this.headers.push("stdbool.h");
        }
        return element.children[0].children[0].options[
          element.children[0].children[0].selectedIndex
        ].text;
      }
    }

    ////////////////// #05 Texts Handler ////////////////////////
    handleText(element, set = false) {
      if (element.dataset.textType == "single-text") {
        let opr = this.languageObj.createString;

        if (set == true) {
          opr = this.languageObj.createChar;
        }

        return opr(element.children[0].value);
      } else if (element.dataset.textType == "print") {
        if (!this.headers.includes("stdio.h")) {
          this.headers.push("stdio.h");
        }
        let valueBlock = element.children[0].children[1].children[0];
        // console.log(valueBlock, valueBlock.dataset.blockType);
        if (valueBlock != undefined) {
          if (valueBlock.dataset.blockType == "text") {
            valueBlock = this.handleText(valueBlock);
          } else if (valueBlock.dataset.blockType == "logic") {
            if (valueBlock.dataset.logicType == "boolean") {
              // console.log("print got:", valueBlock.dataset.logicType);
              valueBlock = this.handleLogic(valueBlock);
            }
            // console.log("bool");
          } else if (valueBlock.dataset.blockType == "math") {
            valueBlock = this.handleMath(valueBlock);
          } else if (valueBlock.dataset.blockType == "variable") {
            if (valueBlock.dataset.variableType == "get-variable") {
              valueBlock = this.blocksManager(valueBlock);
              let dtype = this.vars[valueBlock];
              if (dtype == "int" || dtype == "bool") {
                dtype = "d";
              } else if (dtype == "float" || dtype == "double") {
                dtype = "f";
              } else if (dtype == "string") {
                dtype = "s";
              } else if (dtype == "char") {
                dtype = "c";
              }
              return this.languageObj.createPrintVar(dtype, valueBlock);
            }
          }
        } else {
          valueBlock = "";
        }

        return this.languageObj.createPrint(valueBlock);
      }
    }

    ////////////////// #06 Procedures Handler ///////////////////
    handleProc(element) {
      if (element.dataset.procedureType == "call-void") {
        let args = "";
        if (element.children[1].childElementCount > 0) {
          for (let i = 0; i < element.children[1].childElementCount; i++) {
            let block = element.children[1].children[i];
            let to_add = "";
            if (block.children[1].childElementCount > 0) {
              let val_block = block.children[1].children[0];
              to_add = this.blocksManager(val_block);
              args += to_add + ", ";
            } else {
              args += "null, ";
            }
          }
        }
        return this.languageObj.callFunc(element.children[0].innerText, args);
      } else if (
        element.dataset.procedureType == "return" ||
        element.dataset.procedureType == "no-return"
      ) {
        let name = element.children[0].children[2].value;
        let params = element.children[0].children[4].textContent;
        let proc_body = ``;
        let proc_type = false;
        let return_value = "";

        if (element.children[1].children[0].childElementCount > 0) {
          for (
            let i = 0;
            i < element.children[1].children[0].childElementCount;
            i++
          ) {
            let block = element.children[1].children[0].children[i];
            proc_body += this.blocksManager(block, true);

            if (i + 1 < element.children[1].children[0].childElementCount) {
              proc_body += "\n";
            }
          }
        }

        if (element.dataset.procedureType != "no-return") {
          proc_type = element.children[2].children[1].value;
          return_value = element.children[2].children[2].children[0];

          if (return_value != undefined) {
            return_value = this.blocksManager(return_value);
          } else {
            if (
              proc_type == "int" ||
              proc_type == "double" ||
              proc_type == "float"
            ) {
              return_value = 0;
            } else if (proc_type == "string" || proc_type == "char") {
              return_value = "''";
            }
          }
        }
        return this.languageObj.createProc(
          name,
          params,
          proc_body,
          proc_type,
          return_value
        );
      }
    }
  }

  // Code Appearance
  const generateCodeBtn = document.querySelector(".code-generate-btn");
  const codeGeneration = new BlocktoCode();

  generateCodeBtn.addEventListener("click", (e) => {
    const code = codeGeneration.generateCode("c");
    console.log(code);
    vscode.postMessage({
      command: "beautifyC",
      payload: code,
    });
  });

  // const generateCodeBtn = document.querySelector(".code-generate-btn");
  // const codeHolder = document.querySelector(".code-holder");
  // const codeGeneration = new BlocktoCode();

  // generateCodeBtn.addEventListener("click", (e) => {
  //   const code = codeGeneration.generateCode("c");
  // vscode.postMessage({
  //   command: "beautifyC",
  //   payload: code,
  // });
  // });

  window.addEventListener("message", (e) => {
    if (e.data.command === "codeGenerate") {
      const code = e.data.payload;
      const codeHolder = document.querySelector(".code-holder");
      codeHolder.innerHTML = code
        .replace(/</g, "&lt")
        .replace(/>/g, "&gt")
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
