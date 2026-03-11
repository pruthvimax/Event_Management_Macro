import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, MapPin, Trash2, Users, Search, 
  Sun, Moon, Monitor, LogOut, LayoutDashboard, Heart,
  Mail, Lock, User as UserIcon, Shield, ArrowRight,
  AlertCircle, HelpCircle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate
} from 'react-router-dom';

// --- Types ---
interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  token: string;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  maxCapacity: number;
  currentRSVPs: number;
  image_url?: string;
  category?: string;
  participants?: string[];
  waitlist?: string[];
}

type Theme = 'light' | 'dark' | 'system';

// --- Protected Route Component ---
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const savedUser = localStorage.getItem('eventum_user');
  const user: User | null = savedUser ? JSON.parse(savedUser) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// --- Theme Management Hook ---
const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('eventum_theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    localStorage.setItem('eventum_theme', theme);
    
    console.log(`Theme changed to: ${theme} (isDark: ${isDark})`);
  }, [theme]);

  return { theme, setTheme };
};

// --- Components ---

const Header = ({ user, onLogout, theme, setTheme }: { user: User | null, onLogout: () => void, theme: Theme, setTheme: (t: Theme) => void }) => {
  const navigate = useNavigate();

  return (
    <nav className="border-b border-black/10 dark:border-white/10 px-8 py-6 flex justify-between items-center bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black">
          <Calendar size={20} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight italic">Eventum</h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-xs font-sans font-bold uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors text-black/40 dark:text-white/40"
          >
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/my-events')}
            className="text-xs font-sans font-bold uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors text-black/40 dark:text-white/40"
          >
            My Events
          </button>
        </div>

        <div className="h-6 w-px bg-black/10 dark:bg-white/10" />

        <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-full">
          {(['light', 'dark', 'system'] as Theme[]).map((t) => (
            <button 
              key={t}
              onClick={() => setTheme(t)}
              className={`p-2 rounded-full transition-all ${theme === t ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-black/40 dark:text-white/40'}`}
            >
              {t === 'light' && <Sun size={16} />}
              {t === 'dark' && <Moon size={16} />}
              {t === 'system' && <Monitor size={16} />}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-black/10 dark:bg-white/10" />

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest opacity-40">
                {user.isAdmin ? 'Administrator' : 'Member'}
              </span>
              <span className="text-sm font-sans font-bold tracking-tight">
                {user.username}
              </span>
            </div>
            
            {user.isAdmin && (
              <button 
                className="p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors" 
                onClick={() => navigate('/admin')}
                title="Admin Panel"
              >
                <LayoutDashboard size={20} />
              </button>
            )}
            
            <button 
              onClick={onLogout}
              className="p-2 text-black/40 dark:text-white/40 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const AuthPage = ({ mode, onLogin }: { mode: 'login' | 'signup', onLogin: (user: User) => void }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', isAdmin: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/signin' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (mode === 'login') {
          const userData = { ...data.user, id: data.user.id || data.id || '', token: data.token };
          localStorage.setItem('eventum_user', JSON.stringify(userData));
          onLogin(userData);
          // Role-based redirection
          if (userData.isAdmin) {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          navigate('/login');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#0A0A0A] flex items-center justify-center p-6 font-serif">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black dark:bg-white rounded-full text-white dark:text-black mb-6">
            <Calendar size={32} />
          </div>
          <h2 className="text-4xl font-bold italic mb-2 tracking-tight">
            {mode === 'login' ? 'Welcome Back' : 'Join Eventum'}
          </h2>
          <p className="text-black/50 dark:text-white/50 font-sans">
            {mode === 'login' ? 'Sign in to access your experiences' : 'Join our community of modern architects'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] rounded-[40px] p-10 shadow-2xl shadow-black/5 border border-black/5 dark:border-white/5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-sans"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-widest mb-2 opacity-40">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-black/30" size={18} />
                  <input 
                    required
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-14 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-sans text-sm dark:text-white"
                    placeholder="Architect Name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-sans font-bold uppercase tracking-widest mb-2 opacity-40">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-black/30" size={18} />
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-14 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-sans text-sm dark:text-white"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-sans font-bold uppercase tracking-widest mb-2 opacity-40">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-black/30" size={18} />
                <input 
                  required
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-14 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all font-sans text-sm dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="flex items-center gap-3 p-2">
                <input 
                  type="checkbox"
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})}
                  className="w-5 h-5 rounded border-black/10 text-[#5A5A40] focus:ring-[#5A5A40]"
                />
                <label htmlFor="isAdmin" className="text-xs font-sans font-bold uppercase tracking-widest opacity-50 cursor-pointer flex items-center gap-2 dark:text-white">
                  <Shield size={14} /> Register as Admin
                </label>
              </div>
            )}

            <motion.button 
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-sans font-bold uppercase tracking-widest text-xs hover:opacity-80 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Search size={16} />
                  </motion.div>
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5 text-center">
            <p className="text-sm font-sans opacity-50 dark:text-white">
              {mode === 'login' ? "New to Eventum? " : "Already have an account? "}
              <button 
                onClick={() => navigate(mode === 'login' ? '/signup' : '/login')}
                className="font-bold text-black dark:text-white hover:underline"
              >
                {mode === 'login' ? 'Create an account' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CountdownTimer = ({ dateString }: { dateString: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const eventDate = new Date(dateString).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = eventDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dateString]);

  if (!timeLeft) return null;

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#5A5A40] dark:text-[#8A8A60] mt-2">Event Started</div>;
  }

  return (
    <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mt-2 bg-black/5 dark:bg-white/5 inline-block px-3 py-1 rounded-full">
      Starts in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
};

const Dashboard = ({ user }: { user: User }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, categoryFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);
      const url = params.toString() ? `/api/events?${params.toString()}` : '/api/events';

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) {
        throw new Error(`Fetch events failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (id: string) => {
    setRsvpLoading(id);

    try {
      const res = await fetch(`/api/events/${id}/rsvp`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to RSVP');
      }

      if (data.status === 'waitlisted') {
        alert(data.message);
      } else if (data.qr_code) {
        setQrCodes(prev => ({ ...prev, [id]: data.qr_code }));
      }
      
      // Refresh to ensure sync with server
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setRsvpLoading(id);

    try {
      const res = await fetch(`/api/events/${id}/cancel`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to cancel RSVP');
      }
      
      setQrCodes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRsvpLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8"
      >
        <div className="max-w-xl">
          <h2 className="text-6xl font-light tracking-tight mb-4">Upcoming <span className="italic font-serif">Experiences</span></h2>
          <p className="text-black/60 dark:text-white/60 text-lg">Curated events for the modern architect. Search, discover, and RSVP to your next inspiration.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full py-4 px-6 focus:ring-2 focus:ring-[#5A5A40] outline-none shadow-sm transition-all font-sans text-sm dark:text-white sm:w-48 appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', backgroundSize: '1em' }}
          >
            <option value="">All Categories</option>
            <option value="Tech">Tech</option>
            <option value="Music">Music</option>
            <option value="Workshop">Workshop</option>
            <option value="Sports">Sports</option>
          </select>

          <div className="relative w-full sm:w-64 md:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" size={18} />
            <input 
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full py-4 pl-14 pr-6 focus:ring-2 focus:ring-[#5A5A40] outline-none shadow-sm transition-all font-sans text-sm dark:text-white"
            />
          </div>
        </div>
      </motion.header>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-black dark:border-white"
          ></motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {events.map((event, index) => {
              const participants = event.participants || [];
              const waitlist = event.waitlist || [];
              
              const isFull = participants.length >= event.maxCapacity;
              const hasRSVPd = participants.includes(user.id);
              const isWaitlisted = waitlist.includes(user.id);
              
              const isProcessing = rsvpLoading === event._id;
              
              return (
                <motion.div
                  key={event._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white dark:bg-white/5 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all border border-black/5 dark:border-white/5 flex flex-col h-full relative overflow-hidden"
                >
                  <div className="-mx-8 -mt-8 mb-6 h-48 overflow-hidden relative rounded-t-[32px]">
                    <img 
                      src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'; }}
                    />
                    {event.category && (
                      <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest shadow-sm">
                        {event.category}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#F5F5F0] dark:bg-white/10 px-4 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-widest">
                      {event.date}
                    </div>
                    {isWaitlisted && (
                       <div className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest">
                         Waitlisted (#{waitlist.indexOf(user.id) + 1})
                       </div>
                    )}
                    {isFull && !hasRSVPd && !isWaitlisted && (
                      <div className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest">
                        Event Full
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-[#5A5A40] dark:group-hover:text-[#8A8A60] transition-colors">{event.title}</h3>
                  <div className="flex items-center gap-2 text-black/50 dark:text-white/50 text-sm mb-2 font-sans">
                    <MapPin size={14} />
                    {event.location}
                  </div>
                  <CountdownTimer dateString={event.date} />
                  <p className="text-black/60 dark:text-white/60 text-sm mt-4 mb-8 flex-grow leading-relaxed italic line-clamp-3">{event.description}</p>
                  
                  <div className="flex flex-col gap-4 pt-6 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-sans font-semibold">
                        <Users size={16} className="text-[#5A5A40] dark:text-[#8A8A60]" />
                        <span>{participants.length} / {event.maxCapacity}</span>
                      </div>
                      <div className="w-24 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(participants.length / event.maxCapacity) * 100}%` }}
                          className="h-full bg-[#5A5A40] dark:bg-[#8A8A60]" 
                        />
                      </div>
                    </div>

                    {(hasRSVPd || isWaitlisted) ? (
                      <div className="space-y-4">
                        {hasRSVPd && qrCodes[event._id] && (
                          <div className="bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5 flex flex-col items-center">
                            <span className="text-[10px] font-sans font-bold uppercase tracking-widest opacity-50 mb-2">Your Entry Pass</span>
                            <img src={qrCodes[event._id]} alt="Entry QR Code" className="w-32 h-32 rounded-lg" />
                            <a href={qrCodes[event._id]} download={`event-pass-${event.title.replace(/\s+/g, '-').toLowerCase()}.png`} className="text-xs mt-3 text-blue-500 hover:underline">Download Pass</a>
                          </div>
                        )}
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          disabled={isProcessing}
                          onClick={() => handleCancel(event._id)}
                          className="w-full border border-red-200 dark:border-red-500/20 text-red-500 py-3 rounded-full text-xs font-sans font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessing ? 'Processing...' : (isWaitlisted ? 'Leave Waitlist' : 'Cancel Registration')}
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        disabled={isProcessing}
                        onClick={() => handleRSVP(event._id)}
                        className={`w-full py-3 rounded-full text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                          isFull 
                            ? 'bg-black/5 dark:bg-white/5 text-[#5A5A40] dark:text-[#8A8A60] hover:bg-black/10 dark:hover:bg-white/10' 
                            : 'bg-black dark:bg-white text-white dark:text-black hover:bg-[#5A5A40] dark:hover:bg-[#8A8A60]'
                        }`}
                      >
                        {isProcessing ? 'Processing...' : isFull ? 'Join Waitlist' : 'RSVP Now'}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const MyEvents = ({ user }: { user: User }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes] = useState<Record<string, string>>({}); // QR codes could be fetched if persistence is required in later iterations

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/my-events', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) {
        throw new Error(`Fetch my-events failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching my events:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8"
      >
        <div className="max-w-xl">
          <h2 className="text-6xl font-light tracking-tight mb-4">My <span className="italic font-serif">Events</span></h2>
          <p className="text-black/60 dark:text-white/60 text-lg">Experiences you are registered or waitlisted for.</p>
        </div>
      </motion.header>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-black dark:border-white"
          ></motion.div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-black/50 dark:text-white/50 font-sans">
          <p>You haven't RSVP'd to any events yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {events.map((event, index) => {
              const participants = event.participants || [];
              const waitlist = event.waitlist || [];
              const isWaitlisted = waitlist.includes(user.id);
              
              return (
                <motion.div
                  key={event._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white dark:bg-white/5 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all border border-black/5 dark:border-white/5 flex flex-col h-full relative overflow-hidden"
                >
                  <div className="-mx-8 -mt-8 mb-6 h-48 overflow-hidden relative rounded-t-[32px]">
                    <img 
                      src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'; }}
                    />
                    {event.category && (
                      <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest shadow-sm">
                        {event.category}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#F5F5F0] dark:bg-white/10 px-4 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-widest">
                      {event.date}
                    </div>
                    {isWaitlisted ? (
                      <div className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1">
                        Waitlisted
                      </div>
                    ) : (
                      <div className="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest flex items-center gap-1">
                        ✔ Registered
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-[#5A5A40] dark:group-hover:text-[#8A8A60] transition-colors">{event.title}</h3>
                  <div className="flex items-center gap-2 text-black/50 dark:text-white/50 text-sm mb-2 font-sans">
                    <MapPin size={14} />
                    {event.location}
                  </div>
                  <CountdownTimer dateString={event.date} />
                  <p className="text-black/60 dark:text-white/60 text-sm mt-4 mb-4 flex-grow leading-relaxed italic line-clamp-3">{event.description}</p>
                  
                  {!isWaitlisted && qrCodes[event._id] && (
                     <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex flex-col items-center">
                       <span className="text-[10px] font-sans font-bold uppercase tracking-widest opacity-50 mb-2">Your Entry Pass</span>
                       <img src={qrCodes[event._id]} alt="Entry QR Code" className="w-24 h-24 rounded-lg" />
                     </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const AdminPanel = ({ user }: { user: User }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    maxCapacity: 50,
    image_url: '',
    category: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ title: '', date: '', location: '', description: '', maxCapacity: 50, image_url: '', category: '' });
        setShowForm(false);
        fetchEvents();
      }
    } catch (err) {
      console.error('Error saving event:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    setActionLoading(id);
    try {
      console.log(`Attempting to delete event: ${id}`);
      const res = await fetch(`/api/admin/delete-event/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        console.log(`Successfully deleted event: ${id}`);
        fetchEvents();
      } else {
        console.error(`Delete event failed: ${res.status} ${res.statusText}`);
        const errorData = await res.json().catch(() => ({}));
        alert(`Delete failed: ${errorData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-between items-center mb-12"
      >
        <div>
          <h2 className="text-4xl font-bold italic mb-2">Admin Management</h2>
          <p className="text-black/50 dark:text-white/50 font-sans">Manage your curated experiences and attendee limits.</p>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full hover:opacity-80 transition-all text-xs uppercase tracking-widest font-sans font-bold flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} /> Create New Event
        </motion.button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-black dark:border-white"
          ></motion.div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-white/5 rounded-[40px] border border-black/5 dark:border-white/5 overflow-hidden shadow-sm"
        >
          <table className="w-full text-left font-sans">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest opacity-40">Event Details</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest opacity-40">Date & Location</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest opacity-40">Capacity</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest opacity-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {events.map((event) => (
                  <motion.tr 
                    key={event._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="font-bold text-lg">{event.title}</div>
                      <div className="text-sm opacity-50 line-clamp-1 italic">{event.description}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="opacity-40" /> {event.date}
                      </div>
                      <div className="flex items-center gap-2 text-sm opacity-50">
                        <MapPin size={14} className="opacity-40" /> {event.location}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold">{(event.participants || []).length} / {event.maxCapacity}</div>
                        <div className="w-20 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((event.participants || []).length / event.maxCapacity) * 100}%` }}
                            className="h-full bg-[#5A5A40]" 
                          />
                        </div>
                      </div>
                      {(event.waitlist || []).length > 0 && (
                        <div className="text-[10px] mt-2 opacity-50 uppercase tracking-widest font-bold font-sans">Waitlist: {(event.waitlist || []).length}</div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors opacity-40 hover:opacity-100"
                        >
                          <Plus size={18} className="rotate-45" />
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          disabled={actionLoading === event._id}
                          onClick={() => handleDelete(event._id)}
                          className={`p-2 rounded-full transition-colors ${actionLoading === event._id ? 'opacity-20' : 'opacity-40 hover:opacity-100 hover:bg-red-500/10 text-red-500'}`}
                        >
                          {actionLoading === event._id ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                              <Search size={18} />
                            </motion.div>
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#1A1A1A] rounded-[40px] w-full max-w-lg p-10 shadow-2xl"
            >
              <h3 className="text-3xl font-bold mb-8 italic dark:text-white">New Event</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-2 opacity-50 dark:text-white">Event Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white"
                    placeholder="e.g. Summer Solstice Gala"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-2 opacity-50 dark:text-white">Date</label>
                    <input 
                      required
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-2 opacity-50 dark:text-white">Reserve Limit</label>
                    <input 
                      required
                      type="number" 
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData({...formData, maxCapacity: parseInt(e.target.value)})}
                      className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-2 opacity-50 dark:text-white">Location</label>
                  <input 
                    required
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white"
                    placeholder="City, Venue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-2 opacity-50 dark:text-white">Image URL</label>
                  <input 
                    type="url" 
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-2 opacity-50 dark:text-white">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all dark:text-white appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', backgroundSize: '1em' }}
                  >
                    <option value="">Select a category</option>
                    <option value="Tech">Tech</option>
                    <option value="Music">Music</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-2 opacity-50 dark:text-white">Description</label>
                  <textarea 
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-[#F5F5F0] dark:bg-white/5 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all resize-none dark:text-white"
                    placeholder="Tell us about the event..."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    disabled={actionLoading === 'create'}
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-black/10 dark:border-white/10 font-sans font-bold uppercase tracking-widest text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-all dark:text-white"
                  >
                    Cancel
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={actionLoading === 'create'}
                    className="flex-1 bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-2xl font-sans font-bold uppercase tracking-widest text-xs hover:opacity-80 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'create' ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <Search size={16} />
                        </motion.div>
                        Creating...
                      </>
                    ) : 'Create Event'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Footer = () => {
  const [showDocs, setShowDocs] = useState(false);

  return (
    <footer className="bg-black text-white py-16 mt-20">
      <div className="max-w-6xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Left Section */}
          <div>
            <h4 className="text-xl font-bold italic mb-4">Eventum</h4>
            <p className="text-white/40 text-sm font-sans leading-relaxed">
              A Go-based micro project exploring high-performance event management and capacity logic. Built for the modern web.
            </p>
            <div className="mt-6 text-[10px] font-sans font-bold uppercase tracking-widest text-white/20">
              Go Micro Project 2026
            </div>
          </div>

          {/* Middle Section */}
          <div className="font-sans">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6">Resources</h5>
            <ul className="space-y-4 text-sm">
              <li>
                <button 
                  onClick={() => setShowDocs(true)}
                  className="hover:text-[#8A8A60] transition-colors flex items-center gap-2"
                >
                  <HelpCircle size={16} /> Documentation
                </button>
              </li>
              <li>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#8A8A60] transition-colors flex items-center gap-2">
                  <ExternalLink size={16} /> GitHub Repository
                </a>
              </li>
              <li>
                <a href="https://go.dev" target="_blank" rel="noreferrer" className="hover:text-[#8A8A60] transition-colors flex items-center gap-2">
                  <ExternalLink size={16} /> Go Language Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Right Section */}
          <div className="font-sans">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6">Stack</h5>
            <div className="flex flex-wrap gap-3">
              <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">Go 1.22</span>
              <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">MongoDB Atlas</span>
              <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">React 18</span>
              <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">Tailwind CSS</span>
            </div>

          </div>
        </div>

        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-sans font-bold uppercase tracking-widest text-white/20">
          <div>© 2026 Eventum. All rights reserved.</div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>

      {/* Docs Modal */}
      <AnimatePresence>
        {showDocs && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocs(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white text-black rounded-[40px] w-full max-w-2xl p-12 shadow-2xl overflow-y-auto max-h-[80vh]"
            >
              <button 
                onClick={() => setShowDocs(false)}
                className="absolute top-8 right-8 p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>

              <h3 className="text-4xl font-bold mb-8 italic">Project Documentation</h3>
              
              <div className="space-y-8 font-sans">
                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-4">How to Use</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/5 p-6 rounded-3xl">
                      <h5 className="font-bold mb-2">1. Authentication</h5>
                      <p className="text-sm text-black/60">Sign up for a new account or log in with existing credentials. Your session is secured via JWT.</p>
                    </div>
                    <div className="bg-black/5 p-6 rounded-3xl">
                      <h5 className="font-bold mb-2">2. RSVP Logic</h5>
                      <p className="text-sm text-black/60">Browse curated experiences. Click "RSVP Now" to secure your spot. Interactions are optimistic for instant feedback.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-4">Admin Controls</h4>
                  <p className="text-sm text-black/60 mb-4">Administrators have access to a dedicated management panel to oversee the ecosystem:</p>
                  <ul className="list-disc list-inside text-sm text-black/60 space-y-2">
                    <li>Create new events with specific capacity limits.</li>
                    <li>Monitor real-time attendee counts.</li>
                    <li>Delete events (this will automatically cancel all active RSVPs).</li>
                  </ul>
                </section>

                <section className="pt-8 border-t border-black/5">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#5A5A40] text-white p-3 rounded-2xl">
                      <ExternalLink size={20} />
                    </div>
                    <div>
                      <h5 className="font-bold">Technical Stack</h5>
                      <p className="text-xs text-black/40">Go 1.22 • MongoDB Atlas • React 18 • Framer Motion</p>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('eventum_user');
    return saved ? JSON.parse(saved) : null;
  });
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Remove no-transitions class after initial render
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('no-transitions');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('eventum_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F0] font-serif transition-colors duration-300">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={user ? <Navigate to={user.isAdmin ? "/admin" : "/dashboard"} /> : <AuthPage mode="login" onLogin={setUser} />} />
          <Route path="/signup" element={user ? <Navigate to={user.isAdmin ? "/admin" : "/dashboard"} /> : <AuthPage mode="signup" onLogin={setUser} />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Header user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
              <Dashboard user={user!} />
            </ProtectedRoute>
          } />

          <Route path="/my-events" element={
            <ProtectedRoute>
              <Header user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
              <MyEvents user={user!} />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Header user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
              <AdminPanel user={user!} />
            </ProtectedRoute>
          } />

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to={user ? (user.isAdmin ? "/admin" : "/dashboard") : "/login"} replace />} />
          
          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}
