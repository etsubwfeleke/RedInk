import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function UploadPage({ config, onGradingInitiated }) {
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
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!config?.api_key) {
        throw new Error('Please configure AI settings first');
      }
      if (!files.rubric || !files.student) {
        throw new Error('Rubric and student assignment are required');
      }

      const rubric_file = await fileToBase64(files.rubric);
      const student_file = await fileToBase64(files.student);
      const golden_file = files.golden ? await fileToBase64(files.golden) : null;

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

      const response = await axios.post(`${API_URL}/api/grading/initiate`, request);
      onGradingInitiated(response.data);

    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-5xl font-bold text-red-600 redink-font">
            Course 1
          </h2>
          <span className="px-4 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
            Active
          </span>
        </div>
        <p className="text-lg text-gray-600">
          Upload your rubric and student assignments to begin grading
        </p>
      </div>

      {error && (
        <div className="mb-8 paper-bg border-l-4 border-red-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h4 className="font-bold text-red-900 mb-1">Error</h4>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Indicator */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className={`paper-bg p-4 rounded-lg text-center border-2 ${files.rubric ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
          <div className="text-3xl mb-2">{files.rubric ? '✅' : '📄'}</div>
          <p className="text-sm font-semibold text-gray-700">Rubric</p>
        </div>
        <div className={`paper-bg p-4 rounded-lg text-center border-2 ${files.golden ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
          <div className="text-3xl mb-2">{files.golden ? '✅' : '⭐'}</div>
          <p className="text-sm font-semibold text-gray-700">Golden (Optional)</p>
        </div>
        <div className={`paper-bg p-4 rounded-lg text-center border-2 ${files.student ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
          <div className="text-3xl mb-2">{files.student ? '✅' : '👤'}</div>
          <p className="text-sm font-semibold text-gray-700">Student</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="paper-bg rounded-2xl shadow-lg p-10 space-y-8">
        {/* Rubric */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Rubric <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Upload the grading criteria document (PDF, DOCX, MD, or TXT)
          </p>
          <div className="relative">
            <div className="w-full px-5 py-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="text-center">
                {files.rubric ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span className="font-semibold text-green-700">{files.rubric.name}</span>
                    <span className="text-sm text-gray-500">({(files.rubric.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">Click to select rubric file</p>
                    <p className="text-sm text-gray-500 mt-1">PDF, DOCX, MD, or TXT</p>
                  </div>
                )}
              </div>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.md,.txt"
              onChange={(e) => setFiles({ ...files, rubric: e.target.files[0] })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Golden Assignment */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            Golden Assignment <span className="text-sm font-normal text-gray-500">(Optional)</span>
          </label>
          <p className="text-sm text-gray-600 mb-3">
            A perfect-score example to help calibrate grading standards
          </p>
          <div className="relative">
            <div className="w-full px-5 py-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="text-center">
                {files.golden ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span className="font-semibold text-green-700">{files.golden.name}</span>
                    <span className="text-sm text-gray-500">({(files.golden.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">Click to select golden assignment (optional)</p>
                    <p className="text-sm text-gray-500 mt-1">PDF, DOCX, MD, or TXT</p>
                  </div>
                )}
              </div>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.md,.txt"
              onChange={(e) => setFiles({ ...files, golden: e.target.files[0] })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Student Submission */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-2xl">👤</span>
            Student Submission <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-600 mb-3">
            The student work to be graded
          </p>
          <div className="relative">
            <div className="w-full px-5 py-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="text-center">
                {files.student ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">✓</span>
                    <span className="font-semibold text-green-700">{files.student.name}</span>
                    <span className="text-sm text-gray-500">({(files.student.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">Click to select student submission</p>
                    <p className="text-sm text-gray-500 mt-1">PDF, DOCX, MD, or TXT</p>
                  </div>
                )}
              </div>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.md,.txt"
              onChange={(e) => setFiles({ ...files, student: e.target.files[0] })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || !files.rubric || !files.student}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:transform-none disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin">⚙️</span>
                Processing with AI...
              </span>
            ) : (
              'Start Grading →'
            )}
          </button>
        </div>
      </form>

      {/* Info Footer */}
      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="paper-bg p-5 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">What happens next?</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>AI analyzes the rubric criteria</li>
            <li>Compares student work to standards</li>
            <li>Proposes grades with reasoning</li>
            <li>You review and adjust before finalizing</li>
          </ol>
        </div>
        <div className="paper-bg p-5 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Supported file types</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>✓ PDF documents (.pdf)</p>
            <p>✓ Word documents (.docx, .doc)</p>
            <p>✓ Markdown files (.md)</p>
            <p>✓ Plain text files (.txt)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;