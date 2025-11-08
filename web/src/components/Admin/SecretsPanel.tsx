import React, { useRef, useState } from 'react';
import { useSecrets } from '@/hooks/useSecrets';

/**
 * SecretsPanel Component
 * Manages .env file ingestion and displays current environment secrets
 * Supports drag & drop and file picker for .env files
 */
export function SecretsPanel() {
  const { secrets, isLoading, error, ingestFile, toggleMask, loadSecrets } = useSecrets();
  const [persist, setPersist] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setUploadStatus('Uploading...');
    const success = await ingestFile(file, persist);

    if (success) {
      setUploadStatus(`Successfully ingested ${file.name}`);
      setTimeout(() => setUploadStatus(''), 3000);
    } else {
      setUploadStatus('Upload failed - check console for details');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const secretsList = Object.values(secrets);
  const sensitiveSecrets = secretsList.filter(s => s.masked);
  const regularSecrets = secretsList.filter(s => !s.masked);

  return (
    <div className="settings-section">
      <h3 id="admin-secrets-anchor">Secrets Management</h3>
      <p className="small">
        Import secrets from .env files. Drag and drop or click to upload.
        {' '}Secrets are loaded into the runtime environment.
      </p>

      {/* Drag & Drop Zone */}
      <div
        id="dropzone"
        className="dropzone"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'var(--panel)' : 'var(--bg)',
          transition: 'background 0.2s ease',
          marginBottom: '16px'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📁</div>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          Drop .env file here or click to browse
        </div>
        <div className="small" style={{ color: 'var(--fg-muted)' }}>
          Supports .env format files
        </div>
      </div>

      <input
        ref={fileInputRef}
        id="file-input"
        type="file"
        accept=".env,text/plain"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      {/* Persist Option */}
      <div className="input-row" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id="persist-secrets"
            type="checkbox"
            checked={persist}
            onChange={(e) => setPersist(e.target.checked)}
          />
          <span>Persist to .env file on disk</span>
        </label>
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div
          id="ingest-status"
          style={{
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            fontSize: '14px'
          }}
        >
          {uploadStatus}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            background: 'var(--error-bg)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
            fontSize: '14px'
          }}
        >
          {error}
        </div>
      )}

      {/* Secrets Display */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--fg-muted)' }}>
          Loading secrets...
        </div>
      ) : (
        <>
          {/* Sensitive Secrets */}
          {sensitiveSecrets.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--fg-muted)' }}>
                Sensitive Keys ({sensitiveSecrets.length})
              </h4>
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '4px'
                }}
              >
                {sensitiveSecrets.map((secret) => (
                  <div
                    key={secret.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div style={{ flex: '0 0 200px', fontWeight: '600' }}>
                      {secret.key}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      {secret.masked ? '••••••••••••••••' : secret.value}
                    </div>
                    <button
                      onClick={() => toggleMask(secret.key)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: 'var(--panel)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px'
                      }}
                    >
                      {secret.masked ? '👁️ Show' : '🔒 Hide'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Environment Variables */}
          {regularSecrets.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--fg-muted)' }}>
                Environment Variables ({regularSecrets.length})
              </h4>
              <details style={{ marginBottom: '16px' }}>
                <summary style={{ cursor: 'pointer', padding: '8px', background: 'var(--panel)', borderRadius: '4px' }}>
                  Show all environment variables
                </summary>
                <div
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}
                >
                  {regularSecrets.map((secret) => (
                    <div
                      key={secret.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '6px 12px',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }}
                    >
                      <div style={{ flex: '0 0 200px', color: 'var(--fg-muted)' }}>
                        {secret.key}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {secret.value || '(empty)'}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {secretsList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--fg-muted)' }}>
              No secrets loaded. Upload a .env file to get started.
            </div>
          )}
        </>
      )}

      {/* Refresh Button */}
      <div className="input-row" style={{ marginTop: '16px' }}>
        <button
          onClick={loadSecrets}
          disabled={isLoading}
          className="small-button"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: '600'
          }}
        >
          🔄 Refresh Secrets
        </button>
      </div>
    </div>
  );
}
