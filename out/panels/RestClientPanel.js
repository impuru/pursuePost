"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestClientPanel = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class RestClientPanel {
    static createOrShow(extensionUri, context, historyProvider, collectionsProvider, initialRequest, forceNew = false, createHistory = false) {
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
        const panel = vscode.window.createWebviewPanel(RestClientPanel.viewType, 'Pursue-Post', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'webview', 'dist'),
                vscode.Uri.joinPath(extensionUri, 'media'),
            ],
        });
        RestClientPanel.currentPanel = new RestClientPanel(panel, extensionUri, context, historyProvider, collectionsProvider);
        if (requestToOpen) {
            RestClientPanel.currentPanel.openRequest(requestToOpen);
        }
    }
    constructor(panel, extensionUri, context, historyProvider, collectionsProvider) {
        this.extensionUri = extensionUri;
        this.historyProvider = historyProvider;
        this.collectionsProvider = collectionsProvider;
        this._disposables = [];
        this._panel = panel;
        this._context = context;
        this._panel.webview.html = this._getHtmlForWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage((msg) => this._handleMessage(msg), null, this._disposables);
        this._loadSavedTabs();
    }
    openRequest(request) {
        setTimeout(() => {
            this._panel.webview.postMessage({
                type: 'openRequest',
                payload: request,
            });
        }, 500);
    }
    async _handleMessage(message) {
        switch (message.type) {
            case 'executeRequest':
                await this._executeRequest(message.payload);
                break;
            case 'saveToHistory':
                this._saveToHistory(message.payload);
                break;
            case 'createHistoryFromRequest': {
                const tab = message.payload;
                const item = {
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
                const item = message.payload;
                const content = JSON.stringify(item.request, null, 2);
                vscode.workspace.openTextDocument({ content, language: 'json' }).then((doc) => vscode.window.showTextDocument(doc, { preview: false }));
                break;
            }
            case 'deleteHistoryItem': {
                const id = message.payload;
                this.historyProvider.deleteItem(id);
                this._panel.webview.postMessage({
                    type: 'history',
                    payload: this.historyProvider.getHistory(),
                });
                break;
            }
            case 'renameHistoryItem': {
                const { id, name } = message.payload;
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
                const { collectionId, item } = message.payload;
                this.collectionsProvider.addItemToCollection(collectionId, item);
                this._panel.webview.postMessage({
                    type: 'collections',
                    payload: this.collectionsProvider.getCollections(),
                });
                break;
            }
            case 'createCollection': {
                this.collectionsProvider.addCollection(message.payload);
                this._panel.webview.postMessage({
                    type: 'collections',
                    payload: this.collectionsProvider.getCollections(),
                });
                vscode.window.showInformationMessage(`Collection "${message.payload}" created!`);
                break;
            }
            case 'loadTabs':
                await this._loadSavedTabs();
                break;
            case 'saveTabs':
                await this._saveTabs(message.payload);
                break;
        }
    }
    _saveToHistory(item) {
        this.historyProvider.addItem(item);
    }
    async _executeRequest(request) {
        const startTime = Date.now();
        try {
            const url = new URL(this._buildUrl(request));
            request.queryParams
                .filter((p) => p.enabled && p.key)
                .forEach((p) => url.searchParams.append(p.key, p.value));
            if (request.auth.type === 'api-key' &&
                request.auth.apiKeyLocation === 'query' &&
                request.auth.apiKeyName) {
                url.searchParams.append(request.auth.apiKeyName, request.auth.apiKeyValue ?? '');
            }
            const headers = {};
            request.headers
                .filter((h) => h.enabled && h.key)
                .forEach((h) => {
                headers[h.key] = h.value;
            });
            if (request.auth.type === 'bearer' && request.auth.bearerToken) {
                headers['Authorization'] = `Bearer ${request.auth.bearerToken}`;
            }
            else if (request.auth.type === 'basic') {
                const creds = Buffer.from(`${request.auth.basicUsername}:${request.auth.basicPassword}`).toString('base64');
                headers['Authorization'] = `Basic ${creds}`;
            }
            else if (request.auth.type === 'api-key' &&
                request.auth.apiKeyLocation === 'header' &&
                request.auth.apiKeyName) {
                headers[request.auth.apiKeyName] = request.auth.apiKeyValue ?? '';
            }
            let body;
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                if (request.bodyType === 'json') {
                    body = request.bodyJson;
                    headers['Content-Type'] = 'application/json';
                }
                else if (request.bodyType === 'raw') {
                    body = request.bodyRaw;
                }
                else if (request.bodyType === 'x-www-form-urlencoded') {
                    const params = new URLSearchParams();
                    request.bodyUrlEncoded
                        .filter((p) => p.enabled && p.key)
                        .forEach((p) => params.append(p.key, p.value));
                    body = params.toString();
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }
                else if (request.bodyType === 'form-data') {
                    const boundary = `----FormBoundary${Date.now()}`;
                    headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
                    body = request.bodyFormData
                        .filter((p) => p.enabled && p.key)
                        .map((p) => `--${boundary}\r\nContent-Disposition: form-data; name="${p.key}"\r\n\r\n${p.value}`)
                        .join('\r\n') + `\r\n--${boundary}--`;
                }
            }
            const fetchOptions = {
                method: request.method,
                headers,
                body,
            };
            const response = await fetch(url.toString(), fetchOptions);
            const responseBody = await response.text();
            const endTime = Date.now();
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            const responseData = {
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
            const historyId = request.historyId;
            if (historyId) {
                this.historyProvider.updateItem(historyId, {
                    timestamp: Date.now(),
                    status: response.status,
                    request,
                    url: url.toString(),
                });
            }
        }
        catch (err) {
            const endTime = Date.now();
            const error = err instanceof Error ? err.message : 'Unknown error';
            const responseData = {
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
    _buildUrl(request) {
        let url = request.url.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        return url;
    }
    async _getTabsFileUri() {
        const storageUri = this._context.globalStorageUri;
        await vscode.workspace.fs.createDirectory(storageUri);
        return vscode.Uri.joinPath(storageUri, 'tabs.json');
    }
    async _loadSavedTabs() {
        try {
            const uri = await this._getTabsFileUri();
            const file = await vscode.workspace.fs.readFile(uri);
            const raw = Buffer.from(file).toString('utf8');
            const payload = JSON.parse(raw);
            this._panel.webview.postMessage({
                type: 'tabsLoaded',
                payload: payload.tabs ?? [],
            });
        }
        catch {
            this._panel.webview.postMessage({
                type: 'tabsLoaded',
                payload: [],
            });
        }
    }
    async _saveTabs(tabs) {
        try {
            const uri = await this._getTabsFileUri();
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(JSON.stringify({ tabs }, null, 2)));
        }
        catch (err) {
            console.error('Failed to save request tabs', err);
        }
    }
    _getHtmlForWebview() {
        const webview = this._panel.webview;
        const distPath = vscode.Uri.joinPath(this.extensionUri, 'webview', 'dist');
        const indexPath = path.join(distPath.fsPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            html = html.replace(/(src|href)="\/([^\"]+)"/g, (_match, attr, src) => {
                const uri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, src));
                return `${attr}="${uri}"`;
            });
            html = html.replace(/(src|href)="\.\/([^\"]+)"/g, (_match, attr, src) => {
                const uri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, src));
                return `${attr}="${uri}"`;
            });
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
    dispose() {
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
exports.RestClientPanel = RestClientPanel;
RestClientPanel.viewType = 'restClientPro';
