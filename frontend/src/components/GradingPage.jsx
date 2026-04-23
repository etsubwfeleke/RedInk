import React, { useState } from 'react';
import axios from 'axios';
import { Icon } from 'semantic-ui-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function GradingPage({ config, onGradingInitiated, onBulkGradingInitiated }) {
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  const [studentName, setStudentName] = useState('');
  const [studentFile, setStudentFile] = useState(null);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courseSetup, setCourseSetup] = useState(null);

  React.useEffect(() => {
    // Load saved course setup
    const saved = localStorage.getItem('redink_course_setup');
    if (saved) {
      try {
        setCourseSetup(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load course setup');
      }
    }
  }, []);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!config?.api_key) {
        throw new Error('Please configure AI settings first');
      }
      if (!courseSetup) {
        throw new Error('Please set up course (rubric & golden) first in Upload page');
      }
      if (!studentFile) {
        throw new Error('Student assignment is required');
      }

      // Get saved course files
    const savedFiles = localStorage.getItem('redink_course_files');
    if (!savedFiles) {
    throw new Error('Course files not found. Please re-upload rubric.');
    }

    const courseFiles = JSON.parse(savedFiles);

    // Course files are already in base64 format
    const rubric_file = courseFiles.rubric.data;
    const student_file = await fileToBase64(studentFile);
    const golden_file = courseFiles.golden ? courseFiles.golden.data : null;

    const request = {
    llm_provider: config.llm_provider,
    api_key: config.api_key,
    model_name: config.model_name || null,
    rubric_file,
    rubric_filename: courseFiles.rubric.name,
    student_file,
    student_filename: studentFile.name,
    golden_file,
    golden_filename: courseFiles.golden?.name || null,
    student_name: studentName || null,
    additional_context: context || null
    };

      const response = await axios.post(`${API_URL}/api/grading/initiate`, request);
      onGradingInitiated({ ...response.data, student_name: studentName });

    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
  e.preventDefault();
  
  if (!courseSetup || bulkFiles.length === 0) {
    setError('Please upload student files');
    return;
  }

  try {
    // Get course files
    const savedFiles = localStorage.getItem('redink_course_files');
    if (!savedFiles) {
      throw new Error('Course files not found');
    }

    const courseFiles = JSON.parse(savedFiles);

    // Prepare bulk data (don't grade yet)
    const students = Array.from(bulkFiles).map(file => ({
      file: file,
      filename: file.name,
      student_name: file.name.replace(/\.[^/.]+$/, "")
    }));

    const bulkData = {
      rubric_file: courseFiles.rubric.data,
      rubric_filename: courseFiles.rubric.name,
      golden_file: courseFiles.golden ? courseFiles.golden.data : null,
      golden_filename: courseFiles.golden?.name || null,
      students: students,
      additional_context: context || null
    };

    onBulkGradingInitiated(bulkData);

  } catch (err) {
    console.error('Error:', err);
    setError(err.message);
  }
};

  return (
    <div className="max-w-5xl mx-auto p-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-5xl font-bold text-red-600 redink-font mb-3">
          Grade Students
        </h2>
        <p className="text-lg text-gray-600">
          Grade one student at a time or upload multiple assignments for batch processing
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={() => setMode('single')}
          className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${
            mode === 'single'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="mb-1">
            <Icon name="user" size="large" />
          </div>
          Single Student
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${
            mode === 'bulk'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="mb-1">
            <Icon name="users" size="large" />
          </div>
          Bulk Grading
        </button>
      </div>

      {/* Course Setup Status */}
      {courseSetup ? (
        <div className="mb-8 paper-bg p-4 rounded-lg border-l-4 border-green-400">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="check circle" className="text-green-600" size="large" />
            <span className="text-green-800 font-semibold">Course Ready</span>
          </div>
          <div className="text-sm text-gray-700">
            <p>
              <Icon name="clipboard outline" /> {courseSetup.rubricName}
            </p>
            {courseSetup.goldenName && <p>
              <Icon name="star outline" /> {courseSetup.goldenName}
            </p>}
          </div>
        </div>
      ) : (
        <div className="mb-8 paper-bg p-6 rounded-lg border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="warning circle" className="text-red-600" size="large" />
            <span className="text-red-800 font-semibold">No Course Setup</span>
          </div>
          <p className="text-red-700 text-sm mb-3">
            Please upload rubric and golden assignment in the Course Setup page first.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-8 paper-bg border-l-4 border-red-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start gap-3">
            <Icon name="warning circle" size="huge" className="text-red-600" />
            <div>
              <h4 className="font-bold text-red-900 mb-1">Error</h4>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Single Student Mode */}
      {mode === 'single' && (
        <form onSubmit={handleSingleSubmit} className="space-y-8">
          <div className="paper-bg rounded-2xl shadow-lg p-10 space-y-6">
            {/* Student Name/ID */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="user" size="large" />
                Student Name or ID
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g., John Smith or Student #12345"
                className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg shadow-sm"
              />
            </div>

            {/* Student Assignment */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="file outline" size="large" />
                Student Assignment <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="w-full px-5 py-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="text-center">
                    {studentFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <Icon name="check circle" size="large" className="text-green-700" />
                        <span className="font-semibold text-green-700">{studentFile.name}</span>
                        <span className="text-sm text-gray-500">({(studentFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600 font-medium">Click to upload student's work</p>
                        <p className="text-sm text-gray-500 mt-1">PDF, DOCX, MD, TXT, PY, IPYNB</p>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.md,.txt,.py,.ipynb,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.cs,.rb,.go,.rs,.swift,.kt,.php,.sql,.sh,.r,.css,.html,.json"
                  onChange={(e) => setStudentFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Context/Notes */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="comment outline" size="large" />
                Additional Context <span className="text-sm font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., 'Student requested extension' or 'Resubmission after feedback'"
                className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none shadow-sm"
                rows="4"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !courseSetup || !studentFile}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:transform-none disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <Icon name="spinner" loading />
                AI is grading...
              </span>
            ) : (
              'Start Grading →'
            )}
          </button>
        </form>
      )}

      {/* Bulk Mode */}
      {mode === 'bulk' && (
        <form onSubmit={handleBulkSubmit} className="space-y-8">
          <div className="paper-bg rounded-2xl shadow-lg p-10 space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>Bulk Grading:</strong> Upload multiple student assignments. Each file will be graded individually and you can review them one by one.
              </p>
            </div>

            {/* Bulk File Upload */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="folder open" size="large" />
                Student Assignments <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Select multiple files. Filename will be used as student name.
              </p>
              <div className="relative">
                <div className="w-full px-5 py-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="text-center">
                    {bulkFiles.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-center gap-3 mb-3">
                          <Icon name="check circle" size="large" className="text-green-700" />
                          <span className="font-semibold text-green-700">{bulkFiles.length} files selected</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto text-sm text-gray-600">
                          {Array.from(bulkFiles).map((file, idx) => (
                            <div key={idx} className="py-1">{file.name}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600 font-medium">Click to select multiple student files</p>
                        <p className="text-sm text-gray-500 mt-1">PDF, DOCX, MD, TXT, PY, IPYNB, JS, JSX, TS, TSX, JAVA, CPP, C, H, CS, RB, GO, RS, SWIFT, KT, PHP, SQL, SH, R, CSS, HTML, JSON</p>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.md,.txt,.py,.ipynb,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.cs,.rb,.go,.rs,.swift,.kt,.php,.sql,.sh,.r,.css,.html,.json"
                  onChange={(e) => setBulkFiles(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Context for all */}
            <div>
              <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="comment outline" size="large" />
                Context for All Students <span className="text-sm font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., 'Midterm exam submissions' or 'Final project - extra credit opportunity'"
                className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none shadow-sm"
                rows="4"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !courseSetup || bulkFiles.length === 0}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:transform-none disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <Icon name="spinner" loading />
                Processing {bulkFiles.length} students...
              </span>
            ) : (
              `Grade ${bulkFiles.length} Students →`
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default GradingPage;