import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function FileUpload({ onGradingInitiated }) {
  const [config, setConfig] = useState({
    llm_provider: 'claude',
    api_key: '',
    model_name: ''
  });
  const [files, setFiles] = useState({
    rubric: null,
    golden: null,
    student: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!config.api_key) {
        throw new Error('API key is required');
      }
      if (!files.rubric || !files.student) {
        throw new Error('Rubric and student assignment are required');
      }

      // Convert files to base64
      const rubric_file = await fileToBase64(files.rubric);
      const student_file = await fileToBase64(files.student);
      const golden_file = files.golden ? await fileToBase64(files.golden) : null;

      // Prepare request
      const request = {
        llm_provider: config.llm_provider,
        api_key: config.api_key,
        model_name: config.model_name || null,
        rubric_file,
        rubric_filename: files.rubric.name,
        student_file,
        student_filename: files.student.name,
        golden_file,
        golden_filename: files.golden?.name || null
      };

      // Call API
      const response = await axios.post(`${API_URL}/api/grading/initiate`, request);
      
      // Success - move to review step
      onGradingInitiated(response.data);

    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Files & Configure AI</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Configuration */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Provider
              </label>
              <select
                value={config.llm_provider}
                onChange={(e) => setConfig({ ...config, llm_provider: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="claude">Claude (Anthropic)</option>
                <option value="openai">GPT-4 (OpenAI)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key *
              </label>
              <input
                type="password"
                value={config.api_key}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                placeholder="sk-..."
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your API key is only used for this session and never stored
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Name (Optional)
              </label>
              <input
                type="text"
                value={config.model_name}
                onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                placeholder={config.llm_provider === 'claude' ? 'claude-3-5-sonnet-20241022' : 'gpt-4-turbo-preview'}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* File Uploads */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rubric * <span className="text-gray-500 font-normal">(PDF, DOCX, MD, TXT)</span>
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.md,.txt"
                onChange={(e) => setFiles({ ...files, rubric: e.target.files[0] })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {files.rubric && (
                <p className="mt-1 text-sm text-green-600">✓ {files.rubric.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Golden Assignment (Optional) <span className="text-gray-500 font-normal">(PDF, DOCX, MD, TXT)</span>
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.md,.txt"
                onChange={(e) => setFiles({ ...files, golden: e.target.files[0] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {files.golden && (
                <p className="mt-1 text-sm text-green-600">✓ {files.golden.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                A perfect-score example to set grading standards
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Assignment * <span className="text-gray-500 font-normal">(PDF, DOCX, MD, TXT)</span>
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.md,.txt"
                onChange={(e) => setFiles({ ...files, student: e.target.files[0] })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {files.student && (
                <p className="mt-1 text-sm text-green-600">✓ {files.student.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Start Grading'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FileUpload;
