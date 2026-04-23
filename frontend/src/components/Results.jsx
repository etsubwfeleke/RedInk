import React from 'react';
import { Icon } from 'semantic-ui-react';

function Results({ result, onNewGrading }) {
  console.log("=== RESULTS DATA ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("=== END ===");
// Use result.total_score and result.max_total_score from backend
const totalScore = result.total_score || 0;
const maxScore = result.max_total_score || 0;
const percentage = result.percentage?.toFixed(1) || '0.0';

  const getGradeColor = (percent) => {
    if (percent >= 90) return 'text-green-600';
    if (percent >= 80) return 'text-blue-600';
    if (percent >= 70) return 'text-yellow-600';
    if (percent >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeLetter = (percent) => {
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="max-w-6xl mx-auto p-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-block">
          <h2 className="text-6xl font-bold text-red-600 redink-font mb-2">
            Grading Complete!
          </h2>
          <div className="h-1 bg-red-400 rounded-full"></div>
        </div>
        <p className="text-lg text-gray-600 mt-4">
          Final grades and AI-generated feedback
        </p>
      </div>

      {/* Final Score Card - Big and Prominent */}
      <div className="paper-bg rounded-2xl shadow-2xl p-12 mb-8 border-4 border-red-300 bg-gradient-to-br from-white to-red-50">
        <p className="text-center text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
          Final Score
        </p>
        <div className="text-center mb-6">
          <div className="text-8xl font-bold text-gray-900 mb-2">
            {totalScore.toFixed(1)} <span className="text-5xl text-gray-500">/ {maxScore}</span>
          </div>
          <div className={`text-6xl font-bold ${getGradeColor(percentage)} mb-2`}>
            {percentage}%
          </div>
          <div className={`inline-block px-8 py-3 rounded-full text-4xl font-bold ${getGradeColor(percentage)} bg-white shadow-lg border-4 ${
            percentage >= 90 ? 'border-green-400' :
            percentage >= 80 ? 'border-blue-400' :
            percentage >= 70 ? 'border-yellow-400' :
            percentage >= 60 ? 'border-orange-400' :
            'border-red-400'
          }`}>
            {getGradeLetter(percentage)}
          </div>
        </div>

        {/* Grade Distribution Bar */}
        <div className="mt-6">
          <div className="h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                percentage >= 90 ? 'bg-green-500' :
                percentage >= 80 ? 'bg-blue-500' :
                percentage >= 70 ? 'bg-yellow-500' :
                percentage >= 60 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 font-semibold">
            <span>0%</span>
            <span>F</span>
            <span>D</span>
            <span>C</span>
            <span>B</span>
            <span>A</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Overall Feedback */}
      {result.overall_comments && (
        <div className="paper-bg rounded-xl shadow-md p-8 mb-8 border-l-4 border-yellow-400">
          <div className="flex items-start gap-3 mb-4">
            <Icon name="comment outline" size="large" />
            <h3 className="text-2xl font-bold text-gray-900">Overall Feedback</h3>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed text-lg">
              {result.overall_comments}
            </p>
          </div>
        </div>
      )}

      {/* Detailed Grades */}
      <div className="mb-8">
        <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <span className="text-red-600 redink-font">Detailed Grades</span>
        </h3>

        <div className="space-y-4">
          {result.grades?.map((grade, idx) => {
            const gradePercent = ((grade.score / grade.max_points) * 100).toFixed(0);
            
            return (
              <div
                key={idx}
                className="paper-bg rounded-xl shadow-md p-6 border-2 border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-1">
                      {grade.criterion_name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Max: {grade.max_points} points</span>
                      <span>•</span>
                      <span className="font-semibold">{gradePercent}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-red-600">
                      {grade.score}
                    </div>
                    <div className="text-sm text-gray-500">points</div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mb-4">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        gradePercent >= 90 ? 'bg-green-500' :
                        gradePercent >= 80 ? 'bg-blue-500' :
                        gradePercent >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${gradePercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Reasoning */}
                {grade.reasoning && (
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Reasoning:</p>
                    <p className="text-sm text-blue-800">{grade.reasoning}</p>
                  </div>
                )}

                {/* TA Notes */}
                {grade.ta_notes && (
                  <div className="mt-3 bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">TA Notes:</p>
                    <p className="text-sm text-yellow-800">{grade.ta_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual Feedback Items */}
      {result.feedback && result.feedback.length > 0 && (
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-red-600 redink-font">Detailed Feedback</span>
          </h3>

          <div className="space-y-6">
            {result.feedback.map((item, idx) => (
              <div
                key={idx}
                className="paper-bg rounded-xl shadow-md p-6 border-l-4 border-purple-400"
              >
                <h4 className="text-xl font-bold text-gray-900 mb-4">{item.criterion_name}</h4>
                
                {/* Strengths */}
                {item.strengths && item.strengths.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="winner" color="green" />
                      <span className="font-semibold text-green-800">Strengths</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-8 text-gray-700">
                      {item.strengths.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {item.areas_for_improvement && item.areas_for_improvement.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="chart line" color="orange" />
                      <span className="font-semibold text-orange-800">Areas for Improvement</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-8 text-gray-700">
                      {item.areas_for_improvement.map((area, i) => (
                        <li key={i}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Specific Suggestions */}
                {item.specific_suggestions && item.specific_suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="lightbulb outline" color="blue" />
                      <span className="font-semibold text-blue-800">Suggestions</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-8 text-gray-700">
                      {item.specific_suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mt-12">
        <button
          onClick={onNewGrading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-5 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
        >
          Grade Another Assignment →
        </button>
        <button
          onClick={() => {
            const content = `
Student Grade Report
===================

Final Score: ${totalScore.toFixed(1)} / ${maxScore} (${percentage}%)
Grade: ${getGradeLetter(percentage)}

Overall Feedback:
${result.overall_comments}

Detailed Grades:
${result.grades?.map(g => `
${g.criterion_name}: ${g.score} / ${g.max_points}
${g.reasoning}
`).join('\n')}
            `.trim();
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `grade-report-${Date.now()}.txt`;
            a.click();
          }}
          className="px-8 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-5 rounded-xl transition-all flex items-center gap-2"
        >
          <Icon name="download" />
          Export Report
        </button>
      </div>

      {/* Success Message */}
      <div className="mt-8 text-center">
        <div className="inline-block paper-bg px-6 py-3 rounded-full border-2 border-green-400">
          <span className="text-green-700 font-semibold flex items-center gap-2">
            <Icon name="check circle" color="green" />
            Grading saved successfully!
          </span>
        </div>
      </div>
    </div>
  );
}

export default Results;