import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { HistoryItem, RequestTab, ResponseData, CollectionItem } from '../models/types';
import { HistoryProvider } from '../providers/HistoryProvider';
import { CollectionsProvider } from '../providers/CollectionsProvider';

export class RestClientPanel {
  public static currentPanel: RestClientPanel | undefined;
  private static readonly viewType = 'restClientPro';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    historyProvider: HistoryProvider,
    collectionsProvider: CollectionsProvider,
    initialRequest?: Partial<RequestTab>,
    forceNew = false,
    createHistory = false
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const requestToOpen = createHistory
      ? {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          __createHistory: true,
          ...initialRequest,
        }
      : initialRequest;

    if (RestClientPanel.currentPanel && !forceNew) {
      RestClientPanel.currentPanel._panel.reveal(column);
      if (requestToOpen) {
        RestClientPanel.currentPanel.openRequest(requestToOpen);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      RestClientPanel.viewType,
      'Pursue-Post',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview', 'dist'),
          vscode.Uri.joinPath(extensionUri, 'media'),
        ],
      }
    );

    RestClientPanel.currentPanel = new RestClientPanel(
      panel,
      extensionUri,
      context,
      historyProvider,
      collectionsProvider
    );

    if (requestToOpen) {
      RestClientPanel.currentPanel.openRequest(requestToOpen);
    }
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    private readonly historyProvider: HistoryProvider,
    private readonly collectionsProvider: CollectionsProvider
  ) {
    this._panel = panel;
    this._context = context;
    this._panel.webview.html = this._getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (msg) => this._handleMessage(msg),
      null,
      this._disposables
    );
    this._loadSavedTabs();
  }

  private openRequest(request: Partial<RequestTab>) {
    setTimeout(() => {
      this._panel.webview.postMessage({
        type: 'openRequest',
        payload: request,
      });
    }, 500);
  }

  private async _handleMessage(message: { type: string; payload?: unknown }) {
    switch (message.type) {
      case 'executeRequest':
        await this._executeRequest(message.payload as RequestTab);
        break;
      case 'saveToHistory':
        this._saveToHistory(message.payload as HistoryItem);
        break;
      case 'createHistoryFromRequest': {
        const tab = message.payload as RequestTab;
        const item: HistoryItem = {
          id: Date.now().toString(),
          method: tab.method,
          url: tab.url,
          timestamp: Date.now(),
          request: tab,
        };
        const created = this.historyProvider.addItem(item);
        this._panel.webview.postMessage({ type: 'historyCreated', payload: { tabId: tab.id, item: created } });
        break;
      }
      case 'getCollections':
        this._panel.webview.postMessage({
          type: 'collections',
          payload: this.collectionsProvider.getCollections(),
        });
        break;
      case 'getHistory':
        this._panel.webview.postMessage({
          type: 'history',
          payload: this.historyProvider.getHistory(),
        });
        break;
      case 'openHistoryEditor': {
        const item = message.payload as HistoryItem;
        const content = JSON.stringify(item.request, null, 2);
        vscode.workspace.openTextDocument({ content, language: 'json' }).then((doc) =>
          vscode.window.showTextDocument(doc, { preview: false })
        );
        break;
      }
      case 'deleteHistoryItem': {
        const id = message.payload as string;
        this.historyProvider.deleteItem(id);
        this._panel.webview.postMessage({
          type: 'history',
          payload: this.historyProvider.getHistory(),
        });
        break;
      }
      case 'renameHistoryItem': {
        const { id, name } = message.payload as { id: string; name: string };
        const existing = this.historyProvider
          .getHistory()
          .find((item) => item.id === id);
        if (existing) {
          this.historyProvider.updateItem(id, {
            request: {
              ...existing.request,
              name,
            },
          });
          this._panel.webview.postMessage({
            type: 'history',
            payload: this.historyProvider.getHistory(),
          });
        }
        break;
      }
      case 'saveToCollection': {
        const { collectionId, item } = message.payload as {
          collectionId: string;
          item: CollectionItem;
        };
        this.collectionsProvider.addItemToCollection(collectionId, item);
        this._panel.webview.postMessage({
          type: 'collections',
          payload: this.collectionsProvider.getCollections(),
        });
        break;
      }
      case 'createCollection': {
        this.collectionsProvider.addCollection(message.payload as string);
        this._panel.webview.postMessage({
          type: 'collections',
          payload: this.collectionsProvider.getCollections(),
        });
        vscode.window.showInformationMessage(
          `Collection "${message.payload as string}" created!`
        );
        break;
      }
      case 'loadTabs':
        await this._loadSavedTabs();
        break;
      case 'saveTabs':
        await this._saveTabs(message.payload as RequestTab[]);
        break;
    }
  }

  private _saveToHistory(item: HistoryItem) {
    this.historyProvider.addItem(item);
  }

  private async _executeRequest(request: RequestTab) {
    const startTime = Date.now();
    try {
      const url = new URL(this._buildUrl(request));

      request.queryParams
        .filter((p) => p.enabled && p.key)
        .forEach((p) => url.searchParams.append(p.key, p.value));

      if (
        request.auth.type === 'api-key' &&
        request.auth.apiKeyLocation === 'query' &&
        request.auth.apiKeyName
      ) {
        url.searchParams.append(
          request.auth.apiKeyName,
          request.auth.apiKeyValue ?? ''
        );
      }

      const headers: Record<string, string> = {};
      request.headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          headers[h.key] = h.value;
        });

      if (request.auth.type === 'bearer' && request.auth.bearerToken) {
        headers['Authorization'] = `Bearer ${request.auth.bearerToken}`;
      } else if (request.auth.type === 'basic') {
        const creds = Buffer.from(
          `${request.auth.basicUsername}:${request.auth.basicPassword}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${creds}`;
      } else if (
        request.auth.type === 'api-key' &&
        request.auth.apiKeyLocation === 'header' &&
        request.auth.apiKeyName
      ) {
        headers[request.auth.apiKeyName] = request.auth.apiKeyValue ?? '';
      }

      let body: string | undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (request.bodyType === 'json') {
          body = request.bodyJson;
          headers['Content-Type'] = 'application/json';
        } else if (request.bodyType === 'raw') {
          body = request.bodyRaw;
        } else if (request.bodyType === 'x-www-form-urlencoded') {
          const params = new URLSearchParams();
          request.bodyUrlEncoded
            .filter((p) => p.enabled && p.key)
            .forEach((p) => params.append(p.key, p.value));
          body = params.toString();
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (request.bodyType === 'form-data') {
          const boundary = `----FormBoundary${Date.now()}`;
          headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
          body = request.bodyFormData
            .filter((p) => p.enabled && p.key)
            .map(
              (p) =>
                `--${boundary}\r\nContent-Disposition: form-data; name="${p.key}"\r\n\r\n${p.value}`
            )
            .join('\r\n') + `\r\n--${boundary}--`;
        }
      }

      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        body,
      };

      const response = await fetch(url.toString(), fetchOptions);
      const responseBody = await response.text();
      const endTime = Date.now();

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseData: ResponseData = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        time: endTime - startTime,
        size: new TextEncoder().encode(responseBody).length,
      };

      this._panel.webview.postMessage({
        type: 'response',
        payload: responseData,
      });

      // Update existing history entry if this request is associated with one
      const historyId = (request as any).historyId as string | undefined;
      if (historyId) {
        this.historyProvider.updateItem(historyId, {
          timestamp: Date.now(),
          status: response.status,
          request,
          url: url.toString(),
        });
      }
    } catch (err: unknown) {
      const endTime = Date.now();
      const error = err instanceof Error ? err.message : 'Unknown error';
      const responseData: ResponseData = {
        status: 0,
        statusText: 'Error',
        headers: {},
        body: '',
        time: endTime - startTime,
        size: 0,
        error,
      };
      this._panel.webview.postMessage({
        type: 'response',
        payload: responseData,
      });
    }
  }

  private _buildUrl(request: RequestTab): string {
    let url = request.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }

  private async _getTabsFileUri(): Promise<vscode.Uri> {
    const storageUri = this._context.globalStorageUri;
    await vscode.workspace.fs.createDirectory(storageUri);
    return vscode.Uri.joinPath(storageUri, 'tabs.json');
  }

  private async _loadSavedTabs() {
    try {
      const uri = await this._getTabsFileUri();
      const file = await vscode.workspace.fs.readFile(uri);
      const raw = Buffer.from(file).toString('utf8');
      const payload = JSON.parse(raw) as { tabs?: RequestTab[] };
      this._panel.webview.postMessage({
        type: 'tabsLoaded',
        payload: payload.tabs ?? [],
      });
    } catch {
      this._panel.webview.postMessage({
        type: 'tabsLoaded',
        payload: [],
      });
    }
  }

  private async _saveTabs(tabs: RequestTab[]) {
    try {
      const uri = await this._getTabsFileUri();
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(
        uri,
        encoder.encode(JSON.stringify({ tabs }, null, 2))
      );
    } catch (err) {
      console.error('Failed to save request tabs', err);
    }
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist');

    const indexPath = path.join(distPath.fsPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      html = html.replace(
        /(src|href)="\/([^\"]+)"/g,
        (_match: string, attr: string, src: string) => {
          const uri = webview.asWebviewUri(
            vscode.Uri.joinPath(distPath, src)
          );
          return `${attr}="${uri}"`;
        }
      );
      html = html.replace(
        /(src|href)="\.\/([^\"]+)"/g,
        (_match: string, attr: string, src: string) => {
          const uri = webview.asWebviewUri(
            vscode.Uri.joinPath(distPath, src)
          );
          return `${attr}="${uri}"`;
        }
      );
      return html;
    }

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1e1e2e;color:#cdd6f4;}.msg{text-align:center;}.msg h2{color:#cba6f7;}.msg p{color:#a6adc8;}</style>
</head><body>
<div class="msg">
  <h2>🚀 Pursue Post</h2>
  <p>Run <code>npm run build</code> to build the webview, then reload.</p>
</div>
</body></html>`;
  }

  public dispose() {
    RestClientPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }
}
