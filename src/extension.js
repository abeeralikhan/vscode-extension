const vscode = require("vscode");
const getNonce = require("./getNounce");
const beautify = require("js-beautify").js_beautify;

function beautifyC(code) {
  // Set options for beautify
  const options = {
    indent_size: 1,
    indent_char: "\t",
    preserve_newlines: true,
    brace_style: "expand",
    space_before_conditional: true,
  };
  // beautify the code
  return beautify(code, options);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("dragme.start", () => {
      // Create and show a new webview
      const panel = vscode.window.createWebviewPanel(
        "mainPanel", // Identifies the type of the webview. Used internally
        "Drag Me", // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {} // Webview options. More on these later.

        // And set its HTML content
      );

      panel.webview.options = {
        enableScripts: true,
        enableModals: true,
      };

      // And set its HTML content
      panel.webview.html = getWebviewContent(
        panel.webview,
        context.extensionUri
      );

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "prompt") {
          while (true) {
            let newVariableName = await vscode.window.showInputBox();
            if (!newVariableName) return;

            if (newVariableName.includes(" "))
              newVariableName = newVariableName.split(" ").join("_");

            if (message.payload.includes(newVariableName)) {
              vscode.window.showWarningMessage("Variable name already exist");
              continue;
            }

            panel.webview.postMessage({
              command: "addNewVariable",
              payload: newVariableName,
            });
            return;
          }
        }

        if (message.command === "beautifyC") {
          const code = beautifyC(message.payload);
          panel.webview.postMessage({
            command: "codeGenerate",
            payload: code,
          });
          return;
        }
      });
    })
  );
}

