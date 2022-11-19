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
			</head>
      <body>
        <h1>Wanna drag some code?</h1>
        <button id="loop-for" draggable="true">For Loop</button>
				<script nonce="${nonce}" src="${scriptMainUri}"></script>
			</body>
			</html>`;
  }
}

class GenerateCodeOnDropProvider {
  async provideDocumentDropEdits(_document, position, dataTransfer, token) {
    // Check the data transfer to see if we have some kind of text data
    const dataTransferItem = dataTransfer.get("text/plain");
    if (!dataTransferItem) {
      return undefined;
    }
    const text = await dataTransferItem.asString();
    console.log(text);
    if (token.isCancellationRequested) {
      return undefined;
    }
    // Build a snippet to insert
    const snippet = new vscode.SnippetString();

    snippet.appendText(text);
    return { insertText: snippet };
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
