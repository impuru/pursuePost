import * as vscode from 'vscode';
import { Collection, CollectionItem, HttpMethod } from '../models/types';

const METHOD_ICONS: Record<HttpMethod, string> = {
  GET: '🟢',
  POST: '🔵',
  PUT: '🟠',
  PATCH: '🟡',
  DELETE: '🔴',
  HEAD: '⚪',
  OPTIONS: '🟣',
};

export class CollectionTreeItem extends vscode.TreeItem {
  public readonly collection: Collection;
  public readonly collectionItem?: CollectionItem;

  constructor(collection: Collection, collectionItem?: CollectionItem) {
    if (collectionItem) {
      const label = `${METHOD_ICONS[collectionItem.method]} ${collectionItem.name}`;
      super(label, vscode.TreeItemCollapsibleState.None);
      this.collection = collection;
      this.collectionItem = collectionItem;
      this.tooltip = `${collectionItem.method} ${collectionItem.url}`;
      this.description = collectionItem.url.substring(0, 30);
      this.contextValue = 'collectionItem';
      this.command = {
        command: 'restClientPro.openCollection',
        title: 'Open Request',
        arguments: [this],
      };
    } else {
      super(collection.name, vscode.TreeItemCollapsibleState.Collapsed);
      this.collection = collection;
      this.tooltip = `${collection.items.length} requests`;
      this.description = `${collection.items.length} requests`;
      this.contextValue = 'collection';
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

export class CollectionsProvider implements vscode.TreeDataProvider<CollectionTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    CollectionTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private collections: Collection[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.loadCollections();
  }

  private loadCollections() {
    this.collections =
      this.context.workspaceState.get<Collection[]>(
        'restClientPro.collections'
      ) ?? [];
  }

  getTreeItem(element: CollectionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CollectionTreeItem): CollectionTreeItem[] {
    if (!element) {
      return this.collections.map((c) => new CollectionTreeItem(c));
    }
    if (!element.collectionItem) {
      return element.collection.items.map(
        (item) => new CollectionTreeItem(element.collection, item)
      );
    }
    return [];
  }

  addCollection(name: string): Collection {
    const collection: Collection = {
      id: Date.now().toString(),
      name,
      items: [],
    };
    this.collections.push(collection);
    this.save();
    return collection;
  }

  addItemToCollection(collectionId: string, item: CollectionItem) {
    const col = this.collections.find((c) => c.id === collectionId);
    if (col) {
      col.items.push(item);
      this.save();
    }
  }

  deleteCollection(id: string) {
    this.collections = this.collections.filter((c) => c.id !== id);
    this.save();
  }

  deleteCollectionItem(collectionId: string, itemId: string) {
    const col = this.collections.find((c) => c.id === collectionId);
    if (col) {
      col.items = col.items.filter((i) => i.id !== itemId);
      this.save();
    }
  }

  getCollections(): Collection[] {
    return this.collections;
  }

  private save() {
    this.context.workspaceState.update(
      'restClientPro.collections',
      this.collections
    );
    this._onDidChangeTreeData.fire();
  }

  refresh() {
    this.loadCollections();
    this._onDidChangeTreeData.fire();
  }
}
