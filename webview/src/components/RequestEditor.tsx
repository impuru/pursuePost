import React, { useState } from 'react';
import type {
  AuthConfig,
  BodyType,
  Collection,
  KeyValuePair,
  RequestTab,
} from '../types';

interface Props {
  activeTab: RequestTab;
  collections: Collection[];
  selectedCollectionId: string | null;
  urlSuggestions: string[];
  onChange: (tab: RequestTab) => void;
  onExecute: () => void;
  onJsonFormat: () => void;
  onCreateCollection: () => void;
  onSaveToCollection: () => void;
  onSelectCollection: (collectionId: string) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const BODY_TYPES: BodyType[] = [
  'json',
  'none',
  'raw',
  'form-data',
  'x-www-form-urlencoded',
];
const AUTH_TYPES: AuthConfig['type'][] = ['none', 'bearer', 'basic', 'api-key', 'oauth2'];
const SECTIONS = [
  
  { id: 'query', label: 'Query Params' },
  { id: 'headers', label: 'Headers' },
   { id: 'auth', label: 'Authentication' },
  { id: 'body', label: 'Body' },
 
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET':
      return 'method-get';
    case 'POST':
      return 'method-post';
    case 'DELETE':
      return 'method-delete';
    case 'PATCH':
      return 'method-patch';
    case 'PUT':
      return 'method-put';
    default:
      return 'method-default';
  }
};

