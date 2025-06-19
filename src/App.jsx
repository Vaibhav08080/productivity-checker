import { useState, useRef } from 'react';
import './App.css';

function App() {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const inputRef = useRef();

  const MAX_IMAGES = 18;

  const handleFiles = files => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0 || fileArr.length > MAX_IMAGES) {
      setError(`Please select between 1 and ${MAX_IMAGES} images.`);
      setImages([]);
      setPreviews([]);
      return;
    }
    setError('');
    setImages(fileArr);
    setPreviews(fileArr.map(file => URL.createObjectURL(file)));
  };

  const handleDrag = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = e => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleClick = () => inputRef.current.click();

  const handleUpload = async () => {
    if (images.length === 0 || images.length > MAX_IMAGES) {
      setError(`Please select between 1 and ${MAX_IMAGES} images.`);
      return;
    }
    setError('');
    setLoading(true);
    setSummary('');
    const formData = new FormData();
    images.forEach((img, idx) => formData.append('images', img));
    try {
      const res = await fetch('https://productivity-checker-3.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setSummary(data.summary);
      } else {
        setError(data.detail || 'Server error.');
      }
    } catch (err) {
      setError('Could not connect to backend or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-bg">
      <header className="header">
        <div className="logo">📄 Sommaire</div>
        <nav>
          <a href="#">Pricing</a>
          <a href="#">Your Summaries</a>
        </nav>
        <div className="upload-nav">Upload Images</div>
      </header>
      <div className="center-content">
        <div className="ai-label">✨ AI-Powered Content Creation</div>
        <h1 className="main-title">
          Start Uploading <span className="highlight">Your Images</span>
        </h1>
        <p className="subtitle">Upload up to {MAX_IMAGES} images and let our AI do the magic! ✨</p>
        <div
          className={`drop-area${dragActive ? ' active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            ref={inputRef}
            style={{ display: 'none' }}
            onChange={handleChange}
            max={MAX_IMAGES}
          />
          <div className="drop-content">
            <div className="cloud-icon">☁️</div>
            <div className="drop-text">
              Drag & Drop up to {MAX_IMAGES} images here<br />
              <span className="or">or click to select files</span>
            </div>
            <div className="preview-list">
              {previews.map((src, idx) => (
                <img key={idx} src={src} alt={`preview-${idx}`} className="preview-img" />
              ))}
            </div>
          </div>
        </div>
        {error && <div style={{color: '#fc5c7d', marginTop: 10, fontWeight: 600}}>{error}</div>}
        <button className="upload-btn2" onClick={handleUpload} disabled={images.length === 0 || images.length > MAX_IMAGES || loading}>
          Upload Images
        </button>
        {loading && <div className="toast">Generating summary, please wait...</div>}
        {summary && (
          <div className="summary-card">
            <h2>AI Productivity Summary</h2>
            <pre style={{whiteSpace: 'pre-wrap', textAlign: 'left'}}>{summary}</pre>
            {typeof summary === 'string' && summary.match(/SCORE: (\d{1,2})\/10/) && (
              <div className="score-box">
                <span>Productivity Score: </span>
                <b style={{color: '#6a82fb', fontSize: '1.3rem'}}>
                  {summary.match(/SCORE: (\d{1,2})\/10/)[1]} / 10
                </b>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
