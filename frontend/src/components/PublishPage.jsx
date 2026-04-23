import React, { useState, useEffect } from 'react';
import { Icon } from 'semantic-ui-react';

function PublishPage() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    // Load students from localStorage
    const saved = localStorage.getItem('redink_students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStudents(parsed);
      } catch (e) {
        console.error('Failed to load student history');
      }
    }
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all student history?')) {
      localStorage.removeItem('redink_students');
      setStudents([]);
    }
  };

  const handleExportStudent = (student) => {
    const content = `
Student Grade Report
===================
Student: ${student.name || 'Unknown'}
Date: ${new Date(student.timestamp).toLocaleString()}
Course: ${student.course || 'Course 1'}

Final Score: ${student.totalScore} / ${student.maxScore} (${student.percentage}%)
Grade: ${student.grade}

Overall Feedback:
${student.overallComments}

Detailed Grades:
${student.grades.map(g => `
${g.criterion_name}: ${g.score} / ${g.max_points}
${g.reasoning}
`).join('\n')}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grade-${student.name || 'student'}-${student.timestamp}.txt`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-5xl font-bold text-red-600 redink-font mb-3">
            Student History
          </h2>
          <p className="text-lg text-gray-600">
            All graded students ({students.length})
          </p>
        </div>
        {students.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {students.length === 0 ? (
        <div className="paper-bg rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
          <div className="mb-6">
            <Icon name="chart bar" size="massive" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            No Students Graded Yet
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Once you start grading assignments, you'll see a complete history here with student names, grades, and feedback.
          </p>
          
          {/* Preview of what table will look like */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-500 mb-3">
                <div>Student Name</div>
                <div>Grade</div>
                <div>Score</div>
                <div>Date</div>
                <div>Actions</div>
              </div>
              <div className="text-gray-400 py-8">
                <p className="italic">Student records will appear here...</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="paper-bg rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-red-50 border-b-2 border-red-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Student</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Course</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Grade</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Score</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{student.name || 'Unknown Student'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{student.course || 'Course 1'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      student.percentage >= 90 ? 'bg-green-100 text-green-800' :
                      student.percentage >= 80 ? 'bg-blue-100 text-blue-800' :
                      student.percentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      student.percentage >= 60 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-semibold">{student.totalScore} / {student.maxScore}</div>
                    <div className="text-sm text-gray-500">{student.percentage}%</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {new Date(student.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleExportStudent(student)}
                      className="text-red-600 hover:text-red-700 font-semibold text-sm"
                    >
                      Export →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PublishPage;