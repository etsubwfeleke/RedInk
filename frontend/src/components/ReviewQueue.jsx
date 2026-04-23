import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ReviewQueue({ workflowId, onComplete }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adjustedGrades, setAdjustedGrades] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (workflowId) {
      fetchState();
    } else {
      setLoading(false);
    }
  }, [workflowId]);

  const fetchState = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/grading/state/${workflowId}`);
      setState(response.data);
      
      // Initialize adjusted grades with proposed grades
      const initial = {};
      response.data.proposed_grades?.forEach(grade => {
        initial[grade.criterion_name] = grade.points_awarded;
      });
      setAdjustedGrades(initial);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setLoading(false);
    }
  };

  const handleGradeChange = (criterionName, value) => {
    setAdjustedGrades({
      ...adjustedGrades,
      [criterionName]: parseFloat(value)
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const reviewed_grades = state.proposed_grades.map(grade => ({
        criterion_name: grade.criterion_name,
        score: adjustedGrades[grade.criterion_name],
        max_points: grade.max_points,
        reasoning: grade.justification,
        ta_notes: notes
      }));

      const response = await axios.post(`${API_URL}/api/grading/review`, {
        workflow_id: workflowId,
        reviewed_grades,
        ta_notes: notes
      });

      onComplete(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setSubmitting(false);
    }
  };
  // ADD THIS: Empty state when no workflow
  if (!workflowId && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-2xl">
          <div className="paper-bg rounded-2xl shadow-lg p-12 border-2 border-gray-200">
            <div className="text-8xl mb-6">✏️</div>
            <h3 className="text-4xl font-bold text-gray-900 mb-4 redink-font text-red-600">
              No Grades to Review
            </h3>
            <p className="text-lg text-gray-600 mb-8">
              Upload files and start the grading process to see proposed grades here.
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="paper-bg p-4 rounded-lg border-2 border-gray-200">
                <div className="text-3xl mb-2">1️⃣</div>
                <p className="font-semibold text-gray-700">Configure AI</p>
              </div>
              <div className="paper-bg p-4 rounded-lg border-2 border-gray-200">
                <div className="text-3xl mb-2">2️⃣</div>
                <p className="font-semibold text-gray-700">Upload Files</p>
              </div>
              <div className="paper-bg p-4 rounded-lg border-2 border-red-300 bg-red-50">
                <div className="text-3xl mb-2">3️⃣</div>
                <p className="font-semibold text-red-700">Review Here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <p className="text-xl text-gray-600">AI is analyzing the work...</p>
          <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-12">
        <div className="paper-bg border-l-4 border-red-500 p-8 rounded-lg">
          <h3 className="text-2xl font-bold text-red-900 mb-2">Error</h3>
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const totalProposed = state.proposed_grades?.reduce((sum, g) => sum + g.points_awarded, 0) || 0;
  const totalMax = state.proposed_grades?.reduce((sum, g) => sum + g.max_points, 0) || 0;
  const totalAdjusted = Object.values(adjustedGrades).reduce((sum, val) => sum + val, 0);
  const percentage = ((totalAdjusted / totalMax) * 100).toFixed(1);

  return (
    <div className="max-w-6xl mx-auto p-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-5xl font-bold text-red-600 redink-font mb-3">
          Review Grades
        </h2>
        <p className="text-lg text-gray-600">
          AI has proposed grades. Review and adjust before finalizing.
        </p>
      </div>

      {/* Score Summary Card */}
      <div className="paper-bg rounded-2xl shadow-lg p-8 mb-8 border-2 border-red-200">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">AI Proposed</p>
            <p className="text-4xl font-bold text-gray-700">
              {totalProposed.toFixed(1)} <span className="text-2xl text-gray-500">/ {totalMax}</span>
            </p>
          </div>
          <div className="text-center border-l-2 border-r-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Your Adjusted Score</p>
            <p className="text-5xl font-bold text-red-600">
              {totalAdjusted.toFixed(1)} <span className="text-3xl text-gray-500">/ {totalMax}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Percentage</p>
            <p className={`text-4xl font-bold ${
              percentage >= 90 ? 'text-green-600' :
              percentage >= 80 ? 'text-blue-600' :
              percentage >= 70 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {percentage}%
            </p>
          </div>
        </div>
      </div>

      {/* Criteria Cards */}
      <div className="space-y-6 mb-8">
        {state.proposed_grades?.map((grade, idx) => {
          const isAdjusted = adjustedGrades[grade.criterion_name] !== grade.points_awarded;
          
          return (
            <div
              key={idx}
              className={`paper-bg rounded-xl shadow-md p-6 border-2 transition-all ${
                isAdjusted ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {grade.criterion_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Maximum points: {grade.max_points}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-2">AI Proposed: {grade.points_awarded}</p>
                  <input
                    type="number"
                    min="0"
                    max={grade.max_points}
                    step="0.5"
                    value={adjustedGrades[grade.criterion_name] || 0}
                    onChange={(e) => handleGradeChange(grade.criterion_name, e.target.value)}
                    className="w-24 px-3 py-2 text-xl font-bold text-center border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400">
                <p className="text-sm font-semibold text-gray-700 mb-2">AI Reasoning:</p>
                <p className="text-sm text-gray-700">{grade.justification}</p>
              </div>

              {isAdjusted && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-700 font-semibold">
                  <span>✏️</span>
                  <span>You adjusted this grade</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TA Notes */}
      <div className="paper-bg rounded-xl shadow-md p-6 mb-8">
        <label className="block text-lg font-bold text-gray-900 mb-3">
          📝 Add Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes or context about your grading decisions..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          rows="4"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all"
        >
          ← Start Over
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin">⚙️</span>
              Generating Feedback...
            </span>
          ) : (
            'Finalize & Generate Feedback →'
          )}
        </button>
      </div>
    </div>
  );
}

export default ReviewQueue;