/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle, ArrowRight, Upload, X, Stethoscope, ShieldAlert,
  CheckCircle2, Clock, Hospital, User, RefreshCw, ChevronRight,
  LogIn, LogOut, History, Mail, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeSymptoms, fetchHistory } from './services/api';
import { login, register, logout } from './services/auth';

export default function App() {
  // --- AUTH & UI STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // --- FORM DATA STATE ---
  const [authData, setAuthData] = useState({ username: '', password: '', email: '' });
  const [symptoms, setSymptoms] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // --- STATUS & DATA STATE ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [result, setResult] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);

  // --- FETCH HISTORY LOGIC ---
  useEffect(() => {
    if (showHistory && isLoggedIn) {
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const data = await fetchHistory();
          setHistoryData(data);
        } catch (err) {
          console.error("Failed to fetch history:", err);
        } finally {
          setLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [showHistory, isLoggedIn]);

  // --- AUTH ACTIONS ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isRegistering) {
        await register(authData.username, authData.password, authData.email);
        await login(authData.username, authData.password);
      } else {
        await login(authData.username, authData.password);
      }
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setIsRegistering(false);
      setAuthData({ username: '', password: '', email: '' });
    } catch (err) {
      const msg = err.response?.data?.error || "Authentication failed. Try again.";
      setAuthError(msg);
    }
  };

  const handleLogoutAction = () => {
    logout();
    setIsLoggedIn(false);
    setShowHistory(false);
    handleReset();
  };

  // --- CORE TRIAGE ACTIONS ---
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      setError("Please describe your symptoms.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeSymptoms(imageFile, symptoms);
      setResult(data);
    } catch (err) {
      setError(err.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSymptoms('');
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setShowHistory(false);
  };

  const getUrgencyColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'red': return 'bg-red-600 border-red-700 text-white';
      case 'yellow': return 'bg-amber-500 border-amber-600 text-white';
      case 'green': return 'bg-emerald-600 border-emerald-700 text-white';
      default: return 'bg-slate-800 border-slate-900 text-white';
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] font-sans text-slate-900 selection:bg-slate-200">
      <div className="bg-red-950 text-white py-2 px-4 text-center text-[11px] font-bold uppercase tracking-widest border-b border-red-900 sticky top-0 z-50">
        Not for emergencies. Call 108 for life-threatening conditions
      </div>

      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-8 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter text-slate-900 cursor-pointer" onClick={handleReset}>
            TriageAI
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setShowHistory(false)}
              className={`text-sm font-bold pb-1 transition-all ${!showHistory ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Symptom Checker
            </button>
            {isLoggedIn && (
              <button
                onClick={() => setShowHistory(true)}
                className={`text-sm font-bold pb-1 transition-all ${showHistory ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                My History
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <button onClick={handleLogoutAction} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-5 py-2.5 rounded-2xl transition-all">
                <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <button onClick={() => { setShowLoginModal(true); setIsRegistering(false); }} className="flex items-center gap-2 text-sm font-bold bg-slate-900 text-white px-6 py-2.5 rounded-2xl hover:bg-slate-800 transition-all shadow-md">
                <LogIn size={18} /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">

          {/* --- VIEW 1: HISTORY --- */}
          {isLoggedIn && showHistory ? (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 max-w-4xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Consultation History</h2>

              {loadingHistory ? (
                <div className="flex justify-center py-20">
                  <RefreshCw className="animate-spin text-slate-400" size={32} />
                </div>
              ) : historyData.length > 0 ? (
                <div className="grid gap-4">
                  {historyData.map((item) => (
                    <div key={item.id} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${getUrgencyColor(item.urgency)}`}>
                          <History size={22} />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-slate-900">{item.specialty} Assessment</p>
                          <p className="text-sm text-slate-500 font-medium line-clamp-1 mt-1">"{item.symptoms}"</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 shrink-0 bg-slate-50 px-4 py-2 rounded-xl">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center py-24 text-slate-400 font-medium">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  You haven't saved any symptom assessments yet.
                </div>
              )}
            </motion.div>
          ) : result ? (

            /* --- VIEW 2: RESULTS DASHBOARD --- */
            <motion.div key="results" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="space-y-8 max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <button onClick={handleReset} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-widest mb-4 transition-colors"><X size={14} /> Start Over</button>
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Diagnostic Narrative</h2>
                </div>
                <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-sm ${getUrgencyColor(result.ai_analysis.urgency_level)}`}>
                  <AlertCircle size={24} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-90 mb-0.5">Urgency Level</p>
                    <p className="text-lg font-black tracking-tight">{result.ai_analysis.urgency_level} Priority</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-slate-100 space-y-8">
                {/* SPECIALTY HEADER */}
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
                    <Stethoscope className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Suggested Specialty</h3>
                    <p className="text-3xl font-black tracking-tight text-slate-900">{result.ai_analysis.suggested_specialty}</p>
                  </div>
                </div>

                {/* 1. POSSIBLE CAUSES (Grey Cards) */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Possible Causes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.ai_analysis.possible_causes.map((cause, i) => (
                      <div key={i} className="flex items-start gap-3 p-5 bg-slate-50 rounded-2xl border-none">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="font-bold text-slate-700 leading-snug">{cause}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. RECOMMENDED PRECAUTIONS (Blue Cards) */}
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Recommended Precautions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.ai_analysis?.precautions?.map((precaution, index) => (
                      <div key={index} className="flex items-start gap-3 p-5 bg-blue-50 rounded-2xl border-none">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="font-bold text-blue-900 leading-snug">{precaution}</span>
                      </div>
                    )) || (
                        <div className="flex items-start gap-3 p-5 bg-blue-50 rounded-2xl border-none">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 shrink-0" />
                          <span className="font-bold text-blue-900 leading-snug">No immediate precautions suggested.</span>
                        </div>
                      )}
                  </div>
                </div>

                {/* 3. WHEN TO GO TO THE ER (Red Cards) */}
                <div>
                  <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2 ml-1">
                    <ShieldAlert size={14} /> When to go to the ER
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.ai_analysis?.watch_out_symptoms?.map((symptom, index) => (
                      <div key={index} className="flex items-start gap-3 p-5 bg-red-50 rounded-2xl border-none">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-red-400 shrink-0" />
                        <span className="font-bold text-red-900 leading-snug">{symptom}</span>
                      </div>
                    )) || (
                        <div className="flex items-start gap-3 p-5 bg-red-50 rounded-2xl border-none">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-red-400 shrink-0" />
                          <span className="font-bold text-red-900 leading-snug">If your condition suddenly worsens, seek immediate care.</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Available Specialists</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {result.recommended_doctors.map((doc) => (
                    <div key={doc.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                            <img src={`https://picsum.photos/seed/doc${doc.id}/200/200`} alt={doc.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-lg leading-tight mb-1">{doc.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-lg inline-block">{doc.specialty}</p>
                          </div>
                        </div>
                        <div className="space-y-3 mb-8 text-sm text-slate-500 font-medium">
                          <div className="flex items-center gap-3"><Hospital size={16} className="text-slate-400" /> {doc.hospital}</div>
                          <div className="flex items-center gap-3"><Clock size={16} className="text-slate-400" /> {doc.shift_hours}</div>
                        </div>
                      </div>
                      <button className="w-full bg-slate-50 text-slate-900 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                        Book Consultation <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (

            /* --- VIEW 3: INTAKE FORM --- */
            <motion.div key="intake" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-5 space-y-8">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Clinical Triage v2.5</span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-slate-900">
                    Precision analysis for your peace of mind.
                  </h1>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="w-1.5 h-full bg-slate-900 absolute left-0 top-0"></div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed pl-2">"The most intuitive tool for understanding my symptoms before heading to the clinic."</p>
                  <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">— Verified Patient</p>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-slate-100">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Symptom Description</label>
                    <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full min-h-[160px] bg-slate-50 border-none rounded-2xl p-5 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 transition-all resize-none outline-none font-medium" placeholder="Describe exactly how you are feeling..." />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Visual Evidence (Optional)</label>
                    <div onClick={() => fileInputRef.current?.click()} className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer overflow-hidden transition-colors ${imagePreview ? 'border-none' : ''}`}>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                      {imagePreview ? (
                        <div className="absolute inset-0 w-full h-full">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm text-slate-900 hover:bg-white"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3"><Upload size={18} className="text-slate-500" /></div>
                          <p className="text-sm text-slate-600 font-bold tracking-tight">Upload an image</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {error && <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-bold flex items-center gap-3"><AlertCircle size={18} /> {error}</div>}
                  <button onClick={handleAnalyze} disabled={loading || !symptoms.trim()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <><RefreshCw className="animate-spin" size={18} /> Analyzing...</> : <>{isLoggedIn ? 'Analyze & Save to History' : 'Analyze Symptoms'} <ArrowRight size={18} /></>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- AUTH MODAL --- */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-8 lg:p-10 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors"><X size={20} /></button>
                <div className="mb-8">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{isRegistering ? 'Start your clinical journey' : 'Secure Clinical Access'}</p>
                </div>
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {isRegistering && (
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="email" placeholder="Email Address" required value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl py-4 pr-4 pl-14 outline-none focus:ring-2 focus:ring-slate-900 font-medium placeholder:text-slate-400 text-slate-900" />
                    </div>
                  )}
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Username" required value={authData.username} onChange={(e) => setAuthData({ ...authData, username: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl py-4 pr-4 pl-14 outline-none focus:ring-2 focus:ring-slate-900 font-medium placeholder:text-slate-400 text-slate-900" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" placeholder="Password" required value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl py-4 pr-4 pl-14 outline-none focus:ring-2 focus:ring-slate-900 font-medium placeholder:text-slate-400 text-slate-900" />
                  </div>
                  {authError && <div className="flex items-center gap-2 text-red-700 text-xs font-bold bg-red-50 p-3.5 rounded-xl"><AlertCircle size={16} /> {authError}</div>}
                  <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md mt-2">
                    {isRegistering ? 'Create Profile' : 'Sign In'} <ArrowRight size={18} />
                  </button>
                </form>
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    {isRegistering ? 'Already have an account?' : 'New to TriageAI?'}
                    <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(null); }} className="ml-2 text-slate-900 font-bold hover:text-slate-700">
                      {isRegistering ? 'Sign In' : 'Create Account'}
                    </button>
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200 py-10 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-black tracking-tighter text-slate-900">TriageAI</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">© 2026 TriageAI. Secure HIPAA Compliant Storage.</p>
        </div>
      </footer>
    </div>
  );
}