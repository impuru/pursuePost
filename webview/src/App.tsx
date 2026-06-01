import React, { useEffect, useMemo, useState } from 'react';
import RequestEditor from './components/RequestEditor';
import ResponseViewer from './components/ResponseViewer';
import type { Collection, HistoryItem, RequestTab, ResponseData } from './types';

declare global {
  interface Window {
    acquireVsCodeApi?: () => {
      postMessage: (message: any) => void;
      setState: (state: any) => void;
      getState: () => any;
    };
  }
}

type ResponseTabKind = 'pretty' | 'raw' | 'headers';

type WebviewMessage = {
  type: string;
  payload?: any;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createRequestTab = (partial?: Partial<RequestTab>): RequestTab => ({
  id: partial?.id ?? makeId(),
  name: partial?.name ?? '',
  method: partial?.method ?? 'GET',
  url: partial?.url ?? 'https://api.example.com',
  headers: partial?.headers ?? [
    { id: makeId(), key: 'Accept', value: 'application/json', enabled: true },
  ],
  queryParams: partial?.queryParams ?? [
    { id: makeId(), key: '', value: '', enabled: true },
  ],
  bodyType: partial?.bodyType ?? 'none',
  bodyJson: partial?.bodyJson ?? '{\n  \"message\": \"hello\"\n}',
  bodyRaw: partial?.bodyRaw ?? '',
  bodyFormData: partial?.bodyFormData ?? [
    { id: makeId(), key: '', value: '', enabled: true },
  ],
  bodyUrlEncoded: partial?.bodyUrlEncoded ?? [
    { id: makeId(), key: '', value: '', enabled: true },
  ],
  auth: {
    type: partial?.auth?.type ?? 'none',
    bearerToken: partial?.auth?.bearerToken ?? '',
    basicUsername: partial?.auth?.basicUsername ?? '',
    basicPassword: partial?.auth?.basicPassword ?? '',
    apiKeyName: partial?.auth?.apiKeyName ?? '',
    apiKeyValue: partial?.auth?.apiKeyValue ?? '',
    apiKeyLocation: partial?.auth?.apiKeyLocation ?? 'header',
    oauth2Token: partial?.auth?.oauth2Token ?? '',
  },
  isDirty: false,
});

const vscode = window.acquireVsCodeApi?.() ?? {
  postMessage: () => {},
  setState: () => {},
  getState: () => null,
};

const App: React.FC = () => {
  const [tabs, setTabs] = useState<RequestTab[]>([createRequestTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [responseTab, setResponseTab] = useState<ResponseTabKind>('pretty');
  const [notification, setNotification] = useState<string | null>(null);
  const tabsRef = React.useRef<RequestTab[]>(tabs);

  const getMethodClass = (method: string) => {
    switch (method) {
      case 'GET':
        return 'method-get';
      case 'POST':
        return 'method-post';
      case 'PUT':
        return 'method-put';
      case 'PATCH':
        return 'method-patch';
      case 'DELETE':
        return 'method-delete';
      default:
        return 'method-default';
    }
  };

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<WebviewMessage>) => {
      const { type, payload } = event.data;
      if (type === 'tabsLoaded') {
        const loadedTabs = Array.isArray(payload) && payload.length > 0 ? payload.map(createRequestTab) : [createRequestTab()];
        setTabs(loadedTabs as RequestTab[]);
        setActiveTabId((loadedTabs as RequestTab[])[0].id);
      }
      if (type === 'collections') {
        setCollections(payload ?? []);
      }
      if (type === 'history') {
        setHistory(payload ?? []);
      }
      if (type === 'response') {
        setResponse(payload ?? null);
      }
      if (type === 'openRequest') {
        const request = payload as Partial<RequestTab> & { __createHistory?: boolean };
        const shouldCreateHistory = !!request.__createHistory;
        const requestWithoutFlag = { ...request };
        delete (requestWithoutFlag as any).__createHistory;

        const matchesRequest = (candidate: RequestTab) => {
          if (request.id && candidate.id === request.id) {
            return true;
          }
          return (
            candidate.method === request.method &&
            candidate.url === request.url &&
            candidate.bodyType === request.bodyType &&
            candidate.bodyJson === request.bodyJson &&
            candidate.bodyRaw === request.bodyRaw &&
            JSON.stringify(candidate.headers) === JSON.stringify(request.headers) &&
            JSON.stringify(candidate.queryParams) === JSON.stringify(request.queryParams) &&
            JSON.stringify(candidate.bodyFormData) === JSON.stringify(request.bodyFormData) &&
            JSON.stringify(candidate.bodyUrlEncoded) === JSON.stringify(request.bodyUrlEncoded) &&
            JSON.stringify(candidate.auth) === JSON.stringify(request.auth)
          );
        };

        const existingTab = tabsRef.current.find(matchesRequest);
        if (existingTab) {
          setActiveTabId(existingTab.id);
          if (shouldCreateHistory) {
            vscode.postMessage({ type: 'createHistoryFromRequest', payload: existingTab });
          }
        } else {
          const newTab = createRequestTab(requestWithoutFlag);
          setTabs((current) => [newTab, ...current]);
          setActiveTabId(newTab.id);
          setResponse(null);
          if (shouldCreateHistory) {
            vscode.postMessage({ type: 'createHistoryFromRequest', payload: newTab });
          }
        }
      }
      if (type === 'historyCreated') {
        const { tabId, item } = payload ?? {};
        if (tabId && item) {
          // attach historyId to the tab so later executes update this history entry
          setTabs((current) => current.map((t) => (t.id === tabId ? { ...t, historyId: item.id } as any : t)));
          setHistory((current) => [item, ...current].slice(0, 100));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'loadTabs' });
    vscode.postMessage({ type: 'getCollections' });
    vscode.postMessage({ type: 'getHistory' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      vscode.postMessage({ type: 'saveTabs', payload: tabs });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [tabs]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    if (!selectedCollectionId && collections.length > 0) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  const openNewTab = () => {
    const newTab = createRequestTab();
    setTabs((current) => [newTab, ...current]);
    setActiveTabId(newTab.id);
    setResponse(null);
    // create a history entry for this new request and associate it with the tab
    vscode.postMessage({ type: 'createHistoryFromRequest', payload: newTab });
  };

  const closeTab = (id: string) => {
    setTabs((current) => current.filter((tab) => tab.id !== id));
  };

  const updateTab = (updated: RequestTab) => {
    setTabs((current) => current.map((tab) => (tab.id === updated.id ? updated : tab)));
  };

  const handleExecute = () => {
    if (!activeTab.url.trim()) {
      setNotification('Enter a request URL before sending.');
      return;
    }
    setNotification(null);
    vscode.postMessage({ type: 'executeRequest', payload: activeTab });
  };

  const handleJsonFormat = () => {
    try {
      const json = JSON.parse(activeTab.bodyJson || '{}');
      updateTab({ ...activeTab, bodyJson: JSON.stringify(json, null, 2), isDirty: true });
    } catch {
      setNotification('JSON formatting failed. Check your JSON syntax.');
    }
  };

  const handleSaveToCollection = () => {
    if (!selectedCollectionId) {
      setNotification('Pick a collection first.');
      return;
    }
    vscode.postMessage({
      type: 'saveToCollection',
      payload: {
        collectionId: selectedCollectionId,
        item: {
          id: makeId(),
          name: activeTab.name || activeTab.url || 'Request',
          method: activeTab.method,
          url: activeTab.url,
          request: activeTab,
        },
      },
    });
    setNotification('Saved request to collection.');
  };

  const urlSuggestions = useMemo(
    () => Array.from(new Set(history.map((item) => item.url).filter(Boolean))),
    [history]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">⚡</span>
          <div>
            <h1>Pursue Post ⚡</h1>
            <p>Request builder, response inspector, history & collections.</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="secondary" onClick={openNewTab}>
            + New Tab
          </button>
        </div>
      </header>

      {notification && <div className="toast">{notification}</div>}

      <div className="workspace-grid">
        <RequestEditor
          activeTab={activeTab}
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          urlSuggestions={urlSuggestions}
          onChange={updateTab}
          onExecute={handleExecute}
          onJsonFormat={handleJsonFormat}
          onCreateCollection={() => {
            const collectionName = window.prompt('Collection name');
            if (collectionName?.trim()) {
              vscode.postMessage({
                type: 'createCollection',
                payload: collectionName.trim(),
              });
            }
          }}
          onSaveToCollection={handleSaveToCollection}
          onSelectCollection={(id) => setSelectedCollectionId(id)}
        />
        <ResponseViewer
          response={response}
          activeTab={responseTab}
          setActiveTab={setResponseTab}
        />
      </div>
    </div>
  );
};

export default App;
