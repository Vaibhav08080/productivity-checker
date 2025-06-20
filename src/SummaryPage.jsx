import { useEffect, useState } from 'react';
import './App.css';

function SummaryPage({ onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch all sessions and group by employee
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://productivity-checker-3.onrender.com/sessions');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Group by employee_name
          const grouped = {};
          data.forEach(row => {
            if (!grouped[row.employee_name]) grouped[row.employee_name] = [];
            grouped[row.employee_name].push(row);
          });
          setProfiles(Object.entries(grouped).map(([name, sessions]) => ({
            name,
            pfp: sessions[0].employee_pfp,
            sessions
          })));
        }
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const handleProfileClick = profile => {
    setSelectedProfile(profile);
    setSummaries(profile.sessions.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setDateFrom('');
    setDateTo('');
  };

  const filteredSummaries = summaries.filter(s => {
    if (dateFrom && new Date(s.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(s.date) > new Date(dateTo)) return false;
    return true;
  });

  if (loading) return <div className="toast">Loading...</div>;

  if (selectedProfile) {
    return (
      <div className="main-bg">
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 24}}>
          <button className="upload-btn2" style={{maxWidth: 180, margin: 24}} onClick={() => setSelectedProfile(null)}>Back to Profiles</button>
        </div>
        <div className="center-content" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, justifyContent: 'center'}}>
            <img 
              src={selectedProfile.pfp && selectedProfile.pfp.startsWith('http') ? selectedProfile.pfp : '/default-avatar.png'} 
              alt="pfp" 
              className="profile-avatar" 
              onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
            />
            <h2 className="profile-name" style={{margin: 0}}>{selectedProfile.name}</h2>
          </div>
          <h3 style={{marginBottom: 16, color: '#6a82fb', fontWeight: 700}}>Summaries by Date</h3>
          <div style={{display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center'}}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="employee-input" style={{maxWidth: 160}} placeholder="From" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="employee-input" style={{maxWidth: 160}} placeholder="To" />
          </div>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%'}}>
            {filteredSummaries.map((s, idx) => (
              <div key={idx} className="summary-card" style={{marginBottom: 24, width: '100%', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', float: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div style={{fontWeight: 600, color: '#6a82fb', marginBottom: 8, textAlign: 'center', width: '100%'}}>{s.date}</div>
                <pre style={{whiteSpace: 'pre-wrap', textAlign: 'center', width: '100%'}}>{s.summary}</pre>
                {s.score && (
                  <div className="score-box">
                    <span>Productivity Score: </span>
                    <b style={{color: '#6a82fb', fontSize: '1.3rem'}}>{s.score} / 10</b>
                  </div>
                )}
              </div>
            ))}
            {filteredSummaries.length === 0 && <div style={{color: '#888', marginTop: 32}}>No summaries in this date range.</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-bg">
      <div style={{display: 'flex', justifyContent: 'center', marginTop: 24}}>
        <button className="upload-btn2" style={{maxWidth: 180, margin: 24}} onClick={onBack}>Back to Home</button>
      </div>
      <div className="center-content">
        <h2 style={{marginBottom: 24, color: '#6a82fb', fontWeight: 700}}>Employee Profiles</h2>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center'}}>
          {profiles.map((profile, idx) => (
            <div key={idx} className="summary-card" style={{alignItems: 'center', cursor: 'pointer', maxWidth: 220, textAlign: 'center', padding: 24, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center'}} onClick={() => handleProfileClick(profile)}>
              <img 
                src={profile.pfp && profile.pfp.startsWith('http') ? profile.pfp : '/default-avatar.png'} 
                alt="pfp" 
                className="profile-avatar" 
                onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
              />
              <div className="profile-name">{profile.name}</div>
              <div className="profile-count">{profile.sessions.length} summaries</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SummaryPage;
