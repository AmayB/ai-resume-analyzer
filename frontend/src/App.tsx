import { useState } from "react";
import "./App.css";

interface MatchedSkill {
  skill: string;
  evidence: string;
}

interface MissingSkill {
  skill: string;
  importance: string;
  reason: string;
}

interface WeakSkill {
  skill: string;
  reason: string;
}

interface BulletImprovement {
  original: string;
  improved: string;
}

interface Analysis {
  match_score: number;
  summary: string;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  weak_skills: WeakSkill[];
  keyword_gaps: string[];
  recommendations: string[];
  bullet_improvements: BulletImprovement[];
}

interface AnalysisResult {
  filename: string;
  analysis: Analysis;
}

function App() {
  const [resume, setResume] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const API_URL = import.meta.env.VITE_API_URL;

  const analyzeResume = async () => {
    if (!resume) {
      setError("Please upload your resume.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please paste a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();

    formData.append("resume", resume);
    formData.append("job_description", jobDescription);

    try {
      const response = await fetch(
        `${API_URL}/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.error || "Failed to analyze resume."
        );
      }

      setResult(data);
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">AI RESUME ANALYZER</div>

        <a
          className="portfolio-link"
          href="https://amaybhardwaj.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          amaybhardwaj.com ↗
        </a>
      </nav>

      <main>
        <section className="hero">
          <h1>AI RESUME ANALYZER</h1>
        </section>

        <section className="analyzer">
          <div className="input-section">
            <div className="section-header">
              <h2>Your resume</h2>
            </div>

            <label className="upload-box">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0] ?? null;

                  setResume(file);
                  setError("");
                }}
              />

              <div className="upload-content">
                <div className="upload-icon">↑</div>

                {resume ? (
                  <>
                    <strong>{resume.name}</strong>
                    <span>Resume selected</span>
                  </>
                ) : (
                  <>
                    <strong>
                      Upload your resume
                    </strong>
                    <span>PDF or DOCX</span>
                  </>
                )}
              </div>
            </label>
          </div>

          <div className="input-section">
            <div className="section-header">
              <h2>Job description</h2>
            </div>

            <textarea
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setError("");
              }}
              placeholder="Paste the job description here..."
            />
          </div>

          <button
            className="analyze-button"
            onClick={analyzeResume}
            disabled={loading}
          >
            {loading
              ? "ANALYZING..."
              : "ANALYZE RESUME"}

            <span>→</span>
          </button>
        </section>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {result && (
          <section className="results">
            <div className="results-header">
              <div>
                <p className="eyebrow">
                  ANALYSIS COMPLETE
                </p>

                <h2>{result.filename}</h2>
              </div>

              <div className="score">
                <strong>
                  {result.analysis.match_score}%
                </strong>

                <span>MATCH</span>
              </div>
            </div>

            <div className="summary">
              <p>
                {result.analysis.summary}
              </p>
            </div>

            <div className="result-grid">
              <div className="result-column">
                <div className="result-heading">
                  <h3>Matched skills</h3>
                </div>

                <div className="skill-list">
                  {result.analysis.matched_skills.map(
                    (item) => (
                      <div
                        className="skill-item"
                        key={item.skill}
                      >
                        <strong>
                          ✓ {item.skill}
                        </strong>

                        <p>
                          {item.evidence}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="result-column">
                <div className="result-heading">
                  <h3>Missing skills</h3>
                </div>

                <div className="skill-list">
                  {result.analysis.missing_skills.map(
                    (item) => (
                      <div
                        className="skill-item"
                        key={item.skill}
                      >
                        <strong>
                          ! {item.skill}
                        </strong>

                        <p>
                          {item.reason}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="result-block">
              <div className="result-heading">
                <h3>Keyword gaps</h3>
              </div>

              <div className="keyword-list">
                {result.analysis.keyword_gaps.map(
                  (keyword) => (
                    <span key={keyword}>
                      {keyword}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="result-block">
              <div className="result-heading">
                <h3>Recommendations</h3>
              </div>

              <div className="recommendation-list">
                {result.analysis.recommendations.map(
                  (recommendation, index) => (
                    <div
                      className="recommendation"
                      key={index}
                    >
                      <strong>
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </strong>

                      <p>{recommendation}</p>
                    </div>
                  )
                )}
              </div>
            </div>

            {result.analysis.bullet_improvements.length >
              0 && (
              <div className="result-block">
                <div className="result-heading">
                  <h3>Bullet improvements</h3>
                </div>

                <div className="bullet-list">
                  {result.analysis.bullet_improvements.map(
                    (bullet, index) => (
                      <div
                        className="bullet-improvement"
                        key={index}
                      >
                        <div>
                          <span>BEFORE</span>
                          <p>
                            {bullet.original}
                          </p>
                        </div>

                        <div>
                          <span>AFTER</span>
                          <p>
                            {bullet.improved}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;