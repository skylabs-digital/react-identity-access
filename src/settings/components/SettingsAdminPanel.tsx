import React, { useState } from 'react';
import { useSettings } from '../core/SettingsProvider';
import { SchemaAnalyzer } from '../zod/schema-analyzer';
import { getNestedValue, setNestedValue } from '../utils/dot-notation';
import { clsx } from 'clsx';

export interface SettingsSection {
  key: string;
  label: string;
  fields: string[];
}

export interface SettingsAdminPanelProps {
  title?: string;
  sections?: SettingsSection[];
  showPublicIndicator?: boolean;
  onSave?: (settings: any) => void;
  className?: string;
}

export const SettingsAdminPanel: React.FC<SettingsAdminPanelProps> = ({
  title = 'Settings',
  sections,
  showPublicIndicator = true,
  onSave,
  className,
}) => {
  const { settings, updateSetting, isLoading, schema, isAuthenticated } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className={clsx('settings-admin-panel', className)}>
        <div className="auth-required">
          <p>Authentication required to manage settings</p>
        </div>
      </div>
    );
  }

  const { fieldMetadata } = SchemaAnalyzer.analyzeSchema(schema);

  // Generate sections from schema if not provided
  const finalSections = sections || [
    {
      key: 'all',
      label: 'All Settings',
      fields: Object.keys(fieldMetadata),
    },
  ];

  const handleFieldChange = (fieldPath: string, value: any) => {
    const newSettings = { ...localSettings };
    setNestedValue(newSettings, fieldPath, value);
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Update each changed field
      for (const fieldPath of Object.keys(fieldMetadata)) {
        const currentValue = getNestedValue(settings, fieldPath);
        const newValue = getNestedValue(localSettings, fieldPath);

        if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
          await updateSetting(fieldPath, newValue);
        }
      }

      setHasChanges(false);
      onSave?.(localSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Reset to current settings on error
      setLocalSettings(settings);
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  const renderField = (fieldPath: string) => {
    const metadata = fieldMetadata[fieldPath];
    if (!metadata) return null;

    const value = getNestedValue(localSettings, fieldPath);
    const fieldId = `field-${fieldPath.replace(/\./g, '-')}`;

    return (
      <div key={fieldPath} className="setting-field">
        <label htmlFor={fieldId} className="field-label">
          {fieldPath}
          {showPublicIndicator && (
            <span
              className={clsx('visibility-badge', {
                public: metadata.isPublic,
                private: !metadata.isPublic,
              })}
            >
              {metadata.isPublic ? '🌐 Public' : '🔒 Private'}
            </span>
          )}
          {metadata.isRequired && <span className="required-indicator">*</span>}
        </label>

        {renderFieldInput(fieldId, fieldPath, metadata, value)}
      </div>
    );
  };

  const renderFieldInput = (fieldId: string, fieldPath: string, metadata: any, value: any) => {
    switch (metadata.type) {
      case 'boolean':
        return (
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => handleFieldChange(fieldPath, e.target.checked)}
            className="field-input checkbox"
          />
        );

      case 'number':
        return (
          <input
            id={fieldId}
            type="number"
            value={value || ''}
            onChange={e => handleFieldChange(fieldPath, Number(e.target.value))}
            className="field-input number"
          />
        );

      case 'array':
        return (
          <textarea
            id={fieldId}
            value={Array.isArray(value) ? value.join('\n') : ''}
            onChange={e => handleFieldChange(fieldPath, e.target.value.split('\n').filter(Boolean))}
            placeholder="One item per line"
            className="field-input array"
            rows={3}
          />
        );

      case 'object':
        return (
          <textarea
            id={fieldId}
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : ''}
            onChange={e => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(fieldPath, parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
            placeholder="JSON object"
            className="field-input object"
            rows={4}
          />
        );

      default:
        return (
          <input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={e => handleFieldChange(fieldPath, e.target.value)}
            className="field-input text"
          />
        );
    }
  };

  return (
    <div className={clsx('settings-admin-panel', className)}>
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {hasChanges && (
          <div className="panel-actions">
            <button onClick={handleReset} className="btn btn-secondary" disabled={isLoading}>
              Reset
            </button>
            <button onClick={handleSave} className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="panel-content">
        {finalSections.map(section => (
          <div key={section.key} className="settings-section">
            <h3 className="section-title">{section.label}</h3>
            <div className="section-fields">{section.fields.map(renderField)}</div>
          </div>
        ))}
      </div>

      <style>{`
        .settings-admin-panel {
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          background: white;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e1e5e9;
          background: #f8f9fa;
        }

        .panel-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .panel-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-secondary {
          background: white;
          border-color: #d1d5db;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .panel-content {
          padding: 1.5rem;
        }

        .settings-section {
          margin-bottom: 2rem;
        }

        .settings-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .section-fields {
          display: grid;
          gap: 1rem;
        }

        .setting-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .visibility-badge {
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .visibility-badge.public {
          background: #dcfce7;
          color: #166534;
        }

        .visibility-badge.private {
          background: #fef3c7;
          color: #92400e;
        }

        .required-indicator {
          color: #ef4444;
          font-weight: 600;
        }

        .field-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .field-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .field-input.checkbox {
          width: auto;
          padding: 0;
        }

        .field-input.array,
        .field-input.object {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.8125rem;
          resize: vertical;
        }

        .auth-required {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};
