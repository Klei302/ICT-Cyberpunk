/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Search, 
  MapPin, 
  Building2, 
  Users, 
  Calendar, 
  Compass, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Info,
  Loader2,
  Globe,
  ChevronRight,
  Navigation,
  MessageSquare,
  Send,
  X,
  Map as MapIcon,
  Heart,
  Music,
  Utensils,
  Facebook,
  Twitter,
  Instagram,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Types ---
interface Review {
  id: string;
  rating: number;
  comment: string;
  timestamp: Date;
}

interface CityData {
  name: string;
  tagline: string;
  about: string;
  stats: {
     label: string;
     value: string;
  }[];
  attractions: {
    title: string;
    description: string;
    type: string;
    location: { lat: number; lng: number };
  }[];
  history: string;
  events: {
    name: string;
    date: string;
    category: string;
  }[];
}

// --- AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CITY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    tagline: { type: Type.STRING, description: "A catchy 3-5 word slogan for the city" },
    about: { type: Type.STRING, description: "A brief, poetic intro to the city" },
    stats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING }
        }
      }
    },
    attractions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING, description: "Museum, Park, Landmark, etc." },
          location: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          }
        },
        required: ["title", "description", "type", "location"]
      }
    },
    history: { type: Type.STRING, description: "A few key historical points in markdown list format" },
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          date: { type: Type.STRING },
          category: { type: Type.STRING }
        }
      }
    }
  },
  required: ["name", "tagline", "about", "stats", "attractions", "history", "events"]
};

// --- Map Helpers ---
// Fix Leaflet default icon issues
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker for "Skinny Outline" feel
const createCustomIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 32px; 
    height: 32px; 
    background-color: ${color}; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

