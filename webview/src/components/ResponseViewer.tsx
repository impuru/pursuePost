import React from 'react';
import type { ResponseData } from '../types';

interface Props {
  response: ResponseData | null;
  activeTab: 'response' | 'raw' | 'headers';
  setActiveTab: (tab: 'response' | 'raw' | 'headers') => void;
}

const responseClass = (status: number): string => {
  if (status >= 200 && status < 300) return 'status-success';
  if (status >= 300 && status < 400) return 'status-warning';
  if (status >= 400) return 'status-error';
  return 'status-neutral';
};

const syntaxHighlight = (json: string) => {
  try {
    const clean = JSON.stringify(JSON.parse(json), null, 2);
    return clean
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, (match) => {
        let cls = 'number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      });
  } catch {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};

const ResponseViewer: React.FC<Props> = ({ response, activeTab, setActiveTab }) => {
  return (
    <section className="panelbg response-panel">
      <div className="response-meta">
            {response ? (
              <>Status:
                <span className={responseClass(response.status)}>
                  {response.status} {response.statusText}
                </span>
                <span>Time: {response.time} ms</span>
                <span>Size: {response.size} bytes</span>
              </>
            ) : (
              <>Status: <span className="status-neutral">Ready</span></>
            )}
          </div>
     
      
        <div className="section-tabs">
          {(['response', 'raw', 'headers'] as const).map((tab) => (
            <button
              key={tab}
              className={`section-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
     

      <div className="response-content">
        {!response && <div className="empty-state">Send a request to see the response.</div>}
        {response && activeTab === 'response' && (
          <pre
            className="response-body response"
            dangerouslySetInnerHTML={{
              __html: syntaxHighlight(response.body || '{}'),
            }}
          />
        )}
        {response && activeTab === 'raw' && (
          <pre className="response-body raw">{response.body || ''}</pre>
        )}
        {response && activeTab === 'headers' && (
          <div className="headers-grid">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="header-row">
                <span className="header-key">{key}</span>
                <span className="header-value">{value}</span>
              </div>
            ))}
          </div>
        )}
        {response?.error && <div className="error-note">{response.error}</div>}
      </div>
    </section>
  );
};

export default ResponseViewer;
