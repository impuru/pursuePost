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
exports.HistoryProvider = exports.HistoryTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const METHOD_ICONS = {
    GET: '🟢',
    POST: '🔵',
    PUT: '🟠',
    PATCH: '🟡',
    DELETE: '🔴',
    HEAD: '⚪',
    OPTIONS: '🟣',
};
class HistoryTreeItem extends vscode.TreeItem {
    constructor(historyItem) {
        const title = historyItem.request?.name?.trim() || historyItem.url;
        const truncatedTitle = title.length > 50 ? `${title.substring(0, 50)}...` : title;
        const label = `${METHOD_ICONS[historyItem.method]} ${historyItem.method} ${truncatedTitle}`;
        super(label, vscode.TreeItemCollapsibleState.None);
        this.historyItem = historyItem;
        this.tooltip = `${historyItem.method} ${historyItem.url}\n${new Date(historyItem.timestamp).toLocaleString()}\nStatus: ${historyItem.status ?? 'N/A'}`;
        this.description = `${new Date(historyItem.timestamp).toLocaleTimeString()}${historyItem.status !== undefined ? ` · ${historyItem.status}` : ''}`;
        this.iconPath = new vscode.ThemeIcon('history');
        this.contextValue = 'historyItem';
        this.command = {
            command: 'restClientPro.openHistoryItem',
            title: 'Open Request',
            arguments: [this],
        };
    }
}
exports.HistoryTreeItem = HistoryTreeItem;
class HistoryProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.history = [];
        this.loadHistory();
    }
    loadHistory() {
        this.history =
            this.context.globalState.get('restClientPro.history') ??
                [];
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        return [...this.history]
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((item) => new HistoryTreeItem(item));
    }
    getHistory() {
        return this.history;
    }
    addItem(item) {
        // Prevent duplicate entries: remove any existing entry with same method, url and request shape
        this.history = [
            item,
            ...this.history.filter((h) => !(h.method === item.method &&
                h.url === item.url &&
                JSON.stringify(h.request) === JSON.stringify(item.request))),
        ].slice(0, 100);
        this.context.globalState.update('restClientPro.history', this.history);
        this._onDidChangeTreeData.fire();
        return item;
    }
    updateItem(id, patch) {
        const idx = this.history.findIndex((h) => h.id === id);
        if (idx === -1)
            return null;
        this.history[idx] = { ...this.history[idx], ...patch };
        this.context.globalState.update('restClientPro.history', this.history);
        this._onDidChangeTreeData.fire();
        return this.history[idx];
    }
    deleteItem(id) {
        this.history = this.history.filter((h) => h.id !== id);
        this.context.globalState.update('restClientPro.history', this.history);
        this._onDidChangeTreeData.fire();
    }
    clearAll() {
        this.history = [];
        this.context.globalState.update('restClientPro.history', []);
        this._onDidChangeTreeData.fire();
    }
    refresh() {
        this.loadHistory();
        this._onDidChangeTreeData.fire();
    }
}
exports.HistoryProvider = HistoryProvider;
