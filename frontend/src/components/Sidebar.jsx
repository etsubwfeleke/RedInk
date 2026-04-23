import React from 'react';

function Sidebar({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'config', label: 'AI Config', icon: '⚙️', description: 'Set up your AI' },
    { id: 'upload', label: 'Upload', icon: '📁', description: 'Add files' },
    { id: 'review', label: 'Review', icon: '✏️', description: 'Grade work' },
    { id: 'publish', label: 'Publish', icon: '📊', description: 'View history' },
  ];

  return (
    <div className="w-72 bg-white border-r-2 border-red-100 min-h-screen p-6 shadow-sm flex flex-col">
      {/* Logo */}
      <div className="mb-12 pb-6 border-b-2 border-red-100">
        <h1 className="text-5xl text-red-600 mb-1 redink-font font-bold">
          RedInk
        </h1>
        <p className="text-sm text-gray-500 font-medium">Grading Assistant</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-3 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full text-left px-5 py-4 rounded-xl transition-all flex items-start gap-4 ${
              currentPage === item.id
                ? 'bg-red-50 text-red-700 shadow-md border-2 border-red-200'
                : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
            }`}
          >
            <span className="text-2xl mt-0.5">{item.icon}</span>
            <div>
              <div className="font-semibold">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* Bottom decoration - no longer absolute */}
      <div className="mt-8">
        <div className="paper-bg p-4 rounded-lg text-center border-2 border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Powered by</p>
          <p className="text-sm font-semibold text-red-600">Multi-Agent AI</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;