"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, onSnapshot, query } from "firebase/firestore";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAnlVDILr4oESgreFDKMrqa3-tGeBtefII",
  authDomain: "clubtechevent.firebaseapp.com",
  projectId: "clubtechevent",
  storageBucket: "clubtechevent.firebasestorage.app",
  messagingSenderId: "693919717511",
  appId: "1:693919717511:web:6c0ab69a5d2486dfc98022"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. EVENT CONFIGURATION ---
const VENUE_CODE = "JAIN-TECH-2026"; 
const ADMIN_PASSWORD = "admin";

const questions = [
  {
    id: 1,
    title: "List Sum",
    text: "Which of these is the correct way to declare a list in Python?",
    options: ["x = []", "x = {}", "list x = []", "new List()"],
    correctAnswer: "x = []", 
    codingPrompt: "Write a function that returns the sum of all numbers in a list [1, 2, 3, 4, 5]. Print the result.",
    expectedOutput: "15" 
  },
  {
    id: 2,
    title: "Loop Output",
    text: "What does print('Hello') do?",
    options: ["Prints Hello", "Throws an error", "Returns None", "Opens a console"],
    correctAnswer: "Prints Hello", 
    codingPrompt: "Write a for loop that prints the word 'Hello' exactly 3 times.",
    expectedOutput: "Hello\nHello\nHello" 
  }
];

