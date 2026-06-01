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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const RestClientPanel_1 = require("./panels/RestClientPanel");
const HistoryProvider_1 = require("./providers/HistoryProvider");
const CollectionsProvider_1 = require("./providers/CollectionsProvider");
function activate(context) {
    const historyProvider = new HistoryProvider_1.HistoryProvider(context);
    const collectionsProvider = new CollectionsProvider_1.CollectionsProvider(context);
    vscode.window.registerTreeDataProvider('restClientPro.history', historyProvider);
    vscode.window.registerTreeDataProvider('restClientPro.collections', collectionsProvider);
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.openClient', () => {
        RestClientPanel_1.RestClientPanel.createOrShow(context.extensionUri, context, historyProvider, collectionsProvider);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.newRequest', () => {
        RestClientPanel_1.RestClientPanel.createOrShow(context.extensionUri, context, historyProvider, collectionsProvider, {}, true, true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.clearHistory', async () => {
        const confirm = await vscode.window.showWarningMessage('Clear all history?', 'Yes', 'No');
        if (confirm === 'Yes') {
            historyProvider.clearAll();
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.openHistoryItem', (item) => {
        RestClientPanel_1.RestClientPanel.createOrShow(context.extensionUri, context, historyProvider, collectionsProvider, item.historyItem.request);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.openHistoryItemNewTab', (item) => {
        RestClientPanel_1.RestClientPanel.createOrShow(context.extensionUri, context, historyProvider, collectionsProvider, item.historyItem.request, true, false);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.saveHistoryItemToCollection', async (item) => {
        const collections = collectionsProvider.getCollections();
        if (collections.length === 0) {
            await vscode.window.showInformationMessage('Create a collection before saving history items.');
            return;
        }
        const pick = await vscode.window.showQuickPick(collections.map((c) => ({
            label: c.name,
            description: `${c.items.length} requests`,
            id: c.id,
        })), {
            placeHolder: 'Save history request to collection',
        });
        if (!pick) {
            return;
        }
        collectionsProvider.addItemToCollection(pick.id, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: item.historyItem.request?.name || item.historyItem.url,
            method: item.historyItem.method,
            url: item.historyItem.url,
            request: item.historyItem.request,
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.duplicateHistoryItem', (item) => {
        RestClientPanel_1.RestClientPanel.createOrShow(context.extensionUri, context, historyProvider, collectionsProvider, item.historyItem.request, true, false);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.deleteHistoryItem', (item) => {
        historyProvider.deleteItem(item.historyItem.id);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.renameHistoryItem', async (item) => {
        const currentName = item.historyItem.request?.name?.trim() || item.historyItem.url;
        const newName = await vscode.window.showInputBox({
            prompt: 'Rename history item title',
            value: currentName,
            placeHolder: 'Enter a title for this history item',
        });
        if (newName !== undefined && newName.trim()) {
            historyProvider.updateItem(item.historyItem.id, {
                request: {
                    ...item.historyItem.request,
                    name: newName.trim(),
                },
            });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.openCollection', (item) => {
        if (item.collectionItem) {
            RestClientPanel_1.RestClientPanel.createOrShow(context.extensionUri, context, historyProvider, collectionsProvider, item.collectionItem.request);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.deleteCollection', async (item) => {
        const confirm = await vscode.window.showWarningMessage(`Delete collection "${item.collection.name}"?`, 'Yes', 'No');
        if (confirm === 'Yes') {
            collectionsProvider.deleteCollection(item.collection.id);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.deleteCollectionItem', async (item) => {
        if (item.collectionItem) {
            collectionsProvider.deleteCollectionItem(item.collection.id, item.collectionItem.id);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('restClientPro.newCollection', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Collection name',
            placeHolder: 'My API Collection',
        });
        if (name) {
            collectionsProvider.addCollection(name);
            vscode.window.showInformationMessage(`Collection "${name}" created!`);
        }
    }));
}
function deactivate() { }
