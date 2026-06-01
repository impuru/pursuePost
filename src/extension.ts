import * as vscode from 'vscode';
import { RestClientPanel } from './panels/RestClientPanel';
import { HistoryProvider, HistoryTreeItem } from './providers/HistoryProvider';
import { CollectionsProvider, CollectionTreeItem } from './providers/CollectionsProvider';

export function activate(context: vscode.ExtensionContext) {
  const historyProvider = new HistoryProvider(context);
  const collectionsProvider = new CollectionsProvider(context);

  vscode.window.registerTreeDataProvider(
    'restClientPro.history',
    historyProvider
  );
  vscode.window.registerTreeDataProvider(
    'restClientPro.collections',
    collectionsProvider
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('restClientPro.openClient', () => {
      RestClientPanel.createOrShow(
        context.extensionUri,
        context,
        historyProvider,
        collectionsProvider
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('restClientPro.newRequest', () => {
      RestClientPanel.createOrShow(
        context.extensionUri,
        context,
        historyProvider,
        collectionsProvider,
        {},
        true,
        true
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('restClientPro.clearHistory', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Clear all history?',
        'Yes',
        'No'
      );
      if (confirm === 'Yes') {
        historyProvider.clearAll();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('restClientPro.openHistoryItem', (item: HistoryTreeItem) => {
      RestClientPanel.createOrShow(
        context.extensionUri,
        context,
        historyProvider,
        collectionsProvider,
        item.historyItem.request
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.openHistoryItemNewTab',
      (item: HistoryTreeItem) => {
        RestClientPanel.createOrShow(
          context.extensionUri,
          context,
          historyProvider,
          collectionsProvider,
          item.historyItem.request,
          true,
          false
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.saveHistoryItemToCollection',
      async (item: HistoryTreeItem) => {
        const collections = collectionsProvider.getCollections();
        if (collections.length === 0) {
          await vscode.window.showInformationMessage(
            'Create a collection before saving history items.'
          );
          return;
        }

        const pick = await vscode.window.showQuickPick(
          collections.map((c) => ({
            label: c.name,
            description: `${c.items.length} requests`,
            id: c.id,
          })),
          {
            placeHolder: 'Save history request to collection',
          }
        );

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
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.duplicateHistoryItem',
      (item: HistoryTreeItem) => {
        RestClientPanel.createOrShow(
          context.extensionUri,
          context,
          historyProvider,
          collectionsProvider,
          item.historyItem.request,
          true,
          false
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.deleteHistoryItem',
      (item: HistoryTreeItem) => {
        historyProvider.deleteItem(item.historyItem.id);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.renameHistoryItem',
      async (item: HistoryTreeItem) => {
        const currentName =
          item.historyItem.request?.name?.trim() || item.historyItem.url;
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
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.openCollection',
      (item: CollectionTreeItem) => {
        if (item.collectionItem) {
          RestClientPanel.createOrShow(
            context.extensionUri,
            context,
            historyProvider,
            collectionsProvider,
            item.collectionItem.request
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.deleteCollection',
      async (item: CollectionTreeItem) => {
        const confirm = await vscode.window.showWarningMessage(
          `Delete collection "${item.collection.name}"?`,
          'Yes',
          'No'
        );
        if (confirm === 'Yes') {
          collectionsProvider.deleteCollection(item.collection.id);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'restClientPro.deleteCollectionItem',
      async (item: CollectionTreeItem) => {
        if (item.collectionItem) {
          collectionsProvider.deleteCollectionItem(
            item.collection.id,
            item.collectionItem.id
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('restClientPro.newCollection', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Collection name',
        placeHolder: 'My API Collection',
      });
      if (name) {
        collectionsProvider.addCollection(name);
        vscode.window.showInformationMessage(`Collection "${name}" created!`);
      }
    })
  );
}

export function deactivate() {}
