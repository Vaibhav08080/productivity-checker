import { useState, useRef } from 'react';
import SummaryPage from './SummaryPage';
import './App.css';

const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_REF 
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ;
const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET ;

function App() {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeePfp, setEmployeePfp] = useState(null);
  const [employeePfpUrl, setEmployeePfpUrl] = useState('');
  const [date, setDate] = useState('');
  const [showSummaryPage, setShowSummaryPage] = useState(false);
  const inputRef = useRef();
  const pfpInputRef = useRef();

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
    if (e.type === 'dragenter' || e.type === 'dragleave' || e.type === 'dragover') setDragActive(e.type !== 'dragleave');
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

  // Upload profile picture to Supabase Storage
  const uploadPfpToSupabase = async file => {
    const SUPABASE_UPLOAD_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/${BUCKET}/` + encodeURIComponent(Date.now() + '_' + file.name);
    const res = await fetch(SUPABASE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'x-upsert': 'true', // ensure upsert for idempotency
        'Content-Type': file.type // set correct content type
      },
      body: file
    });
    if (res.ok) {
      // Construct public URL for the uploaded file
      return `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${BUCKET}/` + encodeURIComponent(Date.now() + '_' + file.name);
    } else {
      throw new Error('Failed to upload profile picture');
    }
  };

  const handlePfpChange = async e => {
    if (e.target.files && e.target.files.length > 0) {
      setEmployeePfp(e.target.files[0]);
      try {
        setLoading(true);
        // Actually upload to Supabase and get the public URL
        const url = await uploadPfpToSupabase(e.target.files[0]);
        setEmployeePfpUrl(url);
        setLoading(false);
      } catch (err) {
        setError('Profile picture upload failed.');
        setLoading(false);
      }
    }
  };

  const handleUpload = async () => {
    if (!employeeName || !employeePfp || !date) {
      setError('Please enter employee name, profile picture, and date.');
      return;
    }
    if (images.length === 0 || images.length > MAX_IMAGES) {
      setError(`Please select between 1 and ${MAX_IMAGES} images.`);
      return;
    }
    setError('');
    setLoading(true);
    setSummary('');
    let pfpUrl = employeePfpUrl;
    if (!pfpUrl) {
      try {
        pfpUrl = await uploadPfpToSupabase(employeePfp);
        setEmployeePfpUrl(pfpUrl);
      } catch (err) {
        setError('Profile picture upload failed.');
        setLoading(false);
        return;
      }
    }
    const formData = new FormData();
    images.forEach((img, idx) => formData.append('images', img));
    formData.append('employee_name', employeeName);
    formData.append('employee_pfp', pfpUrl);
    formData.append('date', date);
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

  if (showSummaryPage) {
    return <SummaryPage onBack={() => setShowSummaryPage(false)} />;
  }

  return (
    <div className="main-bg">
      <header className="header">
        <div className="logo">📄 Sommaire</div>
        <nav>
          <a href="#">Pricing</a>
          <a href="#" onClick={e => {e.preventDefault(); setShowSummaryPage(true);}} style={{color: '#fc5c7d', fontWeight: 700}}>Your Summaries</a>
        </nav>
        <div className="upload-nav">Upload Images</div>
      </header>
      <div className="center-content">
        <div className="ai-label">✨ AI-Powered Content Creation</div>
        <h1 className="main-title">
          Start Uploading <span className="highlight">Your Images</span>
        </h1>
        <p className="subtitle">Upload up to {MAX_IMAGES} images and let our AI do the magic! ✨</p>
        <div className="employee-form">
          <h2>Employee Details</h2>
          <input
            type="text"
            placeholder="Employee Name"
            value={employeeName}
            onChange={e => setEmployeeName(e.target.value)}
            className="employee-input"
          />
          <input
            type="file"
            accept="image/*"
            ref={pfpInputRef}
            onChange={handlePfpChange}
            className="employee-input"
          />
          {employeePfpUrl && <img src={employeePfpUrl} alt="pfp" style={{width: 48, height: 48, borderRadius: 24, marginBottom: 10}} />}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="employee-input"
          />
        </div>
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
