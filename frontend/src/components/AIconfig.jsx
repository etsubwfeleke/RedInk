import React, { useState } from 'react';

function AIConfig({ onSave }) {
  const [config, setConfig] = useState({
    llm_provider: 'openai',
    api_key: '',
    model_name: ''
  });

  const handleSave = () => {
    if (!config.api_key) {
      alert('Please enter an API key');
      return;
    }
    onSave(config);
  };

  return (
    <div className="max-w-4xl mx-auto p-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-5xl font-bold text-gray-900 mb-3 redink-font text-red-600">
          AI Configuration
        </h2>
        <p className="text-lg text-gray-600">
          Set up your AI tools to start grading
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Info Cards */}
        <div className="paper-bg p-5 rounded-lg border-l-4 border-red-400">
          <div className="text-3xl mb-2">🔒</div>
          <h4 className="font-semibold text-gray-900 mb-1">Secure</h4>
          <p className="text-sm text-gray-600">API keys never stored</p>
        </div>
        <div className="paper-bg p-5 rounded-lg border-l-4 border-blue-400">
          <div className="text-3xl mb-2">⚡</div>
          <h4 className="font-semibold text-gray-900 mb-1">Fast</h4>
          <p className="text-sm text-gray-600">Process in seconds</p>
        </div>
        <div className="paper-bg p-5 rounded-lg border-l-4 border-green-400">
          <div className="text-3xl mb-2">🎯</div>
          <h4 className="font-semibold text-gray-900 mb-1">Accurate</h4>
          <p className="text-sm text-gray-600">Multi-agent system</p>
        </div>
      </div>

      {/* Main Config Form */}
      <div className="paper-bg rounded-2xl shadow-lg p-10 space-y-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-sm text-red-800">
            <strong>Note:</strong> You need either an Anthropic API key (for Claude) or OpenAI API key (for GPT models).
          </p>
        </div>

        {/* LLM Provider Dropdown */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-3">
            🤖 Load up AI tools
          </label>
          <select
            value={config.llm_provider}
            onChange={(e) => setConfig({ ...config, llm_provider: e.target.value })}
            className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg bg-white shadow-sm"
          >
            <option value="claude">Claude (Anthropic) - Recommended</option>
            <option value="openai">GPT-4 (OpenAI)</option>
          </select>
          <p className="mt-2 text-sm text-gray-600">
            {config.llm_provider === 'claude' 
              ? '✨ Claude excels at nuanced reasoning and following rubrics precisely'
              : '⚡ GPT models are fast and work well for straightforward grading'
            }
          </p>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-3">
            🔑 API Key
          </label>
          <input
            type="password"
            value={config.api_key}
            onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
            placeholder={config.llm_provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
            className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg shadow-sm"
          />
          <div className="mt-3 flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
            <span className="text-lg">💡</span>
            <div className="text-sm text-gray-600">
              <p className="font-semibold mb-1">Where to get your API key:</p>
              <ul className="space-y-1 ml-4 list-disc">
                {config.llm_provider === 'claude' ? (
                  <>
                    <li>Visit <a href="https://console.anthropic.com/" target="_blank" className="text-red-600 hover:underline">console.anthropic.com</a></li>
                    <li>Create an account or sign in</li>
                    <li>Go to API Keys section and create a new key</li>
                  </>
                ) : (
                  <>
                    <li>Visit <a href="https://platform.openai.com/" target="_blank" className="text-red-600 hover:underline">platform.openai.com</a></li>
                    <li>Create an account or sign in</li>
                    <li>Go to API Keys section and create a new key</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-3">
            🎯 Model Name <span className="text-sm font-normal text-gray-500">(Optional)</span>
          </label>
          <input
            type="text"
            value={config.model_name}
            onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
            placeholder={config.llm_provider === 'claude' ? 'Leave blank for default (claude-3-5-sonnet)' : 'Leave blank for default (gpt-3.5-turbo)'}
            className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg shadow-sm"
          />
          <p className="text-sm text-gray-500 mt-2">
            Leave blank to use the default model, or specify a custom model name
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
        >
          Save Setup & Continue →
        </button>
      </div>

      {/* Bottom Help Text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Your API key is used only for this session and is never stored on our servers
        </p>
      </div>
    </div>
  );
}

export default AIConfig;