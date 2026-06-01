import * as vscode from 'vscode';
import { HistoryItem, HttpMethod } from '../models/types';

const METHOD_ICONS: Record<HttpMethod, string> = {
  GET: '🟢',
  POST: '🔵',
  PUT: '🟠',
  PATCH: '🟡',
  DELETE: '🔴',
  HEAD: '⚪',
  OPTIONS: '🟣',
};

export class HistoryTreeItem extends vscode.TreeItem {
  constructor(public readonly historyItem: HistoryItem) {
    const title = historyItem.request?.name?.trim() || historyItem.url;
    const truncatedTitle =
      title.length > 50 ? `${title.substring(0, 50)}...` : title;
    const label = `${METHOD_ICONS[historyItem.method]} ${historyItem.method} ${truncatedTitle}`;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `${historyItem.method} ${historyItem.url}\n${new Date(
      historyItem.timestamp
    ).toLocaleString()}\nStatus: ${historyItem.status ?? 'N/A'}`;
    this.description = `${new Date(historyItem.timestamp).toLocaleTimeString()}${
      historyItem.status !== undefined ? ` · ${historyItem.status}` : ''
    }`;
    this.iconPath = new vscode.ThemeIcon('history');
    this.contextValue = 'historyItem';
    this.command = {
      command: 'restClientPro.openHistoryItem',
      title: 'Open Request',
      arguments: [this],
    };
  }
}

export class HistoryProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    HistoryTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private history: HistoryItem[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.loadHistory();
  }

  private loadHistory() {
    this.history =
      this.context.globalState.get<HistoryItem[]>('restClientPro.history') ??
      [];
  }

  getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): HistoryTreeItem[] {
    return [...this.history]
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((item) => new HistoryTreeItem(item));
  }

  getHistory(): HistoryItem[] {
    return this.history;
  }

  addItem(item: HistoryItem) {
    // Prevent duplicate entries: remove any existing entry with same method, url and request shape
    this.history = [
      item,
      ...this.history.filter(
        (h) =>
          !(
            h.method === item.method &&
            h.url === item.url &&
            JSON.stringify(h.request) === JSON.stringify(item.request)
          )
      ),
    ].slice(0, 100);
    this.context.globalState.update('restClientPro.history', this.history);
    this._onDidChangeTreeData.fire();
    return item;
  }

  updateItem(id: string, patch: Partial<HistoryItem>) {
    const idx = this.history.findIndex((h) => h.id === id);
    if (idx === -1) return null;
    this.history[idx] = { ...this.history[idx], ...patch };
    this.context.globalState.update('restClientPro.history', this.history);
    this._onDidChangeTreeData.fire();
    return this.history[idx];
  }

  deleteItem(id: string) {
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
