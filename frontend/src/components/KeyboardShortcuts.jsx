import React, { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

/**
 * Keyboard Shortcuts Component
 * Provides efficient keyboard navigation for common clinical tasks
 * Requirements: 4.5
 */
const KeyboardShortcuts = ({ onShortcut }) => {
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = [
    { key: 'Alt+P', action: 'patients', description: 'View patient list' },
    { key: 'Alt+N', action: 'next', description: 'Next patient' },
    { key: 'Alt+V', action: 'vitals', description: 'Focus on vitals' },
    { key: 'Alt+L', action: 'labs', description: 'Focus on lab results' },
    { key: 'Alt+M', action: 'medications', description: 'Focus on medications' },
    { key: 'Alt+A', action: 'alerts', description: 'View alerts' },
    { key: 'Alt+S', action: 'save', description: 'Save notes' },
    { key: 'Alt+?', action: 'help', description: 'Show keyboard shortcuts' },
    { key: 'Esc', action: 'close', description: 'Close dialogs' },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+P - Patient list
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        onShortcut?.('patients');
      }
      // Alt+N - Next patient
      else if (e.altKey && e.key === 'n') {
        e.preventDefault();
        onShortcut?.('next');
      }
      // Alt+V - Vitals
      else if (e.altKey && e.key === 'v') {
        e.preventDefault();
        onShortcut?.('vitals');
      }
      // Alt+L - Labs
      else if (e.altKey && e.key === 'l') {
        e.preventDefault();
        onShortcut?.('labs');
      }
      // Alt+M - Medications
      else if (e.altKey && e.key === 'm') {
        e.preventDefault();
        onShortcut?.('medications');
      }
      // Alt+A - Alerts
      else if (e.altKey && e.key === 'a') {
        e.preventDefault();
        onShortcut?.('alerts');
      }
      // Alt+S - Save
      else if (e.altKey && e.key === 's') {
        e.preventDefault();
        onShortcut?.('save');
      }
      // Alt+? - Help
      else if (e.altKey && e.key === '?') {
        e.preventDefault();
        setShowHelp(true);
      }
      // Esc - Close
      else if (e.key === 'Escape') {
        setShowHelp(false);
        onShortcut?.('close');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShortcut]);

  return (
    <>
      {/* Keyboard shortcut help button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition z-40"
        title="Keyboard shortcuts (Alt+?)"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      {/* Keyboard shortcuts help modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-labelledby="shortcuts-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 id="shortcuts-title" className="text-xl font-bold text-slate-900">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-slate-100 rounded transition"
                aria-label="Close shortcuts help"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-200"
                  >
                    <span className="text-sm text-slate-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-white border border-slate-300 rounded text-sm font-mono text-slate-900 shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-slate-700">
                  <strong>Tip:</strong> Use these keyboard shortcuts to navigate quickly through patient data and perform common tasks without using the mouse.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcuts;
