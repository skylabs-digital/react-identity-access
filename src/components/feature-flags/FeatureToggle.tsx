import { useFeatureFlags } from '../../hooks/useFeatureFlags';

export interface FeatureToggleProps {
  flag: string;
  onToggle?: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  flag,
  onToggle,
  disabled,
  className,
}) => {
  const { isEnabled, canEdit, updateFlag } = useFeatureFlags();

  const enabled = isEnabled(flag);
  const editable = canEdit(flag) && !disabled;

  const handleToggle = async () => {
    if (!editable) return;

    try {
      const newState = !enabled;
      await updateFlag(flag, newState);
      onToggle?.(newState);
    } catch (error) {
      console.error('Failed to toggle feature flag:', error);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!editable}
      className={`feature-toggle ${enabled ? 'enabled' : 'disabled'} ${!editable ? 'readonly' : ''} ${className || ''}`}
      style={{
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: enabled ? '#28a745' : '#6c757d',
        color: 'white',
        cursor: editable ? 'pointer' : 'not-allowed',
        opacity: editable ? 1 : 0.6,
      }}
    >
      {enabled ? 'ON' : 'OFF'}
    </button>
  );
};
