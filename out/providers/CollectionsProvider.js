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
exports.CollectionsProvider = exports.CollectionTreeItem = void 0;
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
class CollectionTreeItem extends vscode.TreeItem {
    constructor(collection, collectionItem) {
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
        }
        else {
            super(collection.name, vscode.TreeItemCollapsibleState.Collapsed);
            this.collection = collection;
            this.tooltip = `${collection.items.length} requests`;
            this.description = `${collection.items.length} requests`;
            this.contextValue = 'collection';
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}
exports.CollectionTreeItem = CollectionTreeItem;
class CollectionsProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.collections = [];
        this.loadCollections();
    }
    loadCollections() {
        this.collections =
            this.context.workspaceState.get('restClientPro.collections') ?? [];
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return this.collections.map((c) => new CollectionTreeItem(c));
        }
        if (!element.collectionItem) {
            return element.collection.items.map((item) => new CollectionTreeItem(element.collection, item));
        }
        return [];
    }
    addCollection(name) {
        const collection = {
            id: Date.now().toString(),
            name,
            items: [],
        };
        this.collections.push(collection);
        this.save();
        return collection;
    }
    addItemToCollection(collectionId, item) {
        const col = this.collections.find((c) => c.id === collectionId);
        if (col) {
            col.items.push(item);
            this.save();
        }
    }
    deleteCollection(id) {
        this.collections = this.collections.filter((c) => c.id !== id);
        this.save();
    }
    deleteCollectionItem(collectionId, itemId) {
        const col = this.collections.find((c) => c.id === collectionId);
        if (col) {
            col.items = col.items.filter((i) => i.id !== itemId);
            this.save();
        }
    }
    getCollections() {
        return this.collections;
    }
    save() {
        this.context.workspaceState.update('restClientPro.collections', this.collections);
        this._onDidChangeTreeData.fire();
    }
    refresh() {
        this.loadCollections();
        this._onDidChangeTreeData.fire();
    }
}
exports.CollectionsProvider = CollectionsProvider;
