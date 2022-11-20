const vscode = require("vscode");
const getNonce = require("./getNounce");

class SidebarProvider {
  _view;
  _doc;

  constructor(extensionUri) {
    this.extensionUri = extensionUri;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }

  revive(panel) {
    this._view = panel;
  }

  _getHtmlForWebview(webview) {
    // Below is the default CSS
    // That we will add with every view
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "vscode.css")
    );
    const styleSidebar = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "sidebar.css")
    );

    const scriptMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "main.js")
    );

    // const styleMainUri = webview.asWebviewUri(
    //   vscode.Uri.joinPath(this.extensionUri, "media", "compiled/sidebar.css")
    // );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleSidebar}" rel="stylesheet">
			</head>
      <body>
				<header>
					<label for="select-file">Select a file: </label>
					<select name="select-file" id="select-file">
						<option value="test.py">test.py</option>
						<option value="main.js">main.js</option>
					</select> 
				</header>
				<main>
					<section class="variables-section">
						<h2 class="secondary-heading">Variables</h2>
						<div id="variable-block" class="block" draggable="true">
              <div>
                <input type="text" name="var-name" placeholder="Label"/>
                <select name="select-var-type" id="select-var-type">
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <!-- <option value="boolean">Boolean</option> -->
                  <!-- <option value="array">Array</option> -->
                </select>  
              </div>
              <div class="variable-block-input">
							  <input type="text" name="var-value" placeholder="Value"/>
              </div>
						</div>
					</section>
          <section class="conditions-section">
						<h2 class="secondary-heading">Logical Statements</h2>
						
					</section>
					<!-- <button id="loop-for" draggable="true">For Loop</button> -->
				</main>

				<script nonce="${nonce}" src="${scriptMainUri}"></script>
			</body>
			</html>`;
  }
}

class GenerateCodeOnDropProvider {
  async provideDocumentDropEdits(_document, position, dataTransfer, token) {
    // Check the data transfer to see if we have some kind of text data
    const blockIdRaw = dataTransfer.get("text/plain");
    const blockId = await blockIdRaw.asString();

    const dataTransferItem = dataTransfer.get(
      this.getDataTransferValue(blockId)
    );

    if (!dataTransferItem) {
      return undefined;
    }
    const text = await dataTransferItem.asString();

    if (token.isCancellationRequested) {
      return undefined;
    }
    // Build a snippet to insert
    const snippet = new vscode.SnippetString();

    snippet.appendText(text);
    return { insertText: snippet };
  }

  getDataTransferValue(dataTransferItemId) {
    switch (dataTransferItemId) {
      case "variable-block": {
        return "text/x-python";
      }
    }
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  // Enable our providers in plaintext files
  const selector = { language: "python" };

  // Sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("dragMe-sidebar", sidebarProvider)
  );

  // Drag-N-Drop
  context.subscriptions.push(
    vscode.languages.registerDocumentDropEditProvider(
      selector,
      new GenerateCodeOnDropProvider()
    )
  );
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
