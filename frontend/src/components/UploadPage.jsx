import React, { useState, useEffect } from 'react';
import { Icon } from 'semantic-ui-react';

function UploadPage({ onCourseSetup }) {
  const [files, setFiles] = useState({
    rubric: null,
    golden: null
  });
  const [savedCourse, setSavedCourse] = useState(null);

  useEffect(() => {
    // Load saved course setup
    const saved = localStorage.getItem('redink_course_setup');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedCourse(parsed);
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

  const handleSave = async () => {
    if (!files.rubric) {
      alert('Rubric is required');
      return;
    }

    try {
      // Convert files to base64 for storage
      const rubricBase64 = await fileToBase64(files.rubric);
      const goldenBase64 = files.golden ? await fileToBase64(files.golden) : null;

      const courseSetup = {
        rubric: {
          data: rubricBase64,
          name: files.rubric.name,
          type: files.rubric.type
        },
        golden: files.golden ? {
          data: goldenBase64,
          name: files.golden.name,
          type: files.golden.type
        } : null,
        timestamp: Date.now()
      };

      // Save metadata for display
      localStorage.setItem('redink_course_setup', JSON.stringify({
        rubricName: files.rubric.name,
        goldenName: files.golden?.name,
        timestamp: Date.now()
      }));

      // Save actual file data
      localStorage.setItem('redink_course_files', JSON.stringify(courseSetup));

      setSavedCourse({
        rubricName: files.rubric.name,
        goldenName: files.golden?.name,
        timestamp: Date.now()
      });

      if (onCourseSetup) {
        onCourseSetup(courseSetup);
      }

      alert('Course setup saved! You can now grade students.');
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course setup. Please try again.');
    }
  };

  const handleClear = () => {
    if (confirm('Clear course setup?')) {
      localStorage.removeItem('redink_course_setup');
      localStorage.removeItem('redink_course_files');
      setSavedCourse(null);
      setFiles({ rubric: null, golden: null });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-5xl font-bold text-red-600 redink-font">
            Course Setup
          </h2>
          <span className="px-4 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
            Course 1
          </span>
        </div>
        <p className="text-lg text-gray-600">
          Upload your rubric and golden assignment once. You can then grade multiple students without re-uploading.
        </p>
      </div>

      {/* Saved Course Banner */}
      {savedCourse && (
        <div className="mb-8 paper-bg p-6 rounded-lg border-l-4 border-green-400">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="check circle" className="text-green-600" size="large" />
                <span className="text-green-800 font-semibold text-lg">Course Setup Complete</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <Icon name="clipboard outline" /> Rubric: {savedCourse.rubricName}
                </p>
                {savedCourse.goldenName && <p>
                  <Icon name="star outline" /> Golden: {savedCourse.goldenName}
                </p>}
                <p className="text-gray-500">Saved {new Date(savedCourse.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Clear & Re-upload
            </button>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="paper-bg rounded-2xl shadow-lg p-10 space-y-8">
        {/* Rubric */}
        <div>
          <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="clipboard outline" size="large" />
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
                    <Icon name="check circle" size="large" className="text-green-700" />
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
            <Icon name="star outline" size="large" />
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
                    <Icon name="check circle" size="large" className="text-green-700" />
                    <span className="font-semibold text-green-700">{files.golden.name}</span>
                    <span className="text-sm text-gray-500">({(files.golden.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">Click to select golden assignment (optional)</p>
                    <p className="text-sm text-gray-500 mt-1">PDF, DOCX, MD, TXT, PY, IPYNB, JS, JSX, TS, TSX, JAVA, CPP, C, H, CS, RB, GO, RS, SWIFT, KT, PHP, SQL, SH, R, CSS, HTML, JSON</p>
                  </div>
                )}
              </div>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.md,.txt,.py,.ipynb,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.cs,.rb,.go,.rs,.swift,.kt,.php,.sql,.sh,.r,.css,.html,.json"
              onChange={(e) => setFiles({ ...files, golden: e.target.files[0] })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={!files.rubric}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:transform-none disabled:shadow-none"
          >
            {savedCourse ? 'Update Course Setup' : 'Save Course Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;