function getWebviewContent(webview, extensionUri) {
  const mainURI = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "main.js")
  );
  const mainStyleURI = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "main.css")
  );
  const sidebarStyleURI = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "sidebar.css")
  );
  // const resetStyleURI = webview.asWebviewUri(
  //   vscode.Uri.joinPath(extensionUri, "media", "reset.css")
  // );
  // const vscodeStyleURI = webview.asWebviewUri(
  //   vscode.Uri.joinPath(extensionUri, "media", "vscode.css")
  // );

  const playBtnURI = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "play-circle-outline.svg")
  );

  const trashBtnURI = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "trash-bin-outline.svg")
  );

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
      />
      <link href="${mainStyleURI}" rel="stylesheet">
      <link href="${sidebarStyleURI}" rel="stylesheet">

    </head>
    <body>
    <div class="canvas">
      <div class="constructs-area area">
        <div class="grid">
          <nav class="side-navbar">
            <ul>
              <!-- Math nav section -->
              <li class="navs math-nav">
                <p>Math</p>
                <aside class="target-div math-subside hidden">
                  <div class="parent-overlay-bar">
                    <div class="sidebar-header">
                      <span class="material-symbols-outlined"> close </span>
                    </div>
                    <div class="blocks-list">
                      <div
                        class="data-block centered persist"
                        data-index="0"
                        data-block-type="math"
                        data-math-type="single-num"
                        data-dtype="number"
                        draggable="true"
                      >
                        <input type="text" />
                      </div>
                      <div
                        class="data-block centered persist"
                        data-index="1"
                        data-block-type="math"
                        data-math-type="arithmetic-operation"
                        draggable="true"
                      >
                        <div class="left-holder holder"></div>

                        <select name="arithmetic-operators">
                          <option value="+" selected>+</option>
                          <option value="-">-</option>
                          <option value="*">x</option>
                          <option value="/">÷</option>
                          <option value="%">%</option>
                        </select>
                        <div class="right-holder holder"></div>
                      </div>
                    </div>
                  </div>
                </aside>
              </li>

              <!-- variable nav section -->
              <li class="navs var-nav">
                <p>Variables</p>
                <aside class="target-div variable-subside hidden">
                  <div class="parent-overlay-bar">
                    <div class="sidebar-header">
                      <span class="material-symbols-outlined"> close </span>
                    </div>
                    <div class="blocks-list">
                      <div
                        class="code-block persist"
                        data-index="0"
                        data-block-type="variable"
                        data-variable-type="create-variable"
                        draggable="true"
                      >
                        <div class="block-header centered">
                          <p class="description">variable, type</p>
                          <select name="datatype">
                            <option value="int" selected>integer</option>
                            <option value="float">float</option>
                            <option value="double">double</option>
                            <option value="char">character</option>
                            <option value="string">string</option>
                          </select>
                          <p class="description">name</p>
                          <input
                            type="text"
                            class="variable-name"
                            name="variable-name"
                          />
                          <p class="description">initial value</p>
                          <!-- data-store section -->
                          <div class="data-store"></div>
                          <!-- data-store section -->
                        </div>
                      </div>
                      <div
                        class="code-block persist"
                        data-index="1"
                        data-block-type="variable"
                        data-variable-type="set-variable"
                        draggable="true"
                      >
                        <div class="block-header centered">
                          <div class="warning">
                            !
                            <div class="warning-message">
                              <div class="description">
                                Warning: This block may only be used within a
                                function.
                              </div>
                            </div>
                          </div>
                          <p class="description">
                            set
                            <label
                              for="variable-list"
                              class="variable-name variable-list"
                            >
                              <select name="variable-name">
                                <option value="default" selected>
                                  --Select--
                                </option>
                                <optgroup
                                  class="vars-section"
                                  label="variables"
                                ></optgroup>
                                <optgroup
                                  class="args-section"
                                  label="arguements"
                                ></optgroup>
                              </select>
                            </label>
                            to
                          </p>
                          <!-- data-store section -->
                          <div class="data-store"></div>
                          <!-- data-store section -->
                        </div>
                      </div>
                      <div
                        class="code-block persist"
                        data-index="2"
                        data-block-type="variable"
                        data-variable-type="get-variable"
                        data-variable-name="value"
                        draggable="true"
                      >
                        <div class="block-header centered">
                          <div class="warning">
                            !
                            <div class="warning-message">
                              <div class="description">
                                Warning: This block may only be used within a
                                function.
                              </div>
                            </div>
                          </div>
                          <p class="description">
                            get
                            <label
                              for="variable-list"
                              class="variable-name variable-list"
                            >
                              <select name="variable-name">
                                <option value="default" selected>
                                  --Select--
                                </option>
                                <optgroup
                                  class="vars-section"
                                  label="variables"
                                ></optgroup>
                                <optgroup
                                  class="args-section"
                                  label="arguements"
                                ></optgroup>
                              </select>
                            </label>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </li>

              <!-- loop nav section -->
              <li class="navs for-nav">
                <p>Loops</p>
                <aside class="target-div loop-subside hidden">
                  <div class="parent-overlay-bar">
                    <div class="sidebar-header">
                      <span class="material-symbols-outlined">close</span>
                    </div>
                    <div class="blocks-list">
                      <!-- While Loop -->
                      <div
                        class="persist"
                        data-index="0"
                        data-block-type="loop"
                        data-loop-type="while"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <p class="description">repeat "while"</p>
                          <!-- data-store section start -->
                          <div class="data-store"></div>
                          <!-- data-store section end -->
                        </div>
                        <div class="block-body code-block centered">
                          <p class="description">do</p>
                          <div class="holder children"></div>
                        </div>
                      </div>

                      <!-- Until loop -->
                      <div
                        class="persist"
                        data-index="1"
                        data-block-type="loop"
                        data-loop-type="until"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <p class="description">repeat "until"</p>
                          <!-- data-store section start -->
                          <div class="data-store"></div>
                          <!-- data-store section end -->
                        </div>
                        <div class="block-body code-block centered">
                          <p class="description">do</p>
                          <div class="holder children"></div>
                        </div>
                      </div>

                      <!-- Do while loop -->
                      <div
                        class="persist"
                        data-index="2"
                        data-block-type="loop"
                        data-loop-type="do-while"
                        draggable="true"
                      >
                        <div class="block-body code-block centered">
                          <p class="description">do</p>
                          <div class="holder children"></div>
                        </div>
                        <div class="block-header code-block centered">
                          <p class="description">repeat "while"</p>
                          <!-- data-store section start -->
                          <div class="data-store"></div>
                          <!-- data-store section end -->
                        </div>
                      </div>

                      <!-- For Loop -->
                      <div
                        class="persist"
                        data-index="3"
                        data-block-type="loop"
                        data-loop-type="for"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <p class="description">repeat with</p>
                          <div
                            class="data-block centered persist"
                            data-index="1"
                            data-block-type="math-block"
                            data-math-type="arithmetic-operation"
                            draggable="true"
                          >
                            <div class="data-store loop"></div>

                            <p class="description">from</p>
                            <div class="data-store"></div>
                            <p class="description">to</p>
                            <div class="data-store"></div>
                            <p class="description">by</p>
                            <div class="data-store"></div>
                          </div>
                        </div>
                        <div class="block-body code-block centered">
                          <p class="description">do</p>
                          <div class="holder children"></div>
                        </div>
                      </div>

                      <!-- break and continue block -->
                      <div
                        class="persist"
                        data-index="4"
                        data-block-type="loop"
                        data-loop-type="break-continue"
                        draggable="true"
                      >
                        <div class="block-header centered">
                          <div class="warning">
                            !
                            <div class="warning-message">
                              <div class="description">
                                Warning: This block may only be used within a
                                loop.
                              </div>
                            </div>
                          </div>
                          <select name="break-continue-loop">
                            <option value="break out">break out</option>
                            <option value="continue with next iteration">
                              continue with next iteration
                            </option>
                          </select>
                          <p class="description">of loop</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </li>

              <!-- condition nav section -->
              <li class="navs condition-nav">
                <p>Logic</p>
                <aside class="target-div logic-subside hidden">
                  <div class="parent-overlay-bar">
                    <div class="sidebar-header">
                      <span class="material-symbols-outlined"> close </span>
                    </div>
                    <div class="blocks-list">
                      <!-- Just If -->
                      <div
                        class="persist"
                        data-index="0"
                        data-block-type="logic"
                        data-logic-type="if"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <p class="description">if</p>
                          <!-- data-store section start -->
                          <div class="data-store"></div>
                          <!-- data-store section end -->
                        </div>
                        <div class="block-body code-block centered">
                          <p class="description">do</p>
                          <div class="holder children"></div>
                        </div>
                      </div>

                      <!-- Switch Case -->
                      <!-- <div
                      class="persist"
                      data-index="1"
                      data-block-type="logic"
                      data-logic-type="if-else"
                      draggable="true"
                    >
                      <div class="block-header code-block centered">
                        <p class="description">
                          if following value <br />matches with nothing
                        </p>
                        <div class="data-store"></div>
                      </div>
                      <div class="block-body if code-block centered">
                        <p class="description">do</p>
                        <div class="holder children if"></div>
                      </div>

                      <div class="block-header code-block centered else">
                        <p class="description">matches with</p>
                        <div class="data-store"></div>
                      </div>
                      <div class="block-body code-block centered else">
                        <p class="description">do</p>
                        <div class="holder children"></div>
                      </div>
                    </div> -->

                      <!-- Logical Block -->
                      <div
                        class="data-block centered persist"
                        data-index="2"
                        data-block-type="logic"
                        data-logic-type="logical-operation"
                        draggable="true"
                      >
                        <div class="left-holder holder"></div>
                        <select name="logical-operation">
                          <option value="==" selected>=</option>
                          <option value="!=">≠</option>
                          <option value="<"><</option>
                          <option value="<=">≤</option>
                          <option value=">">></option>
                          <option value=">=">≥</option>
                        </select>
                        <div class="right-holder holder"></div>
                      </div>

                      <!-- Boolean Block -->
                      <div
                        class="data-block centered persist"
                        data-index="3"
                        data-block-type="logic"
                        data-logic-type="boolean-operation"
                        draggable="true"
                      >
                        <div class="left-holder holder"></div>
                        <select name="boolean-operation">
                          <option value="&&" selected>and</option>
                          <option value="||">or</option>
                        </select>
                        <div class="right-holder holder"></div>
                      </div>

                      <!-- not block -->
                      <div
                        class="persist"
                        data-index="4"
                        data-block-type="logic"
                        data-logic-type="not"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <p class="description">not</p>
                          <!-- data-store section start -->
                          <div class="data-store"></div>
                          <!-- data-store section end -->
                        </div>
                      </div>

                      <!-- boolean block -->
                      <div
                        class="persist"
                        data-index="5"
                        data-block-type="logic"
                        data-logic-type="boolean"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <select name="boolean">
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </li>

              <li class="navs text-nav">
                <p>Text</p>
                <aside class="target-div text-subside hidden">
                  <div class="parent-overlay-bar">
                    <div class="sidebar-header">
                      <span class="material-symbols-outlined"> close </span>
                    </div>
                    <div class="blocks-list">
                      <div
                        class="data-block centered persist"
                        data-index="0"
                        data-block-type="text"
                        data-text-type="single-text"
                        data-dtype="string"
                        draggable="true"
                      >
                        "
                        <input type="text" />
                        "
                      </div>

                      <!-- print block -->
                      <div
                        class="persist"
                        data-index="1"
                        data-block-type="text"
                        data-text-type="print"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <p class="description">print</p>
                          <!-- data-store section start -->
                          <div class="data-store"></div>
                          <!-- data-store section end -->
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </li>

              <!-- procedure nav section -->
              <li class="navs procedure-nav">
                <p>Procedure</p>
                <aside class="target-div procedure-subside hidden">
                  <div class="parent-overlay-bar">
                    <div class="sidebar-header">
                      <span class="material-symbols-outlined"> close </span>
                    </div>
                    <div class="blocks-list">
                      <!-- Procedure without return -->
                      <div
                        class="persist"
                        data-index="0"
                        data-block-type="procedure"
                        data-procedure-type="no-return"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <span class="btn-parameter-store">+</span>
                          <p class="description">function name</p>
                          <input type="text" class="procedure-name" />
                          <p class="description param-prefix hide">with:</p>
                          <p class="description parameter-display"></p>
                          <!-- parameter-store start -->
                          <div class="parameter-store hide">
                            <div class="create-new-parameter">
                              <label for="parameter-input">Input name</label>
                              <div>
                                <input type="text" class="parameter-input" />
                                <button>></button>
                              </div>
                            </div>
                            <div class="view-parameters">
                              <div
                                data-block-type="procedure"
                                data-procedure-type="input"
                              >
                                <div class="block-header code-block centered">
                                  <p class="description">inputs</p>
                                </div>
                                <div class="block-body code-block centered">
                                  <div class="holder children all-params"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- parameter-store end -->
                        </div>
                        <div class="block-body code-block centered">
                          <div class="holder children procedure"></div>
                        </div>
                      </div>

                      <!-- Procedure w/ return -->
                      <div
                        class="persist"
                        data-index="1"
                        data-block-type="procedure"
                        data-procedure-type="return"
                        draggable="true"
                      >
                        <div class="block-header code-block centered">
                          <span class="btn-parameter-store">+</span>
                          <p class="description">function name</p>
                          <input type="text" class="procedure-name" />
                          <p class="description param-prefix hide">with:</p>
                          <p class="description parameter-display"></p>
                          <!-- parameter-store start -->
                          <div class="parameter-store hide">
                            <div class="create-new-parameter">
                              <label for="parameter-input">Input name</label>
                              <div>
                                <input type="text" class="parameter-input" />
                                <button>></button>
                              </div>
                            </div>
                            <div class="view-parameters">
                              <div
                                data-block-type="procedure"
                                data-procedure-type="input"
                              >
                                <div class="block-header code-block centered">
                                  <p class="description">inputs</p>
                                </div>
                                <div class="block-body code-block centered">
                                  <div class="holder children all-params"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- parameter-store end -->
                        </div>
                        <div
                          class="block-body code-block centered return-footer"
                        >
                          <div class="holder children procedure"></div>
                        </div>
                        <div class="block-footer">
                          <p>return</p>
                          <select name="datatype">
                            <option value="int" selected>integer</option>
                            <option value="float">float</option>
                            <option value="double">double</option>
                            <option value="char">character</option>
                            <option value="string">string</option>
                          </select>
                          <div class="data-store"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </li>
            </ul>
          </nav>

          <!-- Below is a sensitive region -->
          <div class="code-blocks-area area">
            <div class="root area">
              <div class="code-blocks">
                <div
                  class="main-func"
                  data-block-type="procedure"
                  data-procedure-type="return"
                  data-procedure-id="P0"
                >
                  <div class="block-header code-block centered">
                    <span></span>
                    <p class="description">function name</p>
                    <input
                      type="text"
                      class="procedure-name"
                      value="main"
                      disabled
                    />
                    <p class="description param-prefix hide">with:</p>
                    <p class="description parameter-display"></p>
                    <!-- parameter-store start -->
                    <div class="parameter-store hide">
                      <div class="create-new-parameter">
                        <label for="parameter-input">Input name</label>
                        <div>
                          <input type="text" class="parameter-input" />
                          <button>></button>
                        </div>
                      </div>
                      <div class="view-parameters">
                        <div
                          data-block-type="procedure"
                          data-procedure-type="input"
                        >
                          <div class="block-header code-block centered">
                            <p class="description">inputs</p>
                          </div>
                          <div class="block-body code-block centered">
                            <div class="holder children all-params"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- parameter-store end -->
                  </div>
                  <div class="block-body code-block centered return-footer">
                    <div class="holder children procedure"></div>
                  </div>
                  <div class="block-footer">
                    <p>return</p>
                    <select name="datatype" disabled>
                      <option value="int" selected>integer</option>
                      <option value="float">float</option>
                      <option value="double">double</option>
                      <option value="char">character</option>
                      <option value="string">string</option>
                    </select>
                    <div class="data-store"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="code-delete-btn">
              <img src="${trashBtnURI}" alt="bin" />
            </div>
          </div>
        </div>
      </div>

      <div class="code-generate-area area">
        <div class="header">
          <h2 class="title">Code - C Language</h2>
        </div>
        <div class="body">
          <p class="code-holder">int count = 0;</p>
          <div class="code-generate-btn">
            <img src="${playBtnURI}" alt="play" />
          </div>
        </div>
      </div>
    </div>
  </body>

  <script nonce="${getNonce}" src="${mainURI}"></script>
</html>`;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
