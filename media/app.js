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
          } else if (valueElement.dataset.mathType == "arithmetic-operation") {
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
        element.children[0].children[0].dataset.logicType == "logical-operation"
      ) {
        leftOp = this.handleOperators(element.children[0].children[0]);
      } else if (
        element.children[0].children[0].dataset.logicType == "boolean-operation"
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
        element.children[2].children[0].dataset.logicType == "logical-operation"
      ) {
        rightOp = this.handleOperators(element.children[2].children[0]);
      } else if (
        element.children[2].children[0].dataset.logicType == "boolean-operation"
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
        element.children[0].children[1].children[0].dataset.dtype == "number" ||
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

let docObj = new BlocktoCode();
