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
  const resetStyleURI = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "reset.css")
  );
  const vscodeStyleURI = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "vscode.css")
  );

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
                  <div class="create-var-section">
                    <div class="code-block create-var" data-index="0">
                      <div class="block-header centered">
                        <p class="description">Create a new variable...</p>
                      </div>
                    </div>
                  </div>
                  <div class="blocks-list hidden">
                    <div
                      class="code-block persist"
                      data-index="0"
                      data-block-type="variable"
                      data-variable-type="set-variable"
                      draggable="true"
                    >
                      <div class="block-header centered">
                        <p class="description">
                          set
                          <label
                            for="variable-list"
                            class="variable-name variable-list"
                          >
                            <select name="variable-name"></select>
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
                      data-index="1"
                      data-block-type="variable"
                      data-variable-type="get-variable"
                      data-variable-name="value"
                      draggable="true"
                    >
                      <div class="block-header centered">
                        <p class="description">
                          get
                          <label
                            for="variable-list"
                            class="variable-name variable-list"
                          >
                            <select name="variable-name"></select>
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
                        <div class="holder children dragged-over"></div>
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
                    <div
                      class="data-block centered persist"
                      data-index="0"
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

                    <div
                      class="data-block centered persist"
                      data-index="1"
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
                      data-math-type="single-text"
                      data-dtype="string"
                      draggable="true"
                    >
                      "
                      <input type="text" />
                      "
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
                  <div class="blocks-list"><span>In progress...</span></div>
                </div>
              </aside>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Below is a sensitive region -->
      <div class="code-blocks-area area">
        <div class="root area">
          <div class="code-blocks"></div>
        </div>
        <div class="code-delete-btn">
          <img src="${trashBtnURI}" alt="bin" />
        </div>
      </div>

      <div class="code-generate-area area">
        <h2 class="title">Code - C Language</h2>
        <span class="code-holder"></span>
        <div class="code-generate-btn">
          <img src="${playBtnURI}" alt="play" />
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