export default function EventPlatform() {
  const [view, setView] = useState("role-selection"); // role-selection, student-login, admin-login, game, admin-dashboard
  const [teamName, setTeamName] = useState("");
  const [inputVenueCode, setInputVenueCode] = useState("");
  const [inputAdminPass, setInputAdminPass] = useState("");
  
  const [round, setRound] = useState(1);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [code, setCode] = useState("# Write your Python code here...\n");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const currentQ = questions[currentQIndex];

  // LIVE LEADERBOARD SYNC
  useEffect(() => {
    const q = query(collection(db, "leaderboard"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveBoard = snapshot.docs.map(doc => ({ team: doc.id, score: doc.data().score }));
      setLeaderboard(liveBoard.sort((a, b) => b.score - a.score));
    });
    return () => unsubscribe();
  }, []);

  const handleStudentLogin = () => {
    if (!teamName || inputVenueCode !== VENUE_CODE) return alert("Check Team Name or Venue Code!");
    setView("game");
    setDoc(doc(db, "leaderboard", teamName), { score: 0 }, { merge: true });
  };

  const handleAdminLogin = () => {
    if (inputAdminPass === ADMIN_PASSWORD) {
      setView("admin-dashboard");
    } else {
      alert("Wrong Admin Password");
    }
  };

  const updateScore = async (newVal: number) => {
    setScore(newVal);
    if (teamName) await setDoc(doc(db, "leaderboard", teamName), { score: newVal }, { merge: true });
  };

  const runCode = async () => {
    setIsRunning(true); setOutput("Running...");
    try {
      if (!(window as any).Sk) {
        const load = (src: string) => new Promise(res => { 
            const s = document.createElement("script"); s.src = src; s.onload = res; document.head.appendChild(s); 
        });
        await load("https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js");
        await load("https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js");
      }
      const Sk = (window as any).Sk;
      let out = "";
      Sk.configure({ output: (t: string) => out += t, read: (x: string) => Sk.builtinFiles["files"][x] });
      await Sk.misceval.asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, code, true));
      const clean = out.trim();
      if (clean === currentQ.expectedOutput) {
        if (!isSolved) { updateScore(score + 1); setIsSolved(true); }
        setOutput(out + "\n✅ CORRECT!");
      } else { setOutput(out + "\n❌ INCORRECT."); }
    } catch (e: any) { setOutput(e.toString()); }
    setIsRunning(false);
  };

  // --- RENDERING LOGIC ---

  if (view === "admin-dashboard") return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl font-black text-red-500 italic uppercase">Live Leaderboard</h1>
          <button onClick={() => setView("role-selection")} className="bg-slate-700 px-6 py-2 rounded-xl font-bold">Logout</button>
        </div>
        <div className="bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-slate-700 text-slate-400">
              <tr><th className="p-6">RANK</th><th className="p-6">TEAM</th><th className="p-6 text-right">SCORE</th></tr>
            </thead>
            <tbody>
              {leaderboard.map((t, i) => (
                <tr key={i} className="border-b border-slate-700 hover:bg-slate-750 transition-colors">
                  <td className="p-6 font-black text-slate-500">#{i+1}</td>
                  <td className="p-6 font-bold text-xl">{t.team}</td>
                  <td className="p-6 text-right text-green-400 font-black text-3xl">{t.score} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (view === "role-selection") return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <h1 className="text-6xl font-black mb-12 text-blue-500 tracking-tighter italic">CLUB TECH EVENT</h1>
      <div className="flex gap-6">
        <button onClick={() => setView("student-login")} className="bg-blue-600 px-10 py-6 rounded-3xl font-bold text-2xl hover:scale-105 transition shadow-lg">PARTICIPANT</button>
        <button onClick={() => setView("admin-login")} className="bg-slate-700 px-10 py-6 rounded-3xl font-bold text-2xl hover:scale-105 transition shadow-lg">ADMIN</button>
      </div>
    </div>
  );

  if (view === "student-login") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
      <div className="bg-slate-800 p-10 rounded-3xl w-full max-w-md shadow-2xl border border-slate-700">
        <h2 className="text-3xl font-bold mb-8 text-center text-blue-400">Join Competition</h2>
        <input placeholder="Team Name" className="w-full p-4 bg-slate-700 rounded-2xl mb-4 text-xl border border-slate-600 focus:border-blue-500 outline-none" onChange={e => setTeamName(e.target.value)} />
        <input placeholder="Venue Code" className="w-full p-4 bg-slate-700 rounded-2xl mb-8 text-xl border border-slate-600 focus:border-blue-500 outline-none" onChange={e => setInputVenueCode(e.target.value)} />
        <button onClick={handleStudentLogin} className="w-full bg-green-600 p-5 rounded-2xl font-black text-2xl mb-4 hover:bg-green-500 transition shadow-xl">START GAME</button>
        <button onClick={() => setView("role-selection")} className="w-full text-slate-500 font-bold">← BACK</button>
      </div>
    </div>
  );

  if (view === "admin-login") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
      <div className="bg-slate-800 p-10 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-700">
        <h2 className="text-3xl font-bold mb-8 text-center text-red-500">Admin Login</h2>
        <input type="password" placeholder="Password" className="w-full p-4 bg-slate-700 rounded-2xl mb-8 text-xl border border-slate-600 focus:border-red-500 outline-none" onChange={e => setInputAdminPass(e.target.value)} />
        <button onClick={handleAdminLogin} className="w-full bg-red-600 p-5 rounded-2xl font-black text-2xl mb-4 hover:bg-red-500 transition shadow-xl">VIEW BOARD</button>
        <button onClick={() => setView("role-selection")} className="w-full text-slate-500 font-bold">← BACK</button>
      </div>
    </div>
  );

  // --- GAME VIEW ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-6">
            <h2 className="text-2xl font-black text-blue-400 tracking-widest uppercase">{teamName || "GUEST"}</h2>
            <div className="text-2xl font-bold">ROUND {round} | SCORE: <span className="text-green-500 font-black px-6 py-2 bg-slate-800 rounded-2xl border border-slate-700 ml-2">{score}</span></div>
        </header>
        {round === 1 ? (
          <div className="bg-slate-800 p-12 rounded-[40px] text-center shadow-2xl border border-slate-700">
            <p className="text-red-500 font-black mb-4 tracking-tighter text-lg underline italic uppercase">Warning: Pick the WRONG answer!</p>
            <h3 className="text-4xl mb-12 font-medium leading-tight">{currentQ.text}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {currentQ.options.map((o, i) => <button key={i} onClick={() => { if(o !== currentQ.correctAnswer) updateScore(score+1); if(currentQIndex+1 < questions.length) setCurrentQIndex(currentQIndex+1); else { setRound(2); setCurrentQIndex(0); } }} className="bg-slate-700 p-10 rounded-3xl text-2xl font-bold hover:bg-blue-600 transition active:scale-95 shadow-lg border border-slate-600">{o}</button>)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-slate-800 p-10 rounded-[40px] border border-slate-700 shadow-2xl">
              <h3 className="text-3xl font-black text-yellow-500 mb-6">{currentQ.title}</h3>
              <p className="text-xl text-slate-300 mb-10 leading-relaxed font-light italic">"{currentQ.codingPrompt}"</p>
              <button onClick={() => { if(currentQIndex+1 < questions.length) { setCurrentQIndex(currentQIndex+1); setCode("# Python..."); setOutput(""); setIsSolved(false); } else alert("Finished!"); }} className="w-full bg-slate-700 p-6 rounded-3xl font-bold text-slate-400 hover:text-white transition border border-slate-600">NEXT CHALLENGE →</button>
            </div>
            <div className="flex flex-col gap-6">
              <div className="h-[400px] border-4 border-slate-700 rounded-[40px] overflow-hidden shadow-2xl">
                <Editor height="100%" defaultLanguage="python" theme="vs-dark" value={code} onChange={v => setCode(v || "")} />
              </div>
              <button onClick={runCode} className="bg-green-600 p-6 rounded-3xl font-black text-3xl hover:bg-green-500 hover:shadow-[0_0_30px_rgba(22,163,74,0.3)] transition active:scale-95">RUN CODE</button>
              <div className="bg-black p-8 rounded-[40px] h-48 font-mono text-green-400 overflow-y-auto border-2 border-slate-700 shadow-inner text-xl">{output || "Waiting for print()..."}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}