const RequestEditor: React.FC<Props> = ({
  activeTab,
  collections,
  selectedCollectionId,
  urlSuggestions,
  onChange,
  onExecute,
  onJsonFormat,
  onCreateCollection,
  onSaveToCollection,
  onSelectCollection,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('body');

  const updateField = (patch: Partial<RequestTab>) => {
    onChange({ ...activeTab, ...patch, isDirty: true });
  };

  const updatePairs = (
    field: 'headers' | 'queryParams' | 'bodyFormData' | 'bodyUrlEncoded',
    index: number,
    patch: Partial<KeyValuePair>
  ) => {
    const list = [...activeTab[field]];
    list[index] = { ...list[index], ...patch };
    if (field === 'queryParams') {
      // rebuild URL from base + enabled query params
      const base = (activeTab.url || '').split('?')[0];
      const params = list.filter((p) => p.enabled && p.key).map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`);
      const newUrl = params.length ? `${base}?${params.join('&')}` : base;
      onChange({ ...activeTab, [field]: list, url: newUrl, isDirty: true });
    } else {
      updateField({ [field]: list } as Partial<RequestTab>);
    }
  };

  const addRow = (field: 'headers' | 'queryParams' | 'bodyFormData' | 'bodyUrlEncoded') => {
    const newList = [
      ...activeTab[field],
      { id: `${Date.now()}-${Math.random()}`, key: '', value: '', enabled: true },
    ];
    if (field === 'queryParams') {
      const base = (activeTab.url || '').split('?')[0];
      const params = newList.filter((p) => p.enabled && p.key).map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`);
      const newUrl = params.length ? `${base}?${params.join('&')}` : base;
      onChange({ ...activeTab, [field]: newList, url: newUrl, isDirty: true });
    } else {
      updateField({ [field]: newList } as Partial<RequestTab>);
    }
  };

  const removeRow = (
    field: 'headers' | 'queryParams' | 'bodyFormData' | 'bodyUrlEncoded',
    index: number
  ) => {
    const list = [...activeTab[field]];
    list.splice(index, 1);
    if (field === 'queryParams') {
      const base = (activeTab.url || '').split('?')[0];
      const params = list.filter((p) => p.enabled && p.key).map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`);
      const newUrl = params.length ? `${base}?${params.join('&')}` : base;
      onChange({ ...activeTab, [field]: list, url: newUrl, isDirty: true });
    } else {
      updateField({ [field]: list } as Partial<RequestTab>);
    }
  };

  return (
    <section className="panelbg request-editor">
      <div className="left-col">
        <div className="panel-header">
          <div className="request-summary">
            <select
              className={`method-pill ${getMethodColor(activeTab.method)}`}
              value={activeTab.method}
              onChange={(e) => updateField({ method: e.target.value as RequestTab['method'] })}
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <div className="url-input-wrapper">
              <input
                className="url-input"
                list="url-suggestions"
                value={activeTab.url}
                onChange={(e) => updateField({ url: e.target.value })}
                placeholder="https://api.example.com/v1/items"
              />
              <datalist id="url-suggestions">
                {urlSuggestions.map((url) => (
                  <option value={url} key={url} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="action-buttons">
            <button className="primary" onClick={onExecute}>
              Send
            </button>
          </div>
        </div>

        <div className="section-tabs">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              className={`section-tab ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}

          <div>
            
          </div>
        </div>

        <div className="right-col">
        <div className="section-content">
        {activeSection === 'headers' && (
          <div className="card-1">
          
            <div className="kv-grid">
              {activeTab.headers.map((header, index) => (
                <div key={header.id} className="kv-row">
                  <label className="kv-checkbox">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) =>
                        updatePairs('headers', index, { enabled: e.target.checked })
                      }
                    />
                  </label>
                  <input
                    className="kv-key"
                    placeholder="Key"
                    value={header.key}
                    onChange={(e) => updatePairs('headers', index, { key: e.target.value })}
                  />
                  <input
                    className="kv-value"
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => updatePairs('headers', index, { value: e.target.value })}
                  />
                  <button className="icon-button" onClick={() => removeRow('headers', index)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="link-button" onClick={() => addRow('headers')}>
              + Add Header
            </button>
          </div>
        )}

        {activeSection === 'query' && (
          <div className="card-1">
         
            <div className="kv-grid">
              {activeTab.queryParams.map((param, index) => (
                <div key={param.id} className="kv-row">
                  <label className="kv-checkbox">
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      onChange={(e) =>
                        updatePairs('queryParams', index, { enabled: e.target.checked })
                      }
                    />
                  </label>
                  <input
                    className="kv-key"
                    placeholder="Key"
                    value={param.key}
                    onChange={(e) => updatePairs('queryParams', index, { key: e.target.value })}
                  />
                  <input
                    className="kv-value"
                    placeholder="Value"
                    value={param.value}
                    onChange={(e) => updatePairs('queryParams', index, { value: e.target.value })}
                  />
                  <button className="icon-button" onClick={() => removeRow('queryParams', index)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="link-button" onClick={() => addRow('queryParams')}>
              + Add Query Param
            </button>
          </div>
        )}

        {activeSection === 'body' && (
          <div className="card-1">
           
            <div className="tabs-row">
              {BODY_TYPES.map((type) => (
                <button
                  key={type}
                  className={`tab-button ${activeTab.bodyType === type ? 'active' : ''}`}
                  onClick={() => updateField({ bodyType: type })}
                >
                  {type}
                </button>
              ))}
            </div>
            {activeTab.bodyType === 'json' && (
              <>
                <div className="body-settings-row">
                  <span className="body-label">JSON</span>
                  <button className="link-button small" onClick={onJsonFormat}>
                    Format JSON
                  </button>
                </div>
                <div className="body-editor">
                  <textarea
                    value={activeTab.bodyJson}
                    onChange={(e) => updateField({ bodyJson: e.target.value })}
                    placeholder='{"key": "value"}'
                  />
                </div>
              </>
            )}
            {activeTab.bodyType === 'raw' && (
              <div className="body-editor">
                <textarea
                  value={activeTab.bodyRaw}
                  onChange={(e) => updateField({ bodyRaw: e.target.value })}
                  placeholder="Raw request body"
                />
              </div>
            )}
            {activeTab.bodyType === 'form-data' && (
              <div className="kv-grid">
                {activeTab.bodyFormData.map((item, index) => (
                  <div key={item.id} className="kv-row">
                    <label className="kv-checkbox">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          updatePairs('bodyFormData', index, { enabled: e.target.checked })
                        }
                      />
                    </label>
                    <input
                      className="kv-key"
                      placeholder="Field"
                      value={item.key}
                      onChange={(e) => updatePairs('bodyFormData', index, { key: e.target.value })}
                    />
                    <input
                      className="kv-value"
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) => updatePairs('bodyFormData', index, { value: e.target.value })}
                    />
                    <button className="icon-button" onClick={() => removeRow('bodyFormData', index)}>
                      ×
                    </button>
                  </div>
                ))}
                <button className="link-button" onClick={() => addRow('bodyFormData')}>
                  + Add Form Field
                </button>
              </div>
            )}
            {activeTab.bodyType === 'x-www-form-urlencoded' && (
              <div className="kv-grid">
                {activeTab.bodyUrlEncoded.map((item, index) => (
                  <div key={item.id} className="kv-row">
                    <label className="kv-checkbox">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          updatePairs('bodyUrlEncoded', index, { enabled: e.target.checked })
                        }
                      />
                    </label>
                    <input
                      className="kv-key"
                      placeholder="Key"
                      value={item.key}
                      onChange={(e) => updatePairs('bodyUrlEncoded', index, { key: e.target.value })}
                    />
                    <input
                      className="kv-value"
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) =>
                        updatePairs('bodyUrlEncoded', index, { value: e.target.value })
                      }
                    />
                    <button className="icon-button" onClick={() => removeRow('bodyUrlEncoded', index)}>
                      ×
                    </button>
                  </div>
                ))}
                <button className="link-button" onClick={() => addRow('bodyUrlEncoded')}>
                  + Add Field
                </button>
              </div>
            )}
          </div>
        )}

        {activeSection === 'auth' && (
          <div className="card-1">
          
            <div className="auth-grid">
              <label>
                
                <select
                  value={activeTab.auth.type}
                  onChange={(e) =>
                    updateField({
                      auth: {
                        ...activeTab.auth,
                        type: e.target.value as AuthConfig['type'],
                      },
                    })
                  }
                >
                  {AUTH_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              {activeTab.auth.type === 'bearer' && (
                <label>
                  Token
                  <input
                    value={activeTab.auth.bearerToken ?? ''}
                    onChange={(e) =>
                      updateField({
                        auth: {
                          ...activeTab.auth,
                          bearerToken: e.target.value,
                        },
                      })
                    }
                    placeholder="Bearer token"
                  />
                </label>
              )}

              {activeTab.auth.type === 'basic' && (
                <>
                  <label>
                    Username
                    <input
                      value={activeTab.auth.basicUsername ?? ''}
                      onChange={(e) =>
                        updateField({
                          auth: {
                            ...activeTab.auth,
                            basicUsername: e.target.value,
                          },
                        })
                      }
                      placeholder="Username"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={activeTab.auth.basicPassword ?? ''}
                      onChange={(e) =>
                        updateField({
                          auth: {
                            ...activeTab.auth,
                            basicPassword: e.target.value,
                          },
                        })
                      }
                      placeholder="Password"
                    />
                  </label>
                </>
              )}

              {activeTab.auth.type === 'api-key' && (
                <>
                  <label>
                    Key name
                    <input
                      value={activeTab.auth.apiKeyName ?? ''}
                      onChange={(e) =>
                        updateField({
                          auth: {
                            ...activeTab.auth,
                            apiKeyName: e.target.value,
                          },
                        })
                      }
                      placeholder="X-API-Key"
                    />
                  </label>
                  <label>
                    Value
                    <input
                      value={activeTab.auth.apiKeyValue ?? ''}
                      onChange={(e) =>
                        updateField({
                          auth: {
                            ...activeTab.auth,
                            apiKeyValue: e.target.value,
                          },
                        })
                      }
                      placeholder="secret"
                    />
                  </label>
                  <label>
                    Location
                    <select
                      value={activeTab.auth.apiKeyLocation ?? 'header'}
                      onChange={(e) =>
                        updateField({
                          auth: {
                            ...activeTab.auth,
                            apiKeyLocation: e.target.value as 'header' | 'query',
                          },
                        })
                      }
                    >
                      <option value="header">Header</option>
                      <option value="query">Query</option>
                    </select>
                  </label>
                </>
              )}

              {activeTab.auth.type === 'oauth2' && (
                <label className="span-full">
                  OAuth2 token (stub)
                  <input
                    value={activeTab.auth.oauth2Token ?? ''}
                    onChange={(e) =>
                      updateField({
                        auth: {
                          ...activeTab.auth,
                          oauth2Token: e.target.value,
                        },
                      })
                    }
                    placeholder="OAuth2 token"
                  />
                </label>
              )}
            </div>
          </div>
        )}

       
        </div>
      </div>
      </div>

      
    </section>
  );
};

export default RequestEditor;
