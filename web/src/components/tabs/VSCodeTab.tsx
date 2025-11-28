import { useState } from 'react';
import EditorPanel from '../Editor/EditorPanel';
import { VSCodeSubtabs } from '../VSCode/VSCodeSubtabs';
import { VSCodeSettingsPanel } from '../VSCode/VSCodeSettingsPanel';

/**
 * VS Code editor tab - embeds VS Code server in iframe
 */
export default function VSCodeTab() {
  const [activeSubtab, setActiveSubtab] = useState<'editor' | 'editor-settings'>('editor');

  return (
    <div className="tab-content" style={{ padding: 0 }}>
      <VSCodeSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />
      <div
        id="tab-vscode-editor"
        className={`section-subtab ${activeSubtab === 'editor' ? 'active' : ''}`}
        style={{ padding: '12px 0' }}
      >
        <EditorPanel />
      </div>
      <div
        id="tab-vscode-settings"
        className={`section-subtab ${activeSubtab === 'editor-settings' ? 'active' : ''}`}
        style={{ padding: '12px 0' }}
      >
        <VSCodeSettingsPanel />
      </div>
    </div>
  );
}