// --- Components ---

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Përshëndetje! I am your Korçë guide. Ask me anything about the city!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: "You are an extremely concise local guide from Korçë. Answer only what is asked. Do not add fluff or extra information. Be professional and direct."
        }
      });
      setMessages(prev => [...prev, { role: 'bot', text: response.text || "No data." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Ouch, my serenade was interrupted! Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-red-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-bold text-sm">Korçë Guide</span>
              </div>
              <button onClick={() => setIsOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            
            <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto space-y-4 text-sm scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    m.role === 'user' ? 'bg-red-700 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none animate-pulse text-gray-400">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                placeholder="Ask about Korçë..."
                className="flex-grow bg-gray-50 rounded-full px-4 py-2 outline-none text-sm focus:ring-1 ring-red-200"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="p-2 bg-red-700 text-white rounded-full hover:bg-black transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-red-700 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
}

export default function App() {
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [view, setView] = useState<'home' | 'details'>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [identity, setIdentity] = useState({ nickname: 'The Little Paris', status: 'Vibrant' });
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [reviewingAttraction, setReviewingAttraction] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState(5);
  const [draftComment, setDraftComment] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    exploreCity("Korçë, Albania");

    // Randomize identity on refresh
    const nicknames = ['The Balkan Muse', 'The City of Serenades', 'The Intellectual Hearth', 'The Cradle of Culture'];
    const statuses = ['Vibrant', 'Resilient', 'Poetic', 'Timeless', 'Awake'];
    setIdentity({
      nickname: nicknames[Math.floor(Math.random() * nicknames.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)]
    });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const addReview = (attractionTitle: string, rating: number, comment: string) => {
    const newReview = { 
      id: Math.random().toString(36).substring(2, 11), 
      rating, 
      comment, 
      timestamp: new Date() 
    };
    setReviews(prev => ({
      ...prev,
      [attractionTitle]: [newReview, ...(prev[attractionTitle] || [])]
    }));
    setReviewingAttraction(null);
    setDraftComment('');
  };

  const exploreCity = async (cityName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a comprehensive city guide for ${cityName}. 
        MANDATORY ATTRACTIONS to include: 
        1. Park Rinia (The large central park oasis)
        2. Pedonalja (Bulevardi Shën Gjergji - the historic pedestrian heart)
        3. Birra Korça (The first beer factory in Albania, established 1928, with its famous garden)
        4. Mësonjëtoria (The First Albanian School, a national monument)
        5. Resurrection of Christ Cathedral (The largest Orthodox church in Albania)
        6. The Old Bazaar (Pazari i Vjetër - beautifully restored Ottoman market)
        7. National Museum of Medieval Art (Home to thousands of icons)
        
        Make sure to provide accurate latitude and longitude for each attraction in Korçë.
        
        Make the history timeline significantly longer and more detailed, covering the Illyrian roots, the medieval period under Muzaka, the Ottoman era, the French Republic of Korca (1916-1920), and its modern role as the intellectual capital.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: CITY_SCHEMA,
          systemInstruction: "You are an expert historian and travel guide specifically for Albania. You provide deep, accurate, and poetic insights into Korçë's heritage."
        }
      });

      const data = JSON.parse(response.text || '{}');
      setCityData(data);
    } catch (err) {
      console.error(err);
      setError("Dolemi! We encountered an issue exploring Korçë. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  const shareAttraction = (platform: string, title: string) => {
    const url = window.location.href;
    const text = `Check out ${title} in Korçë, Albania!`;
    const shareLinks: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
      instagram: `https://www.instagram.com/cyberpunk8666/`
    };
    
    window.open(shareLinks[platform], '_blank');
  };

  const openInMaps = (title: string, lat?: number, lng?: number) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      const query = encodeURIComponent(`${title}, Korçë, Albania`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-red-200 ${
      isDarkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#FDFCFB] text-[#1A1A1A]'
    }`}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
        scrolled || view === 'details' 
          ? (isDarkMode ? 'bg-black/80 backdrop-blur-md border-white/10 py-3' : 'bg-white/80 backdrop-blur-md border-gray-100 py-3')
          : 'bg-transparent border-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-10 h-10 bg-red-700 rounded-xl flex items-center justify-center text-white">
              <Navigation className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight font-display">Korçë Pulse</span>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8 text-sm font-medium">
            <div className="hidden md:flex gap-8 opacity-70">
              <button key="portal" onClick={() => setView('home')} className={`hover:opacity-100 transition-opacity ${view === 'home' ? 'opacity-100 text-red-700' : ''}`}>Portal</button>
              <button key="deepdive" onClick={() => setView('details')} className={`hover:opacity-100 transition-opacity ${view === 'details' ? 'opacity-100 text-red-700' : ''}`}>Deep Dive</button>
            </div>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <a 
                href="https://www.instagram.com/cyberpunk8666/" 
                target="_blank" 
                rel="noreferrer"
                className={`hidden sm:flex items-center gap-2 px-4 py-2 border rounded-full transition-all text-[10px] md:text-xs tracking-wider uppercase font-bold ${
                  isDarkMode ? 'border-white/20 hover:bg-white/10' : 'border-black/10 hover:bg-black/5'
                }`}
              >
                <Instagram className="w-3 h-3" />
                Follow
              </a>
              <button 
                onClick={() => openInMaps("Korçë")}
                className="px-4 md:px-5 py-2 bg-red-700 text-white rounded-full hover:bg-black transition-all text-[10px] md:text-xs tracking-wider uppercase font-bold"
              >
                Visit
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <AnimatePresence mode="wait">
          {isLoading ? (
             <motion.section 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen flex flex-col items-center justify-center space-y-6"
            >
              <Loader2 className="w-12 h-12 animate-spin text-red-700" />
              <p className="font-bold tracking-widest uppercase text-xs text-gray-400">Arriving in the Little Paris of Albania...</p>
            </motion.section>
          ) : view === 'home' ? (
            <motion.div 
              key="city-content"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-24"
            >
              {/* Header Section */}
              <section className="grid lg:grid-cols-[1fr_400px] gap-12 items-start">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-red-700 font-bold uppercase tracking-widest text-xs">
                    <MapPin className="w-4 h-4" />
                    {identity.nickname}
                  </div>
                  <h2 className="text-7xl md:text-9xl font-bold tracking-tighter leading-[0.8] mb-2 font-display">
                    Korçë
                  </h2>
                  <p className={`text-3xl italic font-light border-l-4 border-red-100 pl-6 py-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {cityData?.tagline}
                  </p>
                  <p className={`text-xl leading-relaxed max-w-2xl font-light ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {cityData?.about}
                  </p>
                  <button 
                    onClick={() => setView('details')}
                    className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-colors group ${
                      isDarkMode ? 'bg-white text-black hover:bg-red-700 hover:text-white' : 'bg-black text-white hover:bg-red-700'
                    }`}
                  >
                    Deep Dive <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {cityData?.stats.map((stat, i) => (
                    <div key={i} className={`p-6 border rounded-3xl space-y-1 ${
                      isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'
                    }`}>
                      <span className="text-xs uppercase tracking-wider font-bold text-gray-500">{stat.label}</span>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  ))}
                  <div className="col-span-2 p-6 bg-red-700 text-white rounded-3xl flex justify-between items-end">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold opacity-60">Status</span>
                      <p className="text-xl font-bold">{identity.status}</p>
                    </div>
                    <Globe className="w-8 h-8 opacity-40 shrink-0" />
                  </div>
                </div>
              </section>

              {/* Interactive Map */}
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <MapIcon className="w-5 h-5 text-red-700" />
                  <h3 className="text-3xl font-bold tracking-tight">Interactive Exploration</h3>
                </div>
                <div className="w-full h-[500px] rounded-[3rem] overflow-hidden border border-gray-200 shadow-xl bg-white z-10 relative">
                  <MapContainer 
                    center={[40.6159, 20.7778]} 
                    zoom={15} 
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {cityData?.attractions.map((attr, i) => {
                      if (!attr.location?.lat || !attr.location?.lng) return null;
                      return (
                        <Marker 
                          key={i} 
                          position={[attr.location.lat, attr.location.lng]}
                          icon={createCustomIcon('#b91c1c')}
                        >
                          <Popup>
                            <div className="p-2 space-y-2">
                              <h4 className="font-bold text-red-700">{attr.title}</h4>
                              <p className="text-xs text-gray-600">{attr.description}</p>
                              <button 
                                onClick={() => openInMaps(attr.title, attr.location?.lat, attr.location?.lng)}
                                className="text-[10px] font-bold uppercase text-blue-600 underline"
                              >
                                Google Maps Route
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                    <MapRecenter center={[40.6159, 20.7778]} />
                  </MapContainer>
                </div>
              </section>

              {/* Highlights Bento */}
              <section id="highlights" className="space-y-12">
                <div className="flex items-end justify-between border-b border-gray-100 pb-8">
                  <h3 className="text-4xl font-bold tracking-tight">Tourist Points</h3>
                  <div className="flex gap-2">
                    <button className="p-2 border border-gray-200 rounded-full hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {cityData?.attractions.map((attr, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ y: -10 }}
                      className={`group p-8 border rounded-[2.5rem] flex flex-col h-full shadow-sm hover:shadow-xl transition-all ${
                        isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className={`mb-8 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        isDarkMode ? 'bg-white/10 text-white group-hover:bg-red-700' : 'bg-gray-50 group-hover:bg-red-700 group-hover:text-white'
                      }`}>
                        {attr.type.includes('Park') ? <Compass className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-red-700 mb-2">{attr.type}</span>
                      <h4 className="text-xl font-bold mb-4 line-clamp-2">{attr.title}</h4>
                      <p className={`leading-relaxed text-sm flex-grow ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {attr.description}
                      </p>
                      
                      {/* Review Section */}
                      <div className={`mt-6 pt-6 border-t space-y-3 ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-50">
                          <span>User Rating</span>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(r => (
                              <button 
                                key={r}
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setReviewingAttraction(attr.title);
                                  setDraftRating(r);
                                }}
                                className="hover:scale-125 transition-transform"
                              >
                                <Heart className={`w-2.5 h-2.5 ${
                                  (reviews[attr.title]?.reduce((a,b) => a+b.rating,0)/(reviews[attr.title]?.length||1)) >= r 
                                  ? 'fill-red-700 text-red-700' : (isDarkMode ? 'text-gray-600' : 'text-gray-400')
                                }`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <AnimatePresence>
                          {reviewingAttraction === attr.title ? (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-3 p-3 bg-red-50/50 rounded-xl mt-2">
                                <p className="text-[10px] font-bold text-red-700 uppercase">Adding Review ({draftRating}/5)</p>
                                <textarea 
                                  autoFocus
                                  value={draftComment}
                                  onChange={(e) => setDraftComment(e.target.value)}
                                  placeholder="Tell us what you liked..."
                                  className={`w-full text-xs p-2 rounded-lg border outline-none h-16 resize-none ${
                                    isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-red-100'
                                  }`}
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); addReview(attr.title, draftRating, draftComment || "Excellent!"); }}
                                    className="flex-grow py-1.5 bg-red-700 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-black transition-colors"
                                  >
                                    Submit
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setReviewingAttraction(null); }}
                                    className="px-3 py-1.5 bg-gray-200 text-gray-600 text-[10px] font-bold uppercase rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-grow scrollbar-hide overflow-hidden">
                                {reviews[attr.title]?.length ? (
                                  <p className={`text-[10px] italic line-clamp-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    "{reviews[attr.title][0].comment}"
                                  </p>
                                ) : (
                                  <p className={`text-[10px] italic ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>Be the first to review.</p>
                                )}
                              </div>
                              
                              {/* Share Buttons */}
                              <div className="flex gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); shareAttraction('facebook', attr.title); }} className="hover:text-blue-600"><Facebook className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); shareAttraction('twitter', attr.title); }} className="hover:text-sky-500"><Twitter className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); shareAttraction('instagram', attr.title); }} className="hover:text-pink-600"><Instagram className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); shareAttraction('whatsapp', attr.title); }} className="hover:text-green-500"><Send className="w-3 h-3 rotate-[-30deg]" /></button>
                              </div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      <button 
                        onClick={() => openInMaps(attr.title, attr.location?.lat, attr.location?.lng)}
                        className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest group-hover:gap-3 transition-all text-red-700 w-fit"
                      >
                        Route Info <ArrowRight className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* History & News Layout */}
              <section id="history" className="grid lg:grid-cols-[1fr_400px] gap-20">
                <div className="space-y-10">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-red-700" />
                    <h3 className="text-3xl font-bold tracking-tight">Timeline & Legacy</h3>
                  </div>
                  <div className={`prose prose-sm prose-gray max-w-none p-10 rounded-[3rem] border shadow-inner ${
                    isDarkMode ? 'bg-white/5 border-white/10 prose-invert' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <ReactMarkdown>{cityData?.history || ''}</ReactMarkdown>
                  </div>
                </div>

                <div id="events" className="space-y-8">
                   <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Upcoming</h3>
                    <Calendar className="w-5 h-5 text-gray-300" />
                  </div>
                  
                  <div className="space-y-4">
                    {cityData?.events.map((event, i) => (
                      <div key={i} className={`p-5 border rounded-2xl flex items-center gap-4 cursor-pointer transition-colors group ${
                        isDarkMode ? 'bg-white/5 border-white/10 hover:border-red-500/50' : 'bg-white border-gray-100 hover:border-red-100'
                      }`}>
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex flex-col items-center justify-center text-red-700 group-hover:bg-red-700 group-hover:text-white transition-all">
                          <span className="text-xs font-black uppercase">{event.date.split(' ')[0]}</span>
                          <span className="text-sm font-bold leading-none">{event.date.split(' ')[1]}</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm">{event.name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{event.category}</p>
                        </div>
                      </div>
                    ))}
                    <button 
                       onClick={() => openInMaps("Cultural events in Korce")}
                       className="w-full py-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-700 border-t border-dashed border-gray-200 mt-4 transition-colors"
                    >
                      Explore All Events
                    </button>
                  </div>
                </div>
              </section>

              {/* Footer CTA */}
              <section className="py-20 bg-red-900 rounded-[4rem] text-white flex flex-col items-center text-center px-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
                <div className="relative z-10 space-y-6">
                  <h3 className="text-5xl md:text-6xl font-bold tracking-tighter uppercase font-display">Korçë awaits you.</h3>
                  <p className="opacity-50 max-w-md mx-auto">Experience the serenades, the culture, and the warmth of Albania's intellectual capital.</p>
                  <div className="flex gap-4 justify-center pt-4">
                    <button 
                      onClick={() => openInMaps("Hotels in Korce")}
                      className="px-8 py-4 bg-white text-red-900 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all"
                    >
                      Plan Your Trip
                    </button>
                    <button 
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="px-8 py-4 border border-white/20 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all font-display"
                    >
                      Top of Page
                    </button>
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="details-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="pt-32 pb-20 px-6 max-w-5xl mx-auto space-y-16"
            >
              <button 
                onClick={() => setView('home')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-700 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Portal
              </button>
              
              <div className="space-y-12">
                <div className="space-y-4">
                  <h2 className="text-6xl font-bold tracking-tight font-display">The Cultural Dossier</h2>
                  <p className="text-2xl font-light italic text-red-700">"Korçë is not just a city; it is a melody played on the strings of history."</p>
                </div>

                <div className="grid md:grid-cols-[2fr_1fr] gap-16">
                  <div className={`prose prose-lg prose-red max-w-none leading-relaxed space-y-12 ${
                    isDarkMode ? 'prose-invert text-gray-400' : 'text-gray-600'
                  }`}>
                    <section className="space-y-6">
                      <h3 className={`text-3xl font-bold font-display ${isDarkMode ? 'text-white' : 'text-black'}`}>Historical Tapestry & The Intellectual Hearth</h3>
                      <p>
                        Known as the **"Little Paris of Albania"**, Korçë stands as the intellectual and cultural beacon of the Balkans. Its history is 
                        deeply intertwined with the birth of Albanian education and the revitalization of national identity during the Rilindja movement. 
                        Unlike many other cities, Korçë maintained a unique cosmopolitan atmosphere through its connections with the French Republic 
                        of Korçë and its thriving merchant class.
                      </p>
                      <p>
                        The city's evolution from a small medieval settlement into a center of commerce and diplomacy is a testament to its 
                        resilience. During the 19th and early 20th centuries, Korçë became the headquarters of the Albanian national awakening. 
                        It was here that the first Albanian school for boys (Mësonjëtoria) was founded in 1887, followed closely by the first 
                        school for girls. This commitment to literacy and culture earned the city its reputation as the "Cradle of Culture."
                      </p>
                      <p>
                        The city's architecture reflects this rich heritage, with neoclassical villas standing alongside traditional stone houses. 
                        The Old Bazaar, once a bustling hub of Ottoman trade, has been meticulously restored to offer a glimpse into the city's 
                        mercantile past. It remains a place where the scent of freshly roasted coffee mixes with the smell of old wood and history.
                      </p>
                    </section>

                    <section className="space-y-6">
                      <h3 className={`text-3xl font-bold font-display ${isDarkMode ? 'text-white' : 'text-black'}`}>Gastronomy, Brewing, & The Serenade Tradition</h3>
                      <p>
                        Korçë is a paradise for food lovers. The legendary **Kernacka** (small grilled sausages) are best enjoyed with a cold, 
                        locally brewed **Birra Korça**. The brewery, established in 1928, was the first of its kind in Albania and continues to be 
                        a point of immense local pride. Its beer garden is a pilgrimage site for anyone visiting the city, offering a cool 
                        refuge under the shade of ancient trees.
                      </p>
                      <p>
                        The culinary landscape is further enriched by tradition. 'Lakror në saç', a delicate savory pie baked under a metal 
                        dome covered with hot ashes, is a ritualistic dish often prepared for honored guests. The city's local markets 
                        are filled with the 'gliko'—preserved fruits that are a signature sweet treat of the region.
                      </p>
                      <p>
                        As night falls, the cobblestone streets of the 'Mangalem' and 'Kala' equivalent districts in Korçë (the historic quarters) 
                        vibrate with the sound of **Serenades**. These romantic ballads, accompanied by guitars and mandolins, originated from 
                        the influences of the city's returning students from Europe. They are songs of love, longing, and the beauty of 
                        the city itself.
                      </p>
                    </section>

                    <section className="space-y-6">
                      <h3 className={`text-3xl font-bold font-display ${isDarkMode ? 'text-white' : 'text-black'}`}>The Modern Renaissance & Artistic Legacy</h3>
                      <p>
                        Today, the city thrives on its unique blend of neoclassical architecture and vibrant modern life. Whether it is the 
                        fame of the **Karnavalet e Korçës** (the Carnival of Korçë) or the quiet majesty of **Parku Rinia**, the city offers a sanctuary for the 
                        curious mind and the adventurous heart. The Carnival is the largest in Albania, a riot of color and satire that 
                        dates back decades.
                      </p>
                      <p>
                        The development of museums like the National Museum of Medieval Art, which houses one of the world's most significant 
                        collections of Byzantine icons (over 7,000 pieces), ensures that Korçë remains a global destination for art historians 
                        and enthusiasts alike. The icons, many by the master Onufri, represent a high point of Eastern Orthodox religious art.
                      </p>
                      <p>
                        Contemporary Korçë is also a city of festivals. From the Beer Fest in the summer to the International Festival of 
                        Contemporary Dance, there is a constant pulse of creative energy. It is a city that respects its ghosts while 
                        enthusiastically building its future.
                      </p>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <div className={`p-8 rounded-4xl space-y-4 ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-red-50'}`}>
                      <h4 className={`text-xl font-bold uppercase tracking-widest text-xs font-display ${isDarkMode ? 'text-red-400' : 'text-red-900'}`}>Serenade Soul</h4>
                      <p className="text-sm opacity-80 leading-relaxed">The soul of the city, these romantic ballads define the evening air of Korçë's cobblestone streets. It's a living tradition passed from father to son, often heard in the quiet courtyards of the historic villas.</p>
                      <div className="h-1 w-12 bg-red-700" />
                    </div>
                    <div className={`p-8 rounded-4xl space-y-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                      <h4 className="text-xl font-bold uppercase tracking-widest text-xs">Pioneer Spirit</h4>
                      <p className="text-sm opacity-60 leading-relaxed">From the first brewery to the first modern bank, Korçë has always led Albania into the future through education and trade. It was often the first city to adopt European fashions and technologies.</p>
                      <div className="h-1 w-12 bg-gray-300" />
                    </div>
                    <div className={`p-8 text-white rounded-4xl space-y-4 shadow-xl ${isDarkMode ? 'bg-red-900/40' : 'bg-black'}`}>
                      <h4 className="text-xl font-bold uppercase tracking-widest text-xs opacity-60">Fast Fact</h4>
                      <p className="text-lg font-bold">Korçë was home to the first female teacher in Albania, Sevasti Qiriazi, and the first printing press in the region.</p>
                      <Sparkles className="w-6 h-6 text-red-500" />
                    </div>
                    <div className={`p-8 border rounded-4xl space-y-4 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-red-100'}`}>
                      <h4 className={`text-xl font-bold uppercase tracking-widest text-xs font-display ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>City of Firsts</h4>
                      <ul className="text-sm space-y-2 opacity-70">
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-red-700 rounded-full"/> First Albanian School (1887)</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-red-700 rounded-full"/> First Brewery in Albania (1928)</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-red-700 rounded-full"/> First girls' school (1891)</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-red-700 rounded-full"/> First cinema in Albania</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <section className="py-12 border-t border-gray-100 flex justify-between items-center text-gray-400">
                <div className="flex gap-4">
                  <Globe className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Albania's Cultural Beacon</span>
                </div>
                <button 
                  onClick={() => setView('home')}
                  className="text-xs font-bold uppercase tracking-widest text-red-700 hover:tracking-[0.2em] transition-all"
                >
                  Return to Main Portal
                </button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ChatBot always present */}
      <ChatBot />

      <footer className="py-12 border-t border-gray-100/10 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mb-4">
          <p>&copy; 2026 Cyberpunk</p>
          <span className="hidden md:inline">•</span>
          <a href="https://www.instagram.com/cyberpunk8666/" target="_blank" rel="noreferrer" className="hover:text-red-700 transition-colors">Follow us on Instagram</a>
          <span className="hidden md:inline">•</span>
          <p>Cultural Preservation Initiative</p>
        </div>
      </footer>
    </div>
  );
}
