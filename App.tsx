import React from 'react';
import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

// ─── FIREBASE via CDN ─────────────────────────────────────────────────────────
let _db = null;
let _doc = null;
let _onSnapshot = null;
let _setDoc = null;
let _getDoc = null;
let _fbReady = false;
let _fbListeners = [];

async function initFirebase() {
  if (_fbReady) return true;
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, doc, onSnapshot, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app = initializeApp({
      apiKey: "AIzaSyCo9B9YhftIGfG6LkJc5KX9i84gZ-gQIng",
      authDomain: "slssong.firebaseapp.com",
      projectId: "slssong",
      storageBucket: "slssong.firebasestorage.app",
      messagingSenderId: "641493111747",
      appId: "1:641493111747:web:70fbc7ddded935b345a376",
    });
    _db = getFirestore(app);
    _doc = doc; _onSnapshot = onSnapshot; _setDoc = setDoc; _getDoc = getDoc;
    _fbReady = true;
    return true;
  } catch (e) {
    console.warn("Firebase init failed:", e);
    return false;
  }
}

const EMPTY = {incomes:[],expenses:[],savings:[],withdrawals:[],recurring:[],goal:{amount:500000,name:"Семейная цель",deadline:"2026-12-31"}};
const LS_KEY = "kopilka_v9";

function useData() {
  const [data, setDataState] = useState(null);
  const [synced, setSynced] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    initFirebase().then(ok => {
      if (cancelled) return;
      if (!ok) {
        // offline fallback
        try { const r=localStorage.getItem(LS_KEY); setDataState(r?{...EMPTY,...JSON.parse(r)}:EMPTY); } catch { setDataState(EMPTY); }
        setSynced(true);
        return;
      }
      const ref = _doc(_db, "kopilka", "shared");
      unsubRef.current = _onSnapshot(ref, snap => {
        if (cancelled) return;
        setDataState(snap.exists() ? {...EMPTY,...snap.data()} : EMPTY);
        if (!snap.exists()) _setDoc(ref, EMPTY);
        setSynced(true);
      }, () => {
        try { const r=localStorage.getItem(LS_KEY); setDataState(r?{...EMPTY,...JSON.parse(r)}:EMPTY); } catch { setDataState(EMPTY); }
        setSynced(true);
      });
    });
    return () => { cancelled=true; if(unsubRef.current) unsubRef.current(); };
  }, []);

  const setData = useCallback((updater) => {
    setDataState(prev => {
      const next = typeof updater==="function" ? updater(prev||EMPTY) : updater;
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      if (_fbReady) {
        const ref = _doc(_db, "kopilka", "shared");
        _setDoc(ref, next).catch(()=>{});
      }
      return next;
    });
  }, []);

  return [data, setData, synced];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SK = "kopilka_v9";
const DEFAULT_GOAL = { amount: 500000, name: "Семейная цель", deadline: "2026-12-31" };
const RU_MO = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const P = {
  espresso:"#2C2018", driftwood:"#7A6355", linen:"#B8A898",
  amber:"#C4956A", honey:"#D4A574", cognac:"#8B5E3C",
  sage:"#7A9E7E", rosewood:"#C47A7A", sand:"#D8C5B0", oat:"#EDE5D8",
};
const CATS = [
  {id:"food",l:"Продукты",i:"🛒"},{id:"cafe",l:"Кафе",i:"🍕"},{id:"coffee",l:"Кофе",i:"☕"},
  {id:"transport",l:"Транспорт",i:"🚇"},{id:"gas",l:"Бензин",i:"⛽"},{id:"car",l:"Авто",i:"🚗"},
  {id:"health",l:"Здоровье",i:"💊"},{id:"clothes",l:"Одежда",i:"👗"},{id:"shoes",l:"Обувь",i:"👟"},
  {id:"beauty",l:"Красота",i:"💄"},{id:"rent",l:"Аренда/ЖКХ",i:"🏠"},{id:"phone",l:"Связь",i:"📱"},
  {id:"entertainment",l:"Развлечения",i:"🎮"},{id:"cinema",l:"Кино",i:"🎬"},{id:"travel",l:"Путешествия",i:"✈️"},
  {id:"gifts",l:"Подарки",i:"🎁"},{id:"pets",l:"Животные",i:"🐾"},{id:"education",l:"Образование",i:"📚"},
  {id:"sport",l:"Спорт",i:"🏋️"},{id:"home",l:"Дом",i:"🛋️"},{id:"tech",l:"Техника",i:"💻"},
  {id:"alcohol",l:"Алкоголь",i:"🍷"},{id:"barbershop",l:"Барбершоп",i:"💈"},{id:"nails",l:"Ногти",i:"💅"},
  {id:"cosmetics",l:"Косметика",i:"🧴"},{id:"cleaning",l:"Быт.химия",i:"🧹"},{id:"debt",l:"Долги",i:"💰"},
  {id:"other",l:"Прочее",i:"🎰"},
];
const SCHEDULE = [
  {who:"her",name:"Настя",type:"Оклад (ЗП)",day:15,label:"15-го числа"},
  {who:"her",name:"Настя",type:"Аванс + Премия",day:31,label:"31-го числа"},
  {who:"me",name:"Максим",type:"Зарплата",day:17,label:"15-20 числа",range:[15,20]},
];
const MILESTONES = {
  10:{emoji:"🌱",title:"Первый шаг сделан",sub:"10% — это уже не ноль. Это начало.",col:"#7A9E7E"},
  20:{emoji:"✨",title:"Копилка оживает",sub:"Каждое пополнение — осознанное решение.",col:"#C4956A"},
  30:{emoji:"🔥",title:"Ритм найден",sub:"30% позади. Вы уже не начинаете — вы продолжаете.",col:"#C47A7A"},
  40:{emoji:"💛",title:"Почти половина",sub:"40% — серьёзная заявка. Банка тяжелеет.",col:"#D4A574"},
  50:{emoji:"⚡",title:"Половина пути закрыта",sub:"Теперь это уже не мечта. Это план.",col:"#C4956A"},
  60:{emoji:"🌊",title:"Больше половины",sub:"60% — и темп не падает. Это характер.",col:"#7A9E7E"},
  70:{emoji:"🎯",title:"Финишная прямая",sub:"70%. Уже видно конец. Не останавливайтесь.",col:"#8B5E3C"},
  80:{emoji:"💎",title:"Почти там",sub:"80% — редкость. Большинство сдаётся раньше.",col:"#C4956A"},
  90:{emoji:"🚀",title:"Последний рывок",sub:"90%. Один месяц — и финиш.",col:"#D4A574"},
  100:{emoji:"🏆",title:"Цель закрыта. Красиво.",sub:"Это не просто сумма — это семейная дисциплина.",col:"#C9A86A"},
};
const WITHDRAW_MSGS = [
  {emoji:"💪",title:"Всё под контролем",sub:"Иногда нужно брать. Главное — вернуться к ритму."},
  {emoji:"🔄",title:"Временный шаг назад",sub:"Деньги взяты с умом. Восстановим — и продолжим."},
  {emoji:"🤝",title:"Копилка помогла",sub:"Для этого она и была. Пополним снова — вместе."},
];
const GOAL_PRESETS = [
  {label:"Подушка безопасности",amount:100000,emoji:"🛡️"},
  {label:"Отпуск мечты",amount:200000,emoji:"✈️"},
  {label:"Новый автомобиль",amount:500000,emoji:"🚗"},
  {label:"Ремонт квартиры",amount:800000,emoji:"🏠"},
  {label:"Первый взнос",amount:1000000,emoji:"🏡"},
  {label:"Своя цель",amount:0,emoji:"✦"},
];
const FEATURES = [
  {i:"🫙",t:"Живая банка",d:"Glassmorphism с волной и монетками"},
  {i:"🎯",t:"Своя цель",d:"Сумма, название, дедлайн"},
  {i:"🏆",t:"Milestone-моменты",d:"Экран на каждые 10% прогресса"},
  {i:"🔔",t:"Напоминания",d:"Настя 15-го и 31-го, Максим 15-20-го"},
  {i:"🔄",t:"Регулярные платежи",d:"Аренда, подписки — один раз"},
  {i:"⚡",t:"Быстрый расход",d:"Правый клик на + — два тапа"},
  {i:"📊",t:"Прогноз + Что если",d:"Когда достигнете цели"},
  {i:"🔍",t:"Поиск и фильтры",d:"По сумме, категории, периоду"},
  {i:"🔥",t:"Streak",d:"Счётчик дней активности"},
  {i:"📥",t:"Экспорт CSV",d:"Все операции в файл"},
  {i:"👥",t:"Экран Мы",d:"Вклад каждого, зарплатный график"},
  {i:"↩️",t:"Изъятие из копилки",d:"С историей и мягкой мотивацией"},
];
const FAQ_DATA = [
  {q:"Как настроить свою цель?",a:"Таб «Цель» → кнопка «Изменить цель». Выберите пресет или задайте свою сумму, название и дедлайн. При смене цели milestone-экраны сбросятся."},
  {q:"Что такое Живая банка?",a:"Стеклянный сосуд с волной, пузырьками и золотым shimmer. 6 стадий заполнения. При пополнении падают монетки. Нажмите на банку — она вздрогнет."},
  {q:"Что такое Milestone-экраны?",a:"При каждом новом 10% прогресса появляется мотивационный полноэкранный момент. Каждый — один раз. При изъятии — мягкий поддерживающий экран."},
  {q:"Как добавить расход или доход?",a:"Кнопка + в центре навбара → три варианта. Правый клик на + — быстрая панель: сумма + категория, два тапа и готово."},
  {q:"Как работают напоминания?",a:"Настя — 15-го и 31-го, Максим — 15-20-го. За 5 дней появляется карточка с кнопкой «Внести» — форма откроется с заполненными данными."},
  {q:"Что такое Регулярные платежи?",a:"История → «Регулярные платежи». Добавьте аренду, подписки один раз. Кнопка «ok» мгновенно списывает расход."},
  {q:"Можно взять из копилки?",a:"Да. Таб «Цель» → кнопка «Взять». Показывает доступную сумму, не даёт взять больше. Изъятия хранятся отдельно."},
  {q:"Прогноз и Что если?",a:"Аналитика → блок «Что если». Выберите +2к/+5к/+10к ₽/мес — увидите на сколько раньше закроете цель."},
  {q:"Поиск в Истории?",a:"История → Расходы: строка поиска + чипы по категории + фильтр по периоду."},
  {q:"Streak 🔥?",a:"Счётчик дней подряд с активностью. Мотивирует не пропускать. Правый угол главного экрана."},
  {q:"Экспорт данных?",a:"История → кнопка «CSV». Скачивает файл для Excel, Google Sheets, Numbers."},
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = n => Math.round(n).toLocaleString("ru-RU");
const fmtK = n => Math.abs(n)>=1000000?(n/1000000).toFixed(1)+"М":Math.abs(n)>=1000?(n/1000).toFixed(0)+"к":String(Math.round(n));
const today = () => new Date().toISOString().slice(0,10);
const getCat = id => CATS.find(c => c.id === id);
const pctOf = (saved, goal) => Math.min(100, Math.max(0, goal > 0 ? (saved / goal) * 100 : 0));
const daysUntil = dl => Math.max(0, Math.ceil((new Date(dl) - new Date()) / 86400000));
const moUntil = dl => {
  const d = new Date(dl), n = new Date();
  return Math.max(1, (d.getFullYear()-n.getFullYear())*12 + d.getMonth()-n.getMonth());
};

function getReminders(incomes) {
  const now = new Date(), d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
  return SCHEDULE.map(s => {
    const pd = s.range ? Math.round((s.range[0]+s.range[1])/2) : s.day;
    const du = pd - d;
    const added = incomes.some(i => {
      const id = new Date(i.date);
      return i.who===s.who && i.label===s.type && id.getMonth()===m && id.getFullYear()===y;
    });
    if (added) return null;
    if (du >= 0 && du <= 5) return {...s, daysUntil:du, urgent:du<=1};
    if (du < 0 && du >= -3) return {...s, daysUntil:du, overdue:true};
    return null;
  }).filter(Boolean);
}

function calcStreak(data) {
  const days = new Set([
    ...data.incomes.map(i => i.date),
    ...data.expenses.map(e => e.date),
    ...data.savings.map(s => s.date),
  ]);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const k = new Date(Date.now() - i*86400000).toISOString().slice(0,10);
    if (days.has(k)) streak++; else break;
  }
  return streak;
}

function calcForecast(data, netSaved, goalAmount) {
  const mm = {};
  data.savings.forEach(s => {
    const d = new Date(s.date), k = d.getFullYear()+"-"+d.getMonth();
    mm[k] = (mm[k]||0) + s.amount;
  });
  const vals = Object.values(mm);
  if (!vals.length) return null;
  const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
  if (avg <= 0) return null;
  const mn = Math.ceil((goalAmount - netSaved) / avg);
  const fd = new Date(new Date().getFullYear(), new Date().getMonth()+mn, 1);
  return {avg, monthsNeeded:mn, forecastDate:fd};
}

// ─── THEME VARS ───────────────────────────────────────────────────────────────
const darkVars = `
  --bg: #1A1208; --bg2: #2C2018; --bg3: #3A2A18;
  --card: rgba(44,32,24,0.85); --card2: rgba(58,42,24,0.8);
  --border: rgba(255,255,255,0.08); --border2: rgba(255,255,255,0.12);
  --text: #EDE5D8; --text2: #B8A898; --text3: #7A6355;
  --inp-bg: rgba(58,42,24,0.6);
`;
const lightVars = `
  --bg: #F5F0E8; --bg2: #EDE5D8; --bg3: #E4D8C8;
  --card: rgba(250,247,242,0.82); --card2: rgba(237,229,216,0.55);
  --border: rgba(255,255,255,0.6); --border2: rgba(255,255,255,0.4);
  --text: #2C2018; --text2: #7A6355; --text3: #B8A898;
  --inp-bg: rgba(237,229,216,0.45);
`;

// ─── THEME HOOK ───────────────────────────────────────────────────────────────
function useTheme() {
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const saved = localStorage.getItem("kopilka_theme");
  const [dark, setDark] = useState(saved ? saved === "dark" : sys);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = e => { if (!localStorage.getItem("kopilka_theme")) setDark(e.matches); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("kopilka_theme", next ? "dark" : "light");
  };
  return [dark, toggle];
}

// ─── SOUND ENGINE ─────────────────────────────────────────────────────────────
const SFX = {
  coin: () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 80, 160].forEach(delay => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(880 + delay * 2, ctx.currentTime + delay / 1000);
        o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + delay / 1000 + 0.1);
        g.gain.setValueAtTime(0.15, ctx.currentTime + delay / 1000);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.25);
        o.start(ctx.currentTime + delay / 1000);
        o.stop(ctx.currentTime + delay / 1000 + 0.3);
      });
    } catch {}
  },
  click: () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(600, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      o.start(); o.stop(ctx.currentTime + 0.12);
    } catch {}
  },
  milestone: () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.12 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
        o.start(ctx.currentTime + i * 0.12);
        o.stop(ctx.currentTime + i * 0.12 + 0.45);
      });
    } catch {}
  },
};
function useData() {
  const load = () => {
    try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r); } catch {}
    return {incomes:[], expenses:[], savings:[], withdrawals:[], recurring:[], goal:DEFAULT_GOAL};
  };
  const [data, setData] = useState(load);
  useEffect(() => { try { localStorage.setItem(SK, JSON.stringify(data)); } catch {} }, [data]);
  return [data, setData];
}

// ─── DATA HOOK ────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200;0,9..144,300;1,9..144,200;1,9..144,300&family=Inter:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
::-webkit-scrollbar{display:none;}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
body{margin:0;background:#F5F0E8;}
.app{font-family:'Inter',sans-serif;max-width:430px;margin:0 auto;min-height:100vh;background:linear-gradient(160deg,#F5F0E8 0%,#EDE5D8 55%,#E4D8C8 100%);}
.fr{font-family:'Fraunces',serif;}
.card{border-radius:28px;background:rgba(250,247,242,0.82);box-shadow:0 20px 60px rgba(44,32,24,0.08),0 2px 8px rgba(44,32,24,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.6);padding:22px;margin-bottom:14px;}
.card-dark{border-radius:28px;background:linear-gradient(145deg,#2C2018 0%,#1A1208 100%);box-shadow:0 24px 64px rgba(26,18,8,0.35);border:1px solid rgba(255,255,255,0.08);padding:26px 22px;margin-bottom:14px;}
.card-sm{border-radius:20px;background:rgba(250,247,242,0.75);box-shadow:0 8px 24px rgba(44,32,24,0.07);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.55);padding:16px;}
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(245,240,232,0.95);backdrop-filter:blur(24px);border-top:1px solid rgba(255,255,255,0.65);box-shadow:0 -8px 32px rgba(44,32,24,0.08);display:flex;align-items:flex-end;justify-content:space-around;padding:8px 4px 20px;z-index:100;}
.nav-btn{display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:6px 8px;min-width:44px;transition:all 0.2s;}
.nav-btn:active{transform:scale(0.92);}
.nav-icon{font-size:20px;line-height:1;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);}
.nav-label{font-size:9px;font-weight:500;letter-spacing:0.03em;}
.nav-btn.active .nav-icon{transform:scale(1.18);}
.fab-wrap{position:relative;display:flex;flex-direction:column;align-items:center;}
.fab{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#D4A574,#C4956A);box-shadow:0 8px 28px rgba(196,149,106,0.45);display:flex;align-items:center;justify-content:center;position:relative;font-size:24px;margin-bottom:6px;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);}
.fab:active{transform:scale(0.93);}
.fab.open{transform:rotate(45deg);}
.fab-menu{position:absolute;bottom:68px;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;opacity:0;transform:translateY(16px);transition:all 0.3s cubic-bezier(0.16,1,0.3,1);}
.fab-menu.open{pointer-events:all;opacity:1;transform:translateY(0);}
.fab-item{display:flex;align-items:center;gap:10px;background:rgba(250,247,242,0.97);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.75);box-shadow:0 8px 24px rgba(44,32,24,0.13);border-radius:18px;padding:10px 16px;cursor:pointer;white-space:nowrap;font-size:14px;font-weight:500;color:#2C2018;transition:all 0.18s;}
.fab-item:active{transform:scale(0.96);}
.overlay{position:fixed;inset:0;background:rgba(26,18,8,0.48);backdrop-filter:blur(10px);z-index:200;animation:fadeIn 0.22s ease;}
.sheet{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:linear-gradient(180deg,#FAF7F2 0%,#F5F0E8 100%);border-radius:28px 28px 0 0;padding:0 20px 44px;max-height:92vh;overflow-y:auto;z-index:201;box-shadow:0 -20px 60px rgba(44,32,24,0.18);animation:slideUp 0.32s cubic-bezier(0.16,1,0.3,1);}
.handle{width:40px;height:4px;background:rgba(44,32,24,0.13);border-radius:2px;margin:14px auto 22px;}
.fl{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#B8A898;display:block;margin-bottom:7px;}
.inp{width:100%;padding:13px 16px;border-radius:16px;border:1.5px solid rgba(184,168,152,0.28);background:rgba(237,229,216,0.45);font-size:15px;color:#2C2018;outline:none;transition:border-color 0.2s,box-shadow 0.2s;font-family:'Inter',sans-serif;}
.inp:focus{border-color:rgba(196,149,106,0.55);box-shadow:0 0 0 4px rgba(196,149,106,0.1);}
.inp-xl{font-family:'Fraunces',serif;font-size:40px;font-weight:200;letter-spacing:-1.5px;padding:16px;border-radius:20px;text-align:center;}
.inp-xl::placeholder{color:#D8C5B0;}
textarea.inp{resize:none;line-height:1.6;}
.pt{background:rgba(184,168,152,0.18);border-radius:999px;overflow:hidden;}
.pf{height:100%;border-radius:999px;background:linear-gradient(90deg,#C4956A,#D4A574,#E8C49A);transition:width 1.3s cubic-bezier(0.16,1,0.3,1);}
.btn{width:100%;padding:15px;border-radius:18px;border:none;cursor:pointer;background:linear-gradient(135deg,#D4A574,#C4956A);color:#FAF7F2;font-size:15px;font-weight:600;box-shadow:0 8px 24px rgba(196,149,106,0.32);transition:all 0.2s;font-family:'Inter',sans-serif;}
.btn:active{transform:scale(0.98);}
.btn-g{background:rgba(237,229,216,0.65);border:1.5px solid rgba(184,168,152,0.3);border-radius:14px;padding:10px 18px;font-size:13px;font-weight:500;color:#7A6355;cursor:pointer;font-family:'Inter',sans-serif;}
.btn-d{background:rgba(196,122,122,0.1);border:1.5px solid rgba(196,122,122,0.28);color:#C47A7A;border-radius:16px;padding:13px;width:100%;font-size:14px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;}
.tg{display:flex;gap:6px;background:rgba(237,229,216,0.55);border-radius:16px;padding:4px;}
.tgb{flex:1;padding:10px 8px;border-radius:12px;border:none;cursor:pointer;font-size:13px;font-weight:500;background:none;color:#7A6355;transition:all 0.2s;font-family:'Inter',sans-serif;}
.tgb.on{background:#FAF7F2;color:#2C2018;box-shadow:0 4px 12px rgba(44,32,24,0.08);}
.li{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-radius:20px;background:rgba(250,247,242,0.76);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.55);margin-bottom:8px;box-shadow:0 4px 14px rgba(44,32,24,0.05);cursor:pointer;transition:all 0.16s ease;}
.li:active{transform:scale(0.99);}
.cel{position:fixed;inset:0;z-index:300;background:linear-gradient(160deg,#F5F0E8,#EDE5D8,#E8D4C0);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;animation:fadeIn 0.6s ease;}
.st{margin:0 0 12px 2px;font-size:11px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:#B8A898;}
.qs{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:398px;background:rgba(250,247,242,0.97);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.7);border-radius:28px;padding:20px;box-shadow:0 -8px 40px rgba(44,32,24,0.15);z-index:150;animation:slideUpQ 0.28s cubic-bezier(0.16,1,0.3,1);}
.sb{width:100%;padding:11px 16px 11px 40px;border-radius:14px;border:1.5px solid rgba(184,168,152,0.25);background:rgba(237,229,216,0.5);font-size:14px;color:#2C2018;outline:none;font-family:'Inter',sans-serif;}
.faq-i{border-radius:18px;background:rgba(250,247,242,0.78);border:1px solid rgba(255,255,255,0.55);margin-bottom:8px;overflow:hidden;}
.faq-q{width:100%;padding:16px 18px;background:none;border:none;text-align:left;font-size:14px;font-weight:500;color:#2C2018;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:'Inter',sans-serif;}
.faq-a{padding:0 18px 16px;font-size:13px;color:#7A6355;line-height:1.7;}
@keyframes wv{0%,100%{transform:translateX(0)}50%{transform:translateX(-8px)}}
@keyframes bub{0%{opacity:0;transform:translateY(0)}20%{opacity:0.6}80%{opacity:0.3}100%{opacity:0;transform:translateY(-70px)}}
@keyframes coinFall{0%{opacity:1;transform:translateY(-50px) rotate(0deg)}70%{opacity:1}100%{opacity:0;transform:translateY(90px) rotate(540deg) scale(0.5)}}
@keyframes shim{0%,100%{opacity:0.3;transform:translateX(-15px)}50%{opacity:0.8;transform:translateX(15px)}}
@keyframes hf{0%{opacity:0;transform:translateY(0)}30%{opacity:0.9}100%{opacity:0;transform:translateY(-45px)}}
@keyframes sp{0%,100%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1)}}
@keyframes jShake{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
@keyframes glw{0%,100%{filter:drop-shadow(0 0 6px rgba(212,165,116,0.35))}50%{filter:drop-shadow(0 0 18px rgba(212,165,116,0.75))}}
@keyframes cnf{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(110px) rotate(480deg)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateX(-50%) translateY(40px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
@keyframes slideUpQ{from{transform:translateX(-50%) translateY(30px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes bloom{0%{opacity:0;transform:scale(0.8)}60%{opacity:1;transform:scale(1.05)}100%{transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.float-a{animation:fl 4s ease-in-out infinite;}
.bloom-a{animation:bloom 0.9s cubic-bezier(0.16,1,0.3,1) both;}
.pulse-d{animation:pulse 1.8s ease-in-out infinite;}
`;

// ─── LIVING JAR ───────────────────────────────────────────────────────────────
function LivingJar({pct, onTap}) {
  const [anim, setAnim] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [coins, setCoins] = useState([]);
  const prev = useRef(pct);

  useEffect(() => {
    const t = setTimeout(() => setAnim(pct), 150);
    if (pct > prev.current) {
      const nc = Array.from({length:9}, (_,i) => ({
        id: Date.now()+i, x: 28+Math.random()*55, delay: i*90, size: 5+Math.random()*5
      }));
      setCoins(c => [...c, ...nc]);
      setTimeout(() => setCoins([]), 2000);
    }
    prev.current = pct;
    return () => clearTimeout(t);
  }, [pct]);

  const tap = () => {
    setShaking(true);
    if (navigator.vibrate) navigator.vibrate(25);
    setTimeout(() => setShaking(false), 400);
    if (onTap) onTap();
  };

  const fillH = Math.min(anim, 100) * 1.05;
  const fillY = 168 - fillH;
  const stage = pct>=100?6 : pct>=95?5 : pct>=70?4 : pct>=45?3 : pct>=20?2 : 1;
  const glowA = stage>=5?0.7 : stage>=3?0.32 : 0.08;
  const bubCount = Math.min(stage*2, 10);

  return (
    <div style={{position:"relative",width:140,height:185,cursor:"pointer",userSelect:"none"}} onClick={tap}>
      {stage >= 3 && (
        <div style={{position:"absolute",top:"18%",left:"8%",width:"84%",height:"58%",
          borderRadius:"50%",background:`rgba(212,165,116,${glowA})`,
          filter:"blur(18px)",pointerEvents:"none",transition:"all 1.2s"}}/>
      )}
      {coins.map(c => (
        <div key={c.id} style={{position:"absolute",left:c.x+"%",top:0,
          width:c.size,height:c.size,borderRadius:"50%",
          background:"linear-gradient(135deg,#F5D060,#C4956A)",
          border:"1px solid rgba(255,220,70,0.8)",pointerEvents:"none",zIndex:10,
          animation:`coinFall 1.5s ease-in ${c.delay}ms both`}}/>
      ))}
      <svg width="140" height="185" viewBox="0 0 140 185" fill="none"
        style={{animation: shaking?"jShake 0.4s ease" : stage===6?"glw 2s ease-in-out infinite":"none"}}>
        <defs>
          <clipPath id="jc9"><path d="M24 60 Q20 65 18 72 L14 140 Q12 158 70 160 Q128 158 126 140 L122 72 Q120 65 116 60 Z"/></clipPath>
          <linearGradient id="liq9" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8C98A" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#C4956A" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="gl9" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)"/>
            <stop offset="45%" stopColor="rgba(255,255,255,0.06)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0.16)"/>
          </linearGradient>
          <linearGradient id="rl9" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8D090"/>
            <stop offset="50%" stopColor="#C4956A"/>
            <stop offset="100%" stopColor="#9A6838"/>
          </linearGradient>
        </defs>
        <g clipPath="url(#jc9)">
          <rect x="14" y={fillY} width="112" height="170" fill="url(#liq9)"
            style={{transition:"y 1.4s cubic-bezier(0.16,1,0.3,1)"}}/>
          {anim > 3 && anim < 100 && (
            <path d={`M14,${fillY} Q35,${fillY-7} 56,${fillY} Q77,${fillY+7} 98,${fillY} Q119,${fillY-5} 126,${fillY} L126,185 L14,185 Z`}
              fill="rgba(255,255,255,0.2)" style={{animation:"wv 3s ease-in-out infinite"}}/>
          )}
          {stage >= 2 && (
            <ellipse cx="48" cy={fillY+14} rx="16" ry="5" fill="rgba(255,245,175,0.38)"
              style={{animation:"shim 3.5s ease-in-out infinite"}}/>
          )}
          {Array.from({length:bubCount}, (_,i) => (
            <circle key={i} cx={18+(i*12)%90} cy={fillY+25+i*8} r={1.5+i%3}
              fill="rgba(255,255,255,0.32)"
              style={{animation:`bub ${3+i*0.6}s ease-in ${i*0.55}s infinite`}}/>
          ))}
          {stage >= 3 && Array.from({length:stage>=4?5:3}, (_,i) => (
            <text key={i} x={20+i*20} y={fillY+38} fontSize="9"
              fill="rgba(255,255,255,0.6)"
              style={{animation:`hf ${2.8+i*0.3}s ease-out ${i*0.7}s infinite`}}>
              {stage>=5?"*":"o"}
            </text>
          ))}
          {stage === 6 && <rect x="14" y={fillY-10} width="112" height="14" fill="rgba(232,201,138,0.55)"/>}
        </g>
        {stage >= 4 && Array.from({length:8}, (_,i) => {
          const a = (i*45)*Math.PI/180, d = stage>=5?54:46;
          return <circle key={i} cx={70+Math.cos(a)*d} cy={112+Math.sin(a)*(d*0.55)} r="2.5"
            fill="#D4A574" style={{animation:`sp 2s ease-in-out ${i*0.22}s infinite`}}/>;
        })}
        <path d="M24 60 Q20 65 18 72 L14 140 Q12 158 70 160 Q128 158 126 140 L122 72 Q120 65 116 60 Z"
          stroke="url(#rl9)" strokeWidth="1.5" fill="none"/>
        <path d="M24 60 Q20 65 18 72 L14 140 Q12 158 70 160 Q128 158 126 140 L122 72 Q120 65 116 60 Z"
          fill="url(#gl9)"/>
        <path d="M27 70 L21 132 Q23 150 36 156" stroke="rgba(255,255,255,0.48)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M38 46 L38 60 L102 60 L102 46 Q102 36 70 34 Q38 36 38 46 Z"
          fill="rgba(237,225,200,0.65)" stroke="url(#rl9)" strokeWidth="1"/>
        <rect x="30" y="29" width="80" height="18" rx="9" fill="url(#rl9)"/>
        <rect x="52" y="21" width="36" height="10" rx="5" fill="#C4956A"/>
        <text x="70" y="122" textAnchor="middle" fontSize="17" fontWeight="300"
          fontFamily="Fraunces,serif"
          fill={anim>50?"rgba(44,32,24,0.82)":"rgba(196,149,106,0.65)"}>
          {Math.round(anim)}%
        </text>
        {stage === 6 && (
          <ellipse cx="70" cy="160" rx="54" ry="7" fill="rgba(212,165,116,0.22)"
            style={{animation:"glw 2s ease-in-out infinite"}}/>
        )}
      </svg>
      {stage === 6 && Array.from({length:14}, (_,i) => (
        <div key={i} style={{position:"absolute",left:(8+i*5.5)+"%",top:"-8px",
          width:5,height:5,borderRadius:i%2===0?"50%":"2px",
          background:["#E8C98A","#C4956A","#D4A574","#F0D090","#B98E60"][i%5],
          animation:`cnf ${1.4+Math.random()*0.8}s ease-in ${i*0.1}s both`,
          pointerEvents:"none"}}/>
      ))}
    </div>
  );
}

// ─── MILESTONE SCREEN ─────────────────────────────────────────────────────────
function MilestoneScreen({celebrate, onClose, netSaved, goalAmount}) {
  const isW = celebrate && celebrate.type === "withdraw";
  const m = !isW && typeof celebrate === "number" ? MILESTONES[celebrate] : null;
  const is100 = celebrate === 100;
  const emoji = isW ? celebrate.emoji : m ? m.emoji : "🏆";
  const title = isW ? celebrate.title : m ? m.title : "Цель!";
  const sub = isW ? celebrate.sub : m ? m.sub : "";
  const jarPct = isW ? pctOf(netSaved, goalAmount) : typeof celebrate === "number" ? celebrate : 100;
  return (
    <div className="cel" style={{background: isW
      ? "linear-gradient(160deg,#F0EDE8,#E8E0D5)"
      : "linear-gradient(160deg,#F5F0E8,#EDE5D8,#E8D4C0)"}}>
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        {Array.from({length:14}, (_,i) => (
          <div key={i} style={{position:"absolute",
            fontSize:i%3===0?22:i%3===1?16:10,opacity:0.08,
            left:(5+i*6.5)+"%",top:(8+((i*43)%78))+"%",
            animation:`fl ${3+i*0.32}s ease-in-out infinite`,
            animationDelay:(i*0.24)+"s"}}>
            {isW ? "○" : "✦"}
          </div>
        ))}
      </div>
      <div className="bloom-a" style={{marginBottom:20}}><LivingJar pct={jarPct}/></div>
      {!isW && typeof celebrate === "number" && (
        <div style={{background:"rgba(255,255,255,0.5)",
          border:"1px solid rgba(196,149,106,0.3)",
          borderRadius:20,padding:"6px 18px",marginBottom:16}}>
          <span style={{fontSize:13,fontWeight:600,color:m?m.col:P.amber,letterSpacing:"0.06em"}}>
            {celebrate}% достигнуто
          </span>
        </div>
      )}
      <div style={{fontSize:48,marginBottom:12,lineHeight:1}}>{emoji}</div>
      <p className="fr" style={{margin:"0 0 8px",fontSize:is100?40:34,fontWeight:200,
        color:P.espresso,letterSpacing:"-1.5px",lineHeight:1.1,
        fontStyle:"italic",textAlign:"center",maxWidth:300}}>{title}</p>
      <p style={{margin:"0 0 32px",fontSize:15,color:P.driftwood,lineHeight:1.75,
        maxWidth:270,textAlign:"center",fontStyle:"italic"}}>{sub}</p>
      <button onClick={onClose} style={{
        background: isW ? "rgba(122,158,126,0.15)" : "linear-gradient(135deg,"+P.honey+","+P.amber+")",
        border: isW ? "1.5px solid rgba(122,158,126,0.35)" : "none",
        color: isW ? P.sage : "#FAF7F2",
        borderRadius:18,padding:"14px 40px",fontSize:14,fontWeight:600,
        cursor:"pointer",fontFamily:"Inter",
        boxShadow: isW ? "none" : "0 8px 24px rgba(196,149,106,0.35)"}}>
        {isW ? "Вперёд" : is100 ? "Невероятно ✦" : "Продолжаем ✦"}
      </button>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const [data, setData, synced] = useData();
  const [dark, toggleDark] = useTheme();
  const [sheet, setSheet] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [viewExp, setViewExp] = useState(null);
  const [recap, setRecap] = useState(null);
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const audioRef = useRef(null);
  const [shownM, setShownM] = useState(() => {
    try { const r = localStorage.getItem("kopilka_ms"); return r ? JSON.parse(r) : []; } catch { return []; }
  });

  // apply theme
  useEffect(() => {
    document.body.style.background = dark ? "#1A1208" : "#F5F0E8";
  }, [dark]);

  // lo-fi toggle
  const toggleLofi = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("https://www.lofi.cafe/audio/lofi1.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.18;
    }
    if (lofiPlaying) { audioRef.current.pause(); setLofiPlaying(false); }
    else { audioRef.current.play().catch(()=>{}); setLofiPlaying(true); }
  };

  if (!data || !synced) return (
    <>
      <style>{css}</style>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#F5F0E8,#EDE5D8)",fontFamily:"Inter,sans-serif"}}>
        <div style={{fontSize:48,marginBottom:20,animation:"fl 1.5s ease-in-out infinite"}}>🫙</div>
        <p style={{color:"#B8A898",fontSize:14,fontStyle:"italic",letterSpacing:"0.05em"}}>Подключаемся к копилке…</p>
        <style>{`@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      </div>
    </>
  );

  // derive goal values
  const goal = data.goal || DEFAULT_GOAL;
  const goalAmount = goal.amount || DEFAULT_GOAL.amount;
  const goalDeadline = new Date(goal.deadline || DEFAULT_GOAL.deadline);

  const totalIncome   = data.incomes.reduce((s,i) => s+i.amount, 0);
  const totalExpenses = data.expenses.reduce((s,e) => s+e.amount, 0);
  const totalSaved    = data.savings.reduce((s,sv) => s+sv.amount, 0);
  const totalWithdrawn = (data.withdrawals||[]).reduce((s,w) => s+w.amount, 0);
  const netSaved  = totalSaved - totalWithdrawn;
  const pct       = pctOf(netSaved, goalAmount);
  const needed    = Math.max(0, goalAmount - netSaved);
  const perMonth  = Math.ceil(needed / moUntil(goal.deadline || DEFAULT_GOAL.deadline));
  const daysLeftVal = daysUntil(goal.deadline || DEFAULT_GOAL.deadline);
  const balance   = totalIncome - totalExpenses - netSaved;
  const streak    = calcStreak(data);
  const forecast  = calcForecast(data, netSaved, goalAmount);
  if (forecast) forecast.onTrack = forecast.forecastDate <= goalDeadline;
  const reminders = getReminders(data.incomes);

  // Monthly recap on days 1-3
  useEffect(() => {
    const now = new Date();
    if (now.getDate() > 3) return;
    const lm = now.getMonth() === 0 ? 11 : now.getMonth()-1;
    const ly = now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear();
    const lmKey = ly+"-"+String(lm+1).padStart(2,"0");
    const seenKey = "recap_seen_"+lmKey;
    if (localStorage.getItem(seenKey)) return;
    const inc = data.incomes.filter(i=>i.date.startsWith(lmKey)).reduce((s,i)=>s+i.amount,0);
    const exp = data.expenses.filter(e=>e.date.startsWith(lmKey)).reduce((s,e)=>s+e.amount,0);
    const sav = data.savings.filter(s=>s.date.startsWith(lmKey)).reduce((s,sv)=>s+sv.amount,0);
    if (!inc && !exp && !sav) return;
    const cs = {};
    data.expenses.filter(e=>e.date.startsWith(lmKey)).forEach(e=>{cs[e.category]=(cs[e.category]||0)+e.amount;});
    const top = Object.entries(cs).sort((a,b)=>b[1]-a[1])[0];
    const topCat = top ? getCat(top[0]) : null;
    const prevKey = ly+"-"+String(lm).padStart(2,"0");
    const prevExp = data.expenses.filter(e=>e.date.startsWith(prevKey)).reduce((s,e)=>s+e.amount,0);
    setRecap({inc, exp, sav, month:RU_MO[lm], topCat:topCat?topCat.i+" "+topCat.l:"—", prevExp, seenKey});
  }, []);

  const openSheet = (type, prefill=null) => {
    setFabOpen(false); setQuickOpen(false);
    setSheet(type); setSheetData(prefill);
  };

  const checkMilestone = (oldP, newP) => {
    for (let m = 10; m <= 100; m += 10) {
      if (oldP < m && newP >= m && !shownM.includes(m)) {
        setTimeout(() => {
          SFX.milestone();
          setCelebrate(m);
          const u = [...shownM, m];
          setShownM(u);
          try { localStorage.setItem("kopilka_ms", JSON.stringify(u)); } catch {}
        }, 600);
        break;
      }
    }
  };

  const addExpense = e => { SFX.click(); setData(d=>({...d,expenses:[e,...d.expenses]})); setSheet(null); setQuickOpen(false); };
  const addIncome  = i => { SFX.click(); setData(d=>({...d,incomes:[i,...d.incomes]})); setSheet(null); };
  const addSaving  = s => {
    SFX.coin();
    const op = pctOf(netSaved, goalAmount);
    const np = pctOf(netSaved+s.amount, goalAmount);
    setData(d=>({...d,savings:[s,...d.savings]})); setSheet(null);
    checkMilestone(op, np);
  };
  const addWithdrawal = w => {
    SFX.click();
    setData(d=>({...d,withdrawals:[w,...(d.withdrawals||[])]})); setSheet(null);
    const msg = WITHDRAW_MSGS[Math.floor(Math.random()*WITHDRAW_MSGS.length)];
    setTimeout(() => setCelebrate({type:"withdraw",...msg}), 400);
  };
  const addRecurring = r => { setData(d=>({...d,recurring:[r,...(d.recurring||[])]})); setSheet(null); };
  const saveGoal = g => {
    setData(d=>({...d,goal:g})); setSheet(null);
    setShownM([]); try { localStorage.setItem("kopilka_ms","[]"); } catch {}
  };
  const delExp  = id => setData(d=>({...d,expenses:d.expenses.filter(e=>e.id!==id)}));
  const delInc  = id => setData(d=>({...d,incomes:d.incomes.filter(i=>i.id!==id)}));
  const delSav  = id => setData(d=>({...d,savings:d.savings.filter(s=>s.id!==id)}));
  const delWith = id => setData(d=>({...d,withdrawals:(d.withdrawals||[]).filter(w=>w.id!==id)}));
  const delRec  = id => setData(d=>({...d,recurring:(d.recurring||[]).filter(r=>r.id!==id)}));
  const applyRec = r => addExpense({id:Date.now(),category:r.category,amount:r.amount,comment:"Регулярный: "+r.name,date:today(),photo:null});

  const exportCSV = () => {
    const rows = [["Тип","Дата","Сумма","Категория","Комментарий"]];
    data.incomes.forEach(i => rows.push(["Доход",i.date,i.amount,i.label,i.note||""]));
    data.expenses.forEach(e => { const c=getCat(e.category); rows.push(["Расход",e.date,e.amount,c?c.l:e.category,e.comment||""]); });
    data.savings.forEach(s => rows.push(["Копилка",s.date,s.amount,"Взнос",s.note||""]));
    (data.withdrawals||[]).forEach(w => rows.push(["Копилка",w.date,-w.amount,"Изъятие",w.reason||""]));
    const csv = rows.map(r => r.map(v=>'"'+v+'"').join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="kopilka_"+today()+".csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const NAV = [
    {i:"🏠",l:"Главная"},{i:"📊",l:"Аналитика"},{i:"+",l:"",fab:true},
    {i:"📋",l:"История"},{i:"👥",l:"Мы"},{i:"🎯",l:"Цель"},
  ];

  return (
    <>
      <style>{css}</style>
      <style>{`:root{${dark ? darkVars : lightVars}}`}</style>
      <div className="app" style={{
        paddingBottom:96,
        background: dark
          ? "linear-gradient(160deg,#2C2018 0%,#1A1208 60%,#0E0A04 100%)"
          : "linear-gradient(160deg,#F5F0E8 0%,#EDE5D8 55%,#E4D8C8 100%)"
      }}>
        {/* Floating controls: theme + lofi */}
        <div style={{position:"fixed",top:16,right:16,zIndex:99,display:"flex",gap:8}}>
          <button onClick={toggleLofi} title={lofiPlaying?"Пауза lo-fi":"Включить lo-fi"} style={{width:38,height:38,borderRadius:12,border:"1px solid rgba(196,149,106,0.3)",background:dark?"rgba(44,32,24,0.9)":"rgba(250,247,242,0.9)",backdropFilter:"blur(12px)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(44,32,24,0.15)"}}>
            {lofiPlaying?"🎵":"🎶"}
          </button>
          <button onClick={toggleDark} title="Сменить тему" style={{width:38,height:38,borderRadius:12,border:"1px solid rgba(196,149,106,0.3)",background:dark?"rgba(44,32,24,0.9)":"rgba(250,247,242,0.9)",backdropFilter:"blur(12px)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(44,32,24,0.15)"}}>
            {dark?"☀️":"🌙"}
          </button>
        </div>
        {tab===0 && <HomeScreen data={data} totalIncome={totalIncome} totalExpenses={totalExpenses} netSaved={netSaved} balance={balance} pct={pct} needed={needed} perMonth={perMonth} daysLeftVal={daysLeftVal} reminders={reminders} streak={streak} forecast={forecast} goal={goal} goalAmount={goalAmount} onSav={()=>openSheet("saving")} onReminder={s=>openSheet("income",s)} onGoalTab={()=>setTab(5)}/>}
        {tab===1 && <AnalyticsScreen data={data} totalIncome={totalIncome} totalExpenses={totalExpenses} totalSaved={netSaved} forecast={forecast} goalAmount={goalAmount}/>}
        {tab===3 && <HistoryScreen data={data} netSaved={netSaved} goalAmount={goalAmount} onDelSav={delSav} onDelWith={delWith} onWithdraw={()=>openSheet("withdraw")} onRec={()=>openSheet("recurring")} onApplyRec={applyRec} onDelRec={delRec} onExport={exportCSV} onRepeatExp={e=>openSheet("expense",e)} onViewExp={setViewExp}/>}
        {tab===4 && <WeScreen data={data} totalIncome={totalIncome} netSaved={netSaved} onDelInc={delInc} onFAQ={()=>openSheet("faq")} onGoalTab={()=>setTab(5)}/>}
        {tab===5 && <GoalScreen data={data} netSaved={netSaved} goalAmount={goalAmount} pct={pct} goal={goal} forecast={forecast} perMonth={perMonth} daysLeftVal={daysLeftVal} needed={needed} shownM={shownM} onEditGoal={()=>openSheet("goal")} onSav={()=>openSheet("saving")} onWithdraw={()=>openSheet("withdraw")}/>}
      </div>

      {quickOpen && (
        <>
          <div style={{position:"fixed",inset:0,zIndex:149}} onClick={()=>setQuickOpen(false)}/>
          <QuickExpense onSave={addExpense} onClose={()=>setQuickOpen(false)}
            onFull={()=>{setQuickOpen(false);openSheet("expense");}}
            defaultCat={data.expenses[0]?.category||"food"}
            defaultAmt={data.expenses[0]?.amount||""}/>
        </>
      )}

      <nav className="nav">
        {NAV.map((n,i) => n.fab ? (
          <div key="fab" className="fab-wrap">
            <div className={"fab-menu"+(fabOpen?" open":"")}>
              {[{l:"Расход",i:"💸",t:"expense"},{l:"Доход",i:"💚",t:"income"},{l:"В копилку",i:"✦",t:"saving"}].map(x=>(
                <div key={x.t} className="fab-item" onClick={()=>openSheet(x.t)}>
                  <span style={{fontSize:18}}>{x.i}</span><span>{x.l}</span>
                </div>
              ))}
            </div>
            <button className={"fab"+(fabOpen?" open":"")}
              onClick={()=>setFabOpen(v=>!v)}
              onContextMenu={e=>{e.preventDefault();setFabOpen(false);setQuickOpen(true);}}>
              {reminders.length>0 && !fabOpen && (
                <span className="pulse-d" style={{position:"absolute",top:3,right:3,width:10,height:10,
                  borderRadius:"50%",background:"#C47A7A",border:"2px solid #F5F0E8"}}/>
              )}
              +
            </button>
          </div>
        ) : (
          <button key={i} className={"nav-btn"+(tab===i?" active":"")}
            onClick={()=>{setFabOpen(false);setTab(i);}}>
            <span className="nav-icon">{n.i}</span>
            <span className="nav-label" style={{color:tab===i?P.amber:P.linen}}>{n.l}</span>
          </button>
        ))}
      </nav>

      {sheet==="expense"   && <ExpenseSheet   onSave={addExpense}    onClose={()=>setSheet(null)} defaultCat={data.expenses[0]?.category||"food"} defaultAmt={data.expenses[0]?.amount||""} prefill={sheetData}/>}
      {sheet==="income"    && <IncomeSheet    onSave={addIncome}     onClose={()=>setSheet(null)} prefill={sheetData} defaultWho={data.incomes[0]?.who||"me"}/>}
      {sheet==="saving"    && <SavingSheet    onSave={addSaving}     onClose={()=>setSheet(null)}/>}
      {sheet==="withdraw"  && <WithdrawSheet  onSave={addWithdrawal} onClose={()=>setSheet(null)} maxAmount={netSaved}/>}
      {sheet==="recurring" && <RecurringSheet onSave={addRecurring}  onClose={()=>setSheet(null)}/>}
      {sheet==="goal"      && <GoalSheet      onSave={saveGoal}      onClose={()=>setSheet(null)} current={goal}/>}
      {sheet==="faq"       && <FAQSheet       onClose={()=>setSheet(null)} onEditGoal={()=>{setSheet(null);setTab(5);}}/>}
      {viewExp && <ExpDetailSheet exp={viewExp} onDelete={id=>{delExp(id);setViewExp(null);}} onClose={()=>setViewExp(null)} onRepeat={e=>{setViewExp(null);openSheet("expense",e);}}/>}
      {celebrate !== null && <MilestoneScreen celebrate={celebrate} onClose={()=>setCelebrate(null)} netSaved={netSaved} goalAmount={goalAmount}/>}
      {recap && <RecapModal recap={recap} onClose={()=>{localStorage.setItem(recap.seenKey,"1");setRecap(null);}}/>}
      {fabOpen && <div style={{position:"fixed",inset:0,zIndex:99}} onClick={()=>setFabOpen(false)}/>}
    </>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────
function HomeScreen({data,totalIncome,totalExpenses,netSaved,balance,pct,needed,perMonth,daysLeftVal,reminders,streak,forecast,goal,goalAmount,onSav,onReminder,onGoalTab}) {
  const catSpend = {};
  data.expenses.forEach(e => { catSpend[e.category]=(catSpend[e.category]||0)+e.amount; });
  const topCats = Object.entries(catSpend).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const totalExp = data.expenses.reduce((s,e)=>s+e.amount,0);
  const dueRec = (data.recurring||[]).filter(r => {
    const d = new Date().getDate();
    return Math.abs(r.dayOfMonth-d)<=2 && !data.expenses.some(e=>e.comment==="Регулярный: "+r.name&&e.date===today());
  });
  const comment = (() => {
    if (!totalIncome) return {t:"Добавьте первый доход — и начнётся магия",ok:null};
    const ep = (totalExpenses/totalIncome)*100;
    if (pct>=100) return {t:"Цель закрыта. Это семейная дисциплина.",ok:true};
    if (ep>80) return {t:"Расходы "+Math.round(ep)+"% от дохода. Пора притормозить.",ok:false};
    if (ep<45) return {t:"Расходы всего "+Math.round(ep)+"% — очень зрелый подход.",ok:true};
    return {t:"Откладывайте "+fmt(perMonth)+" ₽/мес — и к дедлайну всё случится.",ok:true};
  })();

  return (
    <div style={{padding:"36px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <p style={{margin:0,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:P.linen}}>Семейная копилка</p>
          <h1 className="fr" style={{margin:"4px 0 0",fontSize:32,fontWeight:200,color:P.espresso,letterSpacing:"-0.8px",fontStyle:"italic",lineHeight:1.1}}>Доброе утро</h1>
        </div>
        {streak>0 && (
          <div style={{background:"rgba(250,247,242,0.9)",border:"1px solid rgba(255,255,255,0.6)",borderRadius:14,padding:"7px 12px",textAlign:"center",boxShadow:"0 4px 16px rgba(44,32,24,0.07)"}}>
            <div style={{fontSize:18}}>🔥</div>
            <p style={{margin:"2px 0 0",fontSize:12,fontWeight:600,color:P.espresso}}>{streak}</p>
          </div>
        )}
      </div>

      {(reminders.length>0||dueRec.length>0) && (
        <div style={{marginBottom:6}}>
          <p className="st">Напоминания</p>
          {reminders.map((r,i) => <ReminderCard key={i} r={r} onAction={()=>onReminder(r)}/>)}
          {dueRec.map(r => (
            <div key={r.id} style={{borderRadius:18,padding:"13px 16px",marginBottom:10,background:"rgba(139,94,60,0.07)",border:"1.5px solid rgba(139,94,60,0.2)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>🔄</span>
                <p style={{margin:0,fontSize:13,color:P.espresso}}>Регулярный: <b>{r.name}</b></p>
              </div>
              <span style={{fontSize:13,fontWeight:600,color:P.cognac}}>{fmt(r.amount)} ₽</span>
            </div>
          ))}
        </div>
      )}

      {forecast && (
        <div style={{borderRadius:20,padding:"13px 16px",marginBottom:14,
          background:forecast.onTrack?"rgba(122,158,126,0.09)":"rgba(196,122,122,0.08)",
          border:"1px solid "+(forecast.onTrack?"rgba(122,158,126,0.22)":"rgba(196,122,122,0.2)"),
          display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>{forecast.onTrack?"🎯":"⏱️"}</span>
          <div>
            <p style={{margin:0,fontSize:13,fontWeight:500,color:P.espresso}}>{forecast.onTrack?"Идёте в графике":"Нужно ускориться"}</p>
            <p style={{margin:"2px 0 0",fontSize:12,color:P.driftwood}}>
              {forecast.onTrack
                ? "Цель — "+RU_MO[forecast.forecastDate.getMonth()]+" "+forecast.forecastDate.getFullYear()
                : "Темп "+fmt(forecast.avg)+" ₽/мес"}
            </p>
          </div>
        </div>
      )}

      <div className="card-dark" style={{position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,background:"radial-gradient(circle,rgba(212,165,116,0.16) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <span style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"4px 10px",fontSize:11,fontWeight:500,color:"rgba(232,221,205,0.65)"}}>{goal.name||"Семейная цель"}</span>
          <button onClick={onGoalTab} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"5px 10px",fontSize:11,color:"rgba(232,221,205,0.55)",cursor:"pointer",fontFamily:"Inter"}}>Детали</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14,margin:"16px 0"}}>
          <div className="float-a" style={{flexShrink:0}}><LivingJar pct={pct}/></div>
          <div>
            <p style={{margin:"0 0 2px",fontSize:11,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(232,221,205,0.45)"}}>Отложено</p>
            <div className="fr" style={{fontSize:34,fontWeight:200,color:"#EDE5D8",letterSpacing:"-1.5px",lineHeight:1}}>{fmt(netSaved)}</div>
            <p style={{margin:"2px 0 0",fontSize:13,color:"rgba(232,221,205,0.32)"}}>из {fmt(goalAmount)} ₽</p>
          </div>
        </div>
        <div className="pt" style={{height:6,marginBottom:16}}><div className="pf" style={{width:pct+"%"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
          {[{l:"Осталось",v:fmtK(needed)+" ₽"},{l:"В месяц",v:fmtK(perMonth)+" ₽"},{l:"Дней",v:String(daysLeftVal)}].map(s => (
            <div key={s.l} style={{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"11px 8px",textAlign:"center"}}>
              <p style={{margin:"0 0 3px",fontSize:9,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:"rgba(184,168,152,0.55)"}}>{s.l}</p>
              <p className="fr" style={{margin:0,fontSize:15,fontWeight:300,color:"#EDE5D8"}}>{s.v}</p>
            </div>
          ))}
        </div>
        <button className="btn" onClick={onSav}>Пополнить копилку</button>
      </div>

      {comment.ok !== null && (
        <div className="card" style={{padding:"14px 18px",
          background:comment.ok?"rgba(122,158,126,0.09)":"rgba(196,122,122,0.08)",
          border:"1px solid "+(comment.ok?"rgba(122,158,126,0.22)":"rgba(196,122,122,0.2)")}}>
          <p style={{margin:0,fontSize:13,color:P.espresso,lineHeight:1.7,fontStyle:"italic"}}>{comment.ok?"✦ ":"· "}{comment.t}</p>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:4}}>
        {[{l:"Доходы",v:totalIncome,c:P.sage},{l:"Расходы",v:totalExpenses,c:P.rosewood},{l:"Остаток",v:balance,c:balance>=0?P.amber:P.rosewood}].map(x => (
          <div key={x.l} className="card-sm" style={{marginBottom:10,textAlign:"center"}}>
            <p style={{margin:"0 0 4px",fontSize:9,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:P.linen}}>{x.l}</p>
            <p className="fr" style={{margin:0,fontSize:18,fontWeight:300,color:x.c}}>{fmtK(x.v)}</p>
            <p style={{margin:0,fontSize:10,color:P.linen}}>₽</p>
          </div>
        ))}
      </div>

      {topCats.length>0 && (
        <div className="card">
          <p className="st">Куда уходят деньги</p>
          {topCats.map(([id,amt]) => {
            const c = getCat(id);
            const w = totalExp>0 ? Math.round((amt/totalExp)*100) : 0;
            return (
              <div key={id} style={{marginBottom:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
                  <span style={{fontSize:13,color:P.espresso,display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:18}}>{c?c.i:""}</span>{c?c.l:""}
                  </span>
                  <span style={{fontSize:12,color:P.driftwood,fontWeight:500}}>{fmt(amt)} <span style={{color:P.linen,fontWeight:400}}>· {w}%</span></span>
                </div>
                <div className="pt" style={{height:5}}>
                  <div style={{width:w+"%",height:"100%",borderRadius:999,background:"linear-gradient(90deg,"+P.rosewood+"70,"+P.rosewood+")",transition:"width 1s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.expenses.length>0 && (
        <div style={{marginBottom:8}}>
          <p className="st">Последние расходы</p>
          {data.expenses.slice(0,3).map(e => {
            const c = getCat(e.category);
            return (
              <div key={e.id} className="li">
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:40,height:40,borderRadius:14,background:"rgba(237,229,216,0.8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{c?c.i:""}</div>
                  <div>
                    <p style={{margin:0,fontWeight:500,fontSize:14,color:P.espresso}}>{c?c.l:""}</p>
                    <p style={{margin:"2px 0 0",fontSize:12,color:P.linen}}>{e.date}</p>
                  </div>
                </div>
                <span style={{fontWeight:600,color:P.rosewood,fontSize:15}}>-{fmt(e.amount)} <span style={{fontSize:11,fontWeight:400}}>₽</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReminderCard({r, onAction}) {
  const urgent = r.urgent || r.overdue;
  const text = r.overdue ? r.name+": "+r.type+" — уже пришла?"
    : r.daysUntil===0 ? "Сегодня "+r.name+" получает "+r.type
    : "Через "+r.daysUntil+" дн. — "+r.name+": "+r.type;
  return (
    <div style={{borderRadius:18,padding:"13px 16px",marginBottom:10,
      background:urgent?"rgba(196,122,122,0.08)":"rgba(196,149,106,0.08)",
      border:"1.5px solid "+(urgent?"rgba(196,122,122,0.3)":"rgba(196,149,106,0.28)"),
      display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>{r.overdue?"💭":r.daysUntil<=1?"🔔":"📅"}</span>
        <p style={{margin:0,fontSize:13,color:P.espresso,lineHeight:1.4}}>{text}</p>
      </div>
      <button onClick={onAction} style={{flexShrink:0,background:urgent?P.rosewood:P.amber,color:"#FAF7F2",border:"none",borderRadius:12,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Inter",whiteSpace:"nowrap"}}>Внести</button>
    </div>
  );
}

function AnalyticsScreen({data,totalIncome,totalExpenses,totalSaved,forecast,goalAmount}) {
  const [whatIf, setWhatIf] = useState(0);
  const monthly = {};
  const addM = (arr, key) => arr.forEach(x => {
    const d=new Date(x.date), k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    if (!monthly[k]) monthly[k]={month:RU_MO[d.getMonth()],income:0,expenses:0,savings:0};
    monthly[k][key] += x.amount;
  });
  addM(data.incomes,"income"); addM(data.expenses,"expenses"); addM(data.savings,"savings");
  const mData = Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v);
  const projData = [];
  if (forecast) {
    let acc = totalSaved;
    for (let i=0; i<Math.min(forecast.monthsNeeded,12); i++) {
      acc += forecast.avg;
      const d = new Date(); d.setMonth(d.getMonth()+i+1);
      projData.push({month:RU_MO[d.getMonth()],projected:Math.min(acc,goalAmount)});
    }
  }
  const catSpend = {};
  data.expenses.forEach(e => { catSpend[e.category]=(catSpend[e.category]||0)+e.amount; });
  const allCats = Object.entries(catSpend).sort((a,b)=>b[1]-a[1]);
  const ep = totalIncome>0 ? Math.round((totalExpenses/totalIncome)*100) : 0;
  const sp = totalIncome>0 ? Math.round((totalSaved/totalIncome)*100) : 0;
  const needed = Math.max(0, goalAmount-totalSaved);
  const base = Math.ceil(needed/12);
  const savedMonths = whatIf>0 && base>0 ? Math.max(0, Math.floor(needed/base)-Math.floor(needed/(base+whatIf))) : 0;

  const Tt = ({active,payload,label}) => {
    if (!active||!payload||!payload.length) return null;
    return (
      <div style={{background:"rgba(250,247,242,0.97)",border:"1px solid rgba(212,193,176,0.35)",borderRadius:14,padding:"10px 14px",fontSize:12,boxShadow:"0 8px 24px rgba(44,32,24,0.12)"}}>
        <p style={{margin:"0 0 6px",fontWeight:600,color:P.espresso}}>{label}</p>
        {payload.map(p => <p key={p.dataKey} style={{margin:"2px 0",color:p.color}}>{p.name}: {fmt(p.value)} ₽</p>)}
      </div>
    );
  };

  return (
    <div style={{padding:"36px 16px 0"}}>
      <p style={{margin:0,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:P.linen}}>Аналитика</p>
      <h1 className="fr" style={{margin:"4px 0 20px",fontSize:30,fontWeight:200,color:P.espresso,letterSpacing:"-0.6px",fontStyle:"italic"}}>Ваши финансы</h1>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[{l:"Расходы от дохода",v:ep+"%",c:ep>70?P.rosewood:P.sage,sub:ep>70?"Стоит сократить":"Хороший темп"},
          {l:"Накоплено от дохода",v:sp+"%",c:sp>=15?P.amber:P.driftwood,sub:sp>=15?"Отличный результат":"Можно больше"}].map(x => (
          <div key={x.l} className="card-sm" style={{marginBottom:0}}>
            <p style={{margin:"0 0 6px",fontSize:10,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:P.linen}}>{x.l}</p>
            <p className="fr" style={{margin:"0 0 2px",fontSize:32,fontWeight:200,color:x.c,letterSpacing:"-1px"}}>{x.v}</p>
            <p style={{margin:0,fontSize:11,color:P.linen,fontStyle:"italic"}}>{x.sub}</p>
          </div>
        ))}
      </div>

      {forecast && (
        <div className="card" style={{marginTop:14}}>
          <p className="st">Что если откладывать больше?</p>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {[0,2000,5000,10000].map(v => (
              <button key={v} onClick={()=>setWhatIf(v)} style={{padding:"8px 14px",borderRadius:12,
                border:"1.5px solid "+(whatIf===v?"rgba(196,149,106,0.5)":"rgba(184,168,152,0.25)"),
                background:whatIf===v?"rgba(196,149,106,0.1)":"rgba(237,229,216,0.4)",
                cursor:"pointer",fontSize:13,color:whatIf===v?P.cognac:P.driftwood,
                fontWeight:whatIf===v?500:400,fontFamily:"Inter"}}>
                {v===0?"Текущий":"+"+fmtK(v)+" ₽/мес"}
              </button>
            ))}
          </div>
          <div style={{background:whatIf>0?"rgba(122,158,126,0.09)":"rgba(237,229,216,0.4)",borderRadius:16,padding:"14px 16px"}}>
            {whatIf===0
              ? <p style={{margin:0,fontSize:13,color:P.driftwood}}>Цель — <b>{RU_MO[forecast.forecastDate.getMonth()]+" "+forecast.forecastDate.getFullYear()}</b> {forecast.onTrack?"✓":""}</p>
              : <p style={{margin:0,fontSize:13,color:P.sage}}>{"✦ При +"+fmt(whatIf)+" ₽/мес — на "}<b>{savedMonths+" мес. раньше"}</b></p>
            }
          </div>
        </div>
      )}

      {mData.length>0 ? (
        <>
          <div className="card">
            <p className="st">Доходы vs Расходы</p>
            <div style={{width:"100%",height:190}}>
              <ResponsiveContainer>
                <BarChart data={mData} barGap={3} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(184,168,152,0.18)" vertical={false}/>
                  <XAxis dataKey="month" tick={{fontSize:11,fill:P.linen}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:P.linen}} axisLine={false} tickLine={false} width={32}/>
                  <Tooltip content={<Tt/>}/>
                  <Bar dataKey="income" name="Доход" fill={P.sage} radius={[6,6,0,0]} opacity={0.85}/>
                  <Bar dataKey="expenses" name="Расходы" fill={P.rosewood} radius={[6,6,0,0]} opacity={0.75}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <p className="st">Накопления + прогноз</p>
            <div style={{width:"100%",height:160}}>
              <ResponsiveContainer>
                <LineChart data={[...mData,...projData]}>
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(184,168,152,0.18)" vertical={false}/>
                  <XAxis dataKey="month" tick={{fontSize:11,fill:P.linen}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:P.linen}} axisLine={false} tickLine={false} width={32}/>
                  <Tooltip content={<Tt/>}/>
                  <ReferenceLine y={goalAmount} stroke={P.amber} strokeDasharray="4 4" strokeWidth={1.5}/>
                  <Line dataKey="savings" name="Накоплено" stroke={P.amber} strokeWidth={2.5} dot={{fill:P.amber,r:4,strokeWidth:0}} connectNulls/>
                  <Line dataKey="projected" name="Прогноз" stroke={P.amber} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{textAlign:"center",padding:"40px 20px"}}>
          <p style={{margin:0,fontSize:14,color:P.linen,fontStyle:"italic"}}>Добавьте данные — и графики оживут</p>
        </div>
      )}

      {allCats.length>0 && (
        <div className="card">
          <p className="st">Все категории</p>
          {allCats.map(([id,amt]) => {
            const c = getCat(id);
            const w = totalExpenses>0 ? Math.round((amt/totalExpenses)*100) : 0;
            return (
              <div key={id} style={{marginBottom:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
                  <span style={{fontSize:13,color:P.espresso,display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:16}}>{c?c.i:""}</span>{c?c.l:""}
                  </span>
                  <span style={{fontSize:12,color:P.driftwood}}>{fmt(amt)} <span style={{color:P.linen}}>· {w}%</span></span>
                </div>
                <div className="pt" style={{height:4}}>
                  <div style={{width:w+"%",height:"100%",borderRadius:999,background:"linear-gradient(90deg,"+P.sand+","+P.amber+")",transition:"width 1s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryScreen({data,netSaved,goalAmount,onDelSav,onDelWith,onWithdraw,onRec,onApplyRec,onDelRec,onExport,onRepeatExp,onViewExp}) {
  const [activeTab, setActiveTab] = useState("expenses");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const totalSaved = data.savings.reduce((s,sv)=>s+sv.amount,0);
  const totalWith  = (data.withdrawals||[]).reduce((s,w)=>s+w.amount,0);
  const now = new Date();
  const thisM = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const lastM = now.getMonth()===0 ? (now.getFullYear()-1)+"-12" : now.getFullYear()+"-"+String(now.getMonth()).padStart(2,"0");
  const activeCats = [...new Set(data.expenses.map(e=>e.category))];
  const filterExp = arr => arr.filter(e => {
    const c=getCat(e.category), q=search.toLowerCase();
    const ms = !search||(e.comment||"").toLowerCase().includes(q)||String(e.amount).includes(search)||(c?c.l:"").toLowerCase().includes(q);
    const mc = filterCat==="all"||e.category===filterCat;
    const mp = filterPeriod==="all"||(filterPeriod==="this"&&e.date.startsWith(thisM))||(filterPeriod==="last"&&e.date.startsWith(lastM));
    return ms&&mc&&mp;
  });
  const filteredExp = filterExp(data.expenses);

  return (
    <div style={{padding:"36px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <p style={{margin:0,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:P.linen}}>История</p>
          <h1 className="fr" style={{margin:"4px 0 0",fontSize:30,fontWeight:200,color:P.espresso,letterSpacing:"-0.6px",fontStyle:"italic"}}>Операции</h1>
        </div>
        <button onClick={onExport} style={{background:"rgba(250,247,242,0.85)",border:"1px solid rgba(255,255,255,0.6)",borderRadius:14,padding:"8px 14px",fontSize:12,fontWeight:500,color:P.driftwood,cursor:"pointer",fontFamily:"Inter"}}>CSV</button>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p className="st" style={{margin:0}}>Регулярные платежи</p>
        <button onClick={onRec} style={{background:"none",border:"none",fontSize:13,color:P.amber,cursor:"pointer",fontFamily:"Inter",fontWeight:500}}>+ Добавить</button>
      </div>
      {(data.recurring||[]).length===0 ? (
        <div style={{borderRadius:18,padding:"14px 18px",marginBottom:14,background:"rgba(250,247,242,0.5)",border:"1px dashed rgba(184,168,152,0.4)",textAlign:"center"}}>
          <p style={{margin:0,fontSize:13,color:P.linen,fontStyle:"italic"}}>Аренда, подписки, кредит</p>
        </div>
      ) : (data.recurring||[]).map(r => (
        <div key={r.id} className="li" style={{cursor:"default"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:40,height:40,borderRadius:14,background:"rgba(139,94,60,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔄</div>
            <div>
              <p style={{margin:0,fontWeight:500,fontSize:14,color:P.espresso}}>{r.name}</p>
              <p style={{margin:"2px 0 0",fontSize:12,color:P.linen}}>{(getCat(r.category)||{l:""}).l} · {r.dayOfMonth}-го</p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="fr" style={{fontWeight:300,color:P.cognac,fontSize:16}}>{fmt(r.amount)} ₽</span>
            <button onClick={()=>onApplyRec(r)} style={{background:P.amber,color:"#FAF7F2",border:"none",borderRadius:10,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"Inter"}}>ok</button>
            <button onClick={()=>onDelRec(r.id)} style={{background:"none",border:"none",cursor:"pointer",color:P.sand,fontSize:20,padding:0}}>x</button>
          </div>
        </div>
      ))}

      <div className="tg" style={{marginBottom:14}}>
        {[{v:"expenses",l:"Расходы"},{v:"incomes",l:"Доходы"},{v:"savings",l:"Копилка"}].map(t => (
          <button key={t.v} className={"tgb"+(activeTab===t.v?" on":"")} onClick={()=>setActiveTab(t.v)}>{t.l}</button>
        ))}
      </div>

      {activeTab==="expenses" && (
        <>
          <div style={{position:"relative",marginBottom:10}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:P.linen,pointerEvents:"none"}}>🔍</span>
            <input className="sb" placeholder="Поиск" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,marginBottom:10}}>
            {[{v:"all",l:"Все"},...activeCats.slice(0,8).map(id=>{const c=getCat(id);return{v:id,l:c?c.i+" "+c.l:id};})].map(f => (
              <button key={f.v} onClick={()=>setFilterCat(f.v)} style={{flexShrink:0,padding:"6px 12px",borderRadius:10,border:"1px solid "+(filterCat===f.v?"rgba(196,149,106,0.45)":"rgba(184,168,152,0.22)"),background:filterCat===f.v?"rgba(196,149,106,0.1)":"rgba(237,229,216,0.4)",fontSize:12,color:filterCat===f.v?P.cognac:P.driftwood,cursor:"pointer",fontFamily:"Inter",fontWeight:filterCat===f.v?500:400}}>{f.l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {[{v:"all",l:"Всё время"},{v:"this",l:"Этот месяц"},{v:"last",l:"Прошлый"}].map(f => (
              <button key={f.v} onClick={()=>setFilterPeriod(f.v)} style={{padding:"6px 12px",borderRadius:10,border:"1px solid "+(filterPeriod===f.v?"rgba(196,149,106,0.45)":"rgba(184,168,152,0.22)"),background:filterPeriod===f.v?"rgba(196,149,106,0.1)":"rgba(237,229,216,0.4)",fontSize:12,color:filterPeriod===f.v?P.cognac:P.driftwood,cursor:"pointer",fontFamily:"Inter",fontWeight:filterPeriod===f.v?500:400}}>{f.l}</button>
            ))}
          </div>
          {filteredExp.length===0 ? <EmptyState text="Ничего не найдено"/> : filteredExp.map(e => {
            const c = getCat(e.category);
            return (
              <div key={e.id} className="li" onClick={()=>onViewExp&&onViewExp(e)}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:40,height:40,borderRadius:14,background:"rgba(237,229,216,0.8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{c?c.i:""}</div>
                  <div>
                    <p style={{margin:0,fontWeight:500,fontSize:14,color:P.espresso}}>{c?c.l:""}</p>
                    <p style={{margin:"2px 0 0",fontSize:12,color:P.linen}}>{e.date}{e.comment?" · "+e.comment.slice(0,20):""}{e.photo?" 📷":""}</p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:600,color:P.rosewood,fontSize:14}}>-{fmt(e.amount)} ₽</span>
                  <button onClick={ev=>{ev.stopPropagation();onRepeatExp(e);}} style={{background:"rgba(196,149,106,0.12)",border:"none",borderRadius:8,padding:"4px 8px",fontSize:11,color:P.cognac,cursor:"pointer",fontFamily:"Inter",fontWeight:500}}>+1</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {activeTab==="incomes" && (data.incomes.length===0 ? <EmptyState text="Доходов пока нет"/> : data.incomes.map(i => (
        <div key={i.id} className="li" style={{cursor:"default"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:40,height:40,borderRadius:14,background:"rgba(122,158,126,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600,color:P.sage}}>{i.who==="me"?"М":"Н"}</div>
            <div>
              <p style={{margin:0,fontWeight:500,fontSize:14,color:P.espresso}}>{i.who==="me"?"Максим":"Настя"} · {i.label}</p>
              <p style={{margin:"2px 0 0",fontSize:12,color:P.linen}}>{i.date}{i.note?" · "+i.note:""}</p>
            </div>
          </div>
          <span style={{fontWeight:600,color:P.sage,fontSize:14}}>+{fmt(i.amount)} ₽</span>
        </div>
      )))}

      {activeTab==="savings" && (
        <>
          {data.savings.length===0 ? <EmptyState text="Взносов пока нет"/> : data.savings.map(s => (
            <div key={s.id} className="li" style={{cursor:"default"}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:40,height:40,borderRadius:14,background:"rgba(196,149,106,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>✦</div>
                <div>
                  <p style={{margin:0,fontWeight:500,fontSize:14,color:P.espresso}}>Пополнение</p>
                  <p style={{margin:"2px 0 0",fontSize:12,color:P.linen}}>{s.date}{s.note?" · "+s.note:""}</p>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span className="fr" style={{fontWeight:300,color:P.amber,fontSize:16}}>+{fmt(s.amount)} ₽</span>
                <button onClick={()=>onDelSav(s.id)} style={{background:"none",border:"none",cursor:"pointer",color:P.sand,fontSize:18,padding:0}}>x</button>
              </div>
            </div>
          ))}
          {(data.withdrawals||[]).map(w => (
            <div key={w.id} className="li" style={{cursor:"default"}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:40,height:40,borderRadius:14,background:"rgba(196,122,122,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>↩</div>
                <div>
                  <p style={{margin:0,fontWeight:500,fontSize:14,color:P.espresso}}>Изъятие</p>
                  <p style={{margin:"2px 0 0",fontSize:12,color:P.linen}}>{w.date}{w.reason?" · "+w.reason:""}</p>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span className="fr" style={{fontWeight:300,color:P.rosewood,fontSize:16}}>-{fmt(w.amount)} ₽</span>
                <button onClick={()=>onDelWith(w.id)} style={{background:"none",border:"none",cursor:"pointer",color:P.sand,fontSize:18,padding:0}}>x</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function WeScreen({data, totalIncome, netSaved, onDelInc, onFAQ, onGoalTab}) {
  const myIncome  = data.incomes.filter(i=>i.who==="me").reduce((s,i)=>s+i.amount,0);
  const herIncome = data.incomes.filter(i=>i.who==="her").reduce((s,i)=>s+i.amount,0);
  const myPct = totalIncome>0 ? Math.round((myIncome/totalIncome)*100) : 50;
  const now = new Date();
  const sched = SCHEDULE.map(s => {
    const added = data.incomes.some(i => {
      const d = new Date(i.date);
      return i.who===s.who && i.label===s.type && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    });
    return {...s, added};
  });

  return (
    <div style={{padding:"36px 16px 0"}}>
      <p style={{margin:0,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:P.linen}}>Команда</p>
      <h1 className="fr" style={{margin:"4px 0 20px",fontSize:30,fontWeight:200,color:P.espresso,letterSpacing:"-0.6px",fontStyle:"italic"}}>Мы вместе</h1>

      <div className="card-dark" style={{padding:"22px 20px"}}>
        <div style={{display:"flex",gap:14,marginBottom:18}}>
          {[{name:"Максим",who:"me",income:myIncome,pct:myPct,init:"М"},{name:"Настя",who:"her",income:herIncome,pct:100-myPct,init:"Н"}].map(x => (
            <div key={x.who} style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:18,padding:"14px 12px",textAlign:"center"}}>
              <div style={{width:44,height:44,borderRadius:"50%",margin:"0 auto 8px",background:"linear-gradient(135deg,"+P.honey+"60,"+P.amber+"80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:600,color:"#FAF7F2",border:"2px solid rgba(255,255,255,0.12)"}}>{x.init}</div>
              <p style={{margin:"0 0 2px",fontSize:13,fontWeight:500,color:"#EDE5D8"}}>{x.name}</p>
              <p className="fr" style={{margin:"0 0 6px",fontSize:20,fontWeight:200,color:P.honey}}>{fmtK(x.income)} ₽</p>
              <div style={{background:"rgba(255,255,255,0.08)",borderRadius:999,height:4}}>
                <div style={{width:x.pct+"%",height:"100%",borderRadius:999,background:"linear-gradient(90deg,"+P.honey+","+P.amber+")",transition:"width 1s ease"}}/>
              </div>
              <p style={{margin:"4px 0 0",fontSize:10,color:"rgba(184,168,152,0.5)"}}>{x.pct}% от общего</p>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"12px",textAlign:"center"}}>
          <p style={{margin:"0 0 2px",fontSize:10,fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase",color:"rgba(184,168,152,0.5)"}}>Вместе отложено</p>
          <p className="fr" style={{margin:0,fontSize:26,fontWeight:200,color:"#EDE5D8",letterSpacing:"-0.8px"}}>{fmt(netSaved)} ₽</p>
        </div>
      </div>

      <div className="card">
        <p className="st">Зарплатный график · {RU_MO[now.getMonth()]}</p>
        {sched.map((s,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:i<sched.length-1?"1px solid rgba(184,168,152,0.12)":"none"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:32,height:32,borderRadius:10,background:s.added?"rgba(122,158,126,0.15)":"rgba(184,168,152,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{s.added?"✓":"○"}</div>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:500,color:P.espresso}}>{s.name} · {s.type}</p>
                <p style={{margin:"1px 0 0",fontSize:11,color:P.linen}}>{s.label}</p>
              </div>
            </div>
            <span style={{fontSize:12,fontWeight:500,color:s.added?P.sage:P.linen}}>{s.added?"Внесено":"Ждём"}</span>
          </div>
        ))}
      </div>

      {data.incomes.length>0 && (
        <div className="card">
          <p className="st">Все поступления</p>
          {data.incomes.map(i => (
            <div key={i.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(184,168,152,0.1)"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,"+P.honey+"30,"+P.amber+"30)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:P.cognac}}>{i.who==="me"?"М":"Н"}</div>
                <div>
                  <p style={{margin:0,fontSize:13,fontWeight:500,color:P.espresso}}>{i.who==="me"?"Максим":"Настя"} · {i.label}</p>
                  <p style={{margin:0,fontSize:11,color:P.linen}}>{i.date}{i.note?" · "+i.note:""}</p>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:500,color:P.sage}}>+{fmt(i.amount)}</span>
                <button onClick={()=>onDelInc(i.id)} style={{background:"none",border:"none",cursor:"pointer",color:P.sand,fontSize:18,padding:0}}>x</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
        <button onClick={onGoalTab} style={{padding:"14px 12px",borderRadius:20,background:"linear-gradient(135deg,"+P.honey+"30,"+P.amber+"20)",border:"1.5px solid rgba(196,149,106,0.3)",cursor:"pointer",fontFamily:"Inter",textAlign:"left"}}>
          <div style={{fontSize:20,marginBottom:4}}>🎯</div>
          <p style={{margin:0,fontSize:13,fontWeight:600,color:P.cognac}}>Наша цель</p>
          <p style={{margin:0,fontSize:11,color:P.linen}}>Прогресс и настройки</p>
        </button>
        <button onClick={onFAQ} style={{padding:"14px 12px",borderRadius:20,background:"rgba(250,247,242,0.78)",border:"1px solid rgba(255,255,255,0.55)",cursor:"pointer",fontFamily:"Inter",textAlign:"left",boxShadow:"0 4px 14px rgba(44,32,24,0.05)"}}>
          <div style={{fontSize:20,marginBottom:4}}>📖</div>
          <p style={{margin:0,fontSize:13,fontWeight:600,color:P.espresso}}>Справка</p>
          <p style={{margin:0,fontSize:11,color:P.linen}}>Фичи и FAQ</p>
        </button>
      </div>
      <div style={{height:8}}/>
    </div>
  );
}

function GoalScreen({data,netSaved,goalAmount,pct,goal,forecast,perMonth,daysLeftVal,needed,shownM,onEditGoal,onSav,onWithdraw}) {
  const totalSaved = data.savings.reduce((s,sv)=>s+sv.amount,0);
  const totalWith  = (data.withdrawals||[]).reduce((s,w)=>s+w.amount,0);
  const nextM = [10,20,30,40,50,60,70,80,90,100].find(m=>m>pct) || 100;
  const toNext = Math.max(0, (nextM/100*goalAmount) - netSaved);
  const progressInTier = pct < 100 ? ((pct % 10) / 10) * 100 : 100;

  return (
    <div style={{padding:"36px 16px 0"}}>
      <p style={{margin:0,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:P.linen}}>Накопления</p>
      <h1 className="fr" style={{margin:"4px 0 20px",fontSize:30,fontWeight:200,color:P.espresso,letterSpacing:"-0.6px",fontStyle:"italic"}}>{goal.name||"Семейная цель"}</h1>

      <div className="card-dark" style={{textAlign:"center",padding:"28px 22px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,background:"radial-gradient(circle,rgba(212,165,116,0.2) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <LivingJar pct={pct}/>
        </div>
        <p className="fr" style={{margin:"0 0 4px",fontSize:42,fontWeight:200,color:"#EDE5D8",letterSpacing:"-1.5px"}}>{fmt(netSaved)} ₽</p>
        <p style={{margin:"0 0 20px",fontSize:13,color:"rgba(184,168,152,0.5)"}}>из {fmt(goalAmount)} ₽ · {Math.round(pct)}%</p>
        <div className="pt" style={{height:7,marginBottom:20}}><div className="pf" style={{width:pct+"%"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
          {[{l:"Осталось",v:fmt(needed)+" ₽"},{l:"В месяц",v:fmt(perMonth)+" ₽"},{l:"Дней",v:String(daysLeftVal)}].map(s => (
            <div key={s.l} style={{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"11px 8px",textAlign:"center"}}>
              <p style={{margin:"0 0 3px",fontSize:9,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:"rgba(184,168,152,0.55)"}}>{s.l}</p>
              <p className="fr" style={{margin:0,fontSize:14,fontWeight:300,color:"#EDE5D8"}}>{s.v}</p>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button className="btn" onClick={onSav} style={{borderRadius:16}}>Пополнить</button>
          <button onClick={onWithdraw} style={{background:"rgba(196,122,122,0.15)",border:"1.5px solid rgba(196,122,122,0.3)",borderRadius:16,padding:"15px",fontSize:14,fontWeight:600,color:"#C47A7A",cursor:"pointer",fontFamily:"Inter"}}>Взять</button>
        </div>
      </div>

      {pct < 100 && (
        <div className="card" style={{padding:"16px 18px"}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:P.linen}}>До следующей вехи — {nextM}%</p>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:22}}>{MILESTONES[nextM]?.emoji}</span>
            <span className="fr" style={{fontSize:22,fontWeight:200,color:P.amber}}>{fmt(toNext)} ₽</span>
          </div>
          <div className="pt" style={{height:5}}>
            <div style={{width:progressInTier+"%",height:"100%",borderRadius:999,background:"linear-gradient(90deg,"+P.honey+","+P.amber+")",transition:"width 1s ease"}}/>
          </div>
          <p style={{margin:"6px 0 0",fontSize:12,color:P.linen,fontStyle:"italic"}}>{MILESTONES[nextM]?.title}</p>
        </div>
      )}

      {forecast && (
        <div className="card" style={{padding:"16px 18px",background:forecast.onTrack?"rgba(122,158,126,0.09)":"rgba(196,122,122,0.08)",border:"1px solid "+(forecast.onTrack?"rgba(122,158,126,0.22)":"rgba(196,122,122,0.2)")}}>
          <p style={{margin:"0 0 4px",fontSize:11,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:P.linen}}>Прогноз</p>
          <p className="fr" style={{margin:"0 0 4px",fontSize:22,fontWeight:300,color:forecast.onTrack?P.sage:P.rosewood}}>{RU_MO[forecast.forecastDate.getMonth()]} {forecast.forecastDate.getFullYear()}</p>
          <p style={{margin:0,fontSize:13,color:P.driftwood}}>Средний взнос {fmt(forecast.avg)} ₽/мес · {forecast.onTrack?"Успеваете ✓":"Нужно ускориться"}</p>
        </div>
      )}

      <div className="card">
        <p className="st">Статистика копилки</p>
        {[{l:"Всего внесено",v:"+"+fmt(totalSaved)+" ₽",c:P.amber},
          {l:"Изъято",v:"-"+fmt(totalWith)+" ₽",c:totalWith>0?P.rosewood:P.linen},
          {l:"Чистый остаток",v:fmt(netSaved)+" ₽",c:P.espresso},
          {l:"Дедлайн",v:goal.deadline,c:P.driftwood}].map((r,i,arr) => (
          <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<arr.length-1?"1px solid rgba(184,168,152,0.12)":"none"}}>
            <span style={{fontSize:13,color:P.driftwood}}>{r.l}</span>
            <span className="fr" style={{fontSize:16,fontWeight:300,color:r.c}}>{r.v}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="st">Этапы пути</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {[10,20,30,40,50,60,70,80,90,100].map(m => {
            const done = pct >= m;
            return (
              <div key={m} style={{textAlign:"center",padding:"10px 4px",borderRadius:14,
                background:done?"rgba(196,149,106,0.12)":"rgba(237,229,216,0.4)",
                border:"1px solid "+(done?"rgba(196,149,106,0.3)":"rgba(184,168,152,0.15)")}}>
                <div style={{fontSize:18,marginBottom:2,opacity:done?1:0.35}}>{MILESTONES[m]?.emoji}</div>
                <p style={{margin:0,fontSize:11,fontWeight:600,color:done?P.amber:P.linen}}>{m}%</p>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={onEditGoal} style={{width:"100%",background:"rgba(250,247,242,0.82)",border:"1px solid rgba(255,255,255,0.6)",borderRadius:20,padding:"16px 18px",marginBottom:20,cursor:"pointer",textAlign:"left",fontFamily:"Inter",boxShadow:"0 8px 24px rgba(44,32,24,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <p style={{margin:"0 0 2px",fontSize:13,fontWeight:600,color:P.espresso}}>Изменить цель</p>
          <p style={{margin:0,fontSize:12,color:P.linen}}>{goal.name} · {fmt(goalAmount)} ₽</p>
        </div>
        <span style={{fontSize:20,color:P.amber}}>✎</span>
      </button>
      <div style={{height:8}}/>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function RecapModal({recap, onClose}) {
  const diff = recap.prevExp>0 ? Math.round(((recap.exp-recap.prevExp)/recap.prevExp)*100) : null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,18,8,0.55)",backdropFilter:"blur(12px)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:24,animation:"fadeIn 0.3s ease"}}>
      <div style={{background:"linear-gradient(160deg,#F5F0E8,#EDE5D8)",borderRadius:32,padding:"32px 28px",width:"100%",maxWidth:380,boxShadow:"0 32px 80px rgba(44,32,24,0.2)"}}>
        <p style={{margin:"0 0 4px",fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:P.linen}}>{recap.month} — итоги</p>
        <h2 className="fr" style={{margin:"0 0 24px",fontSize:28,fontWeight:200,color:P.espresso,fontStyle:"italic",letterSpacing:"-0.5px"}}>Месяц в цифрах ✦</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[{l:"Доход",v:"+"+fmt(recap.inc)+" ₽",c:P.sage},{l:"Расходы",v:"-"+fmt(recap.exp)+" ₽",c:P.rosewood},{l:"В копилку",v:"+"+fmt(recap.sav)+" ₽",c:P.amber},{l:"Топ трата",v:recap.topCat,c:P.driftwood}].map(x => (
            <div key={x.l} style={{background:"rgba(255,255,255,0.6)",borderRadius:18,padding:"14px 12px"}}>
              <p style={{margin:"0 0 4px",fontSize:10,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",color:P.linen}}>{x.l}</p>
              <p className="fr" style={{margin:0,fontSize:16,fontWeight:300,color:x.c,lineHeight:1.2}}>{x.v}</p>
            </div>
          ))}
        </div>
        {diff !== null && (
          <div style={{background:diff>0?"rgba(196,122,122,0.08)":"rgba(122,158,126,0.08)",border:"1px solid "+(diff>0?"rgba(196,122,122,0.2)":"rgba(122,158,126,0.2)"),borderRadius:16,padding:"12px 14px",marginBottom:20}}>
            <p style={{margin:0,fontSize:13,color:diff>0?P.rosewood:P.sage,fontStyle:"italic"}}>
              {diff>0 ? "Расходы выросли на "+diff+"% vs прошлого месяца" : "Расходы снизились на "+Math.abs(diff)+"% — отличная работа"}
            </p>
          </div>
        )}
        <button className="btn" onClick={onClose}>Понятно ✦</button>
      </div>
    </div>
  );
}

// ─── SHEETS ───────────────────────────────────────────────────────────────────
function Sheet({title, onClose, children}) {
  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet">
        <div className="handle"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h2 className="fr" style={{margin:0,fontSize:24,fontWeight:200,color:P.espresso,letterSpacing:"-0.5px",fontStyle:"italic"}}>{title}</h2>
          <button onClick={onClose} style={{background:"rgba(237,229,216,0.7)",border:"none",width:32,height:32,borderRadius:10,cursor:"pointer",fontSize:15,color:P.driftwood,fontFamily:"Inter"}}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Fld({label, children}) { return <div style={{marginBottom:18}}><label className="fl">{label}</label>{children}</div>; }
function EmptyState({text}) { return <div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:26,marginBottom:12,opacity:0.28}}>✦</div><p style={{fontSize:14,color:P.linen,fontStyle:"italic"}}>{text}</p></div>; }

function SavingSheet({onSave, onClose}) {
  const [amount,setAmount]=useState(""); const [date,setDate]=useState(today()); const [note,setNote]=useState("");
  const save=()=>{const n=Number(amount);if(!n||n<=0)return;onSave({id:Date.now(),amount:n,date,note});};
  return (
    <Sheet title="Пополнить копилку" onClose={onClose}>
      <Fld label="Сумма"><input className="inp inp-xl" type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Fld label="Дата"><input className="inp" type="date" value={date} onChange={e=>setDate(e.target.value)}/></Fld>
        <Fld label="Заметка"><input className="inp" type="text" placeholder="необязательно" value={note} onChange={e=>setNote(e.target.value)}/></Fld>
      </div>
      <div style={{background:"rgba(196,149,106,0.07)",borderRadius:16,padding:"12px 16px",marginBottom:20,border:"1px solid rgba(196,149,106,0.15)"}}>
        <p style={{margin:0,fontSize:13,color:P.cognac,fontStyle:"italic"}}>Каждая сумма двигает цель ближе</p>
      </div>
      <button className="btn" onClick={save}>Добавить в копилку</button>
    </Sheet>
  );
}

function WithdrawSheet({onSave, onClose, maxAmount}) {
  const [amount,setAmount]=useState(""); const [date,setDate]=useState(today()); const [reason,setReason]=useState("");
  const n=Number(amount); const tooMuch=n>maxAmount&&maxAmount>0;
  const save=()=>{if(!n||n<=0||tooMuch)return;onSave({id:Date.now(),amount:n,date,reason});};
  return (
    <Sheet title="Взять из копилки" onClose={onClose}>
      <div style={{background:"rgba(196,122,122,0.07)",borderRadius:16,padding:"13px 16px",marginBottom:20,border:"1px solid rgba(196,122,122,0.18)"}}>
        <p style={{margin:0,fontSize:13,color:P.rosewood,fontStyle:"italic"}}>Доступно: {fmt(maxAmount)} ₽</p>
      </div>
      <Fld label="Сумма">
        <input className="inp inp-xl" type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} style={{borderColor:tooMuch?"rgba(196,122,122,0.5)":undefined}}/>
        {tooMuch && <p style={{margin:"6px 0 0",fontSize:12,color:P.rosewood}}>Больше чем есть в копилке</p>}
      </Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Fld label="Дата"><input className="inp" type="date" value={date} onChange={e=>setDate(e.target.value)}/></Fld>
        <Fld label="Причина"><input className="inp" type="text" placeholder="необязательно" value={reason} onChange={e=>setReason(e.target.value)}/></Fld>
      </div>
      <button className="btn" onClick={save} style={{background:"linear-gradient(135deg,"+P.rosewood+"cc,"+P.rosewood+")",opacity:tooMuch?0.5:1}}>Взять из копилки</button>
    </Sheet>
  );
}

function RecurringSheet({onSave, onClose}) {
  const [name,setName]=useState(""); const [c,setC]=useState("rent"); const [amount,setAmount]=useState(""); const [day,setDay]=useState(1);
  const save=()=>{const n=Number(amount);if(!n||n<=0||!name)return;onSave({id:Date.now(),name,category:c,amount:n,dayOfMonth:Number(day)});};
  return (
    <Sheet title="Регулярный платёж" onClose={onClose}>
      <Fld label="Название"><input className="inp" type="text" placeholder="Аренда квартиры" value={name} onChange={e=>setName(e.target.value)}/></Fld>
      <Fld label="Категория"><select className="inp" value={c} onChange={e=>setC(e.target.value)}>{CATS.map(x=><option key={x.id} value={x.id}>{x.i+" "+x.l}</option>)}</select></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Fld label="Сумма"><input className="inp" type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></Fld>
        <Fld label="День"><select className="inp" value={day} onChange={e=>setDay(e.target.value)}>{Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>{d+"-е"}</option>)}</select></Fld>
      </div>
      <button className="btn" onClick={save} style={{background:"linear-gradient(135deg,"+P.cognac+","+P.amber+")"}}>Добавить платёж</button>
    </Sheet>
  );
}

function IncomeSheet({onSave, onClose, prefill, defaultWho}) {
  const [who,setWho]=useState((prefill&&prefill.who)||defaultWho||"me");
  const [amount,setAmount]=useState(String((prefill&&prefill.prefillAmount)||""));
  const [label,setLabel]=useState((prefill&&(prefill.type||prefill.prefillLabel))||"Зарплата");
  const [date,setDate]=useState(today()); const [note,setNote]=useState("");
  const save=()=>{const n=Number(amount);if(!n||n<=0)return;onSave({id:Date.now(),who,amount:n,label,date,note});};
  return (
    <Sheet title="Новый доход" onClose={onClose}>
      {prefill&&prefill.name&&<div style={{background:"rgba(196,149,106,0.08)",borderRadius:16,padding:"12px 16px",marginBottom:20,border:"1px solid rgba(196,149,106,0.2)"}}><p style={{margin:0,fontSize:13,color:P.cognac}}>{"📅 "+prefill.name+" · "+prefill.type}</p></div>}
      <Fld label="Чей доход">
        <div className="tg">{[{v:"me",l:"Максим"},{v:"her",l:"Настя"}].map(o=><button key={o.v} className={"tgb"+(who===o.v?" on":"")} onClick={()=>setWho(o.v)}>{o.l}</button>)}</div>
      </Fld>
      <Fld label="Сумма"><input className="inp inp-xl" type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></Fld>
      <Fld label="Тип"><select className="inp" value={label} onChange={e=>setLabel(e.target.value)}>{["Зарплата","Оклад (ЗП)","Аванс","Аванс + Премия","Фриланс","Кэшбэк","Прочий доход"].map(l=><option key={l}>{l}</option>)}</select></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Fld label="Дата"><input className="inp" type="date" value={date} onChange={e=>setDate(e.target.value)}/></Fld>
        <Fld label="Заметка"><input className="inp" type="text" placeholder="необязательно" value={note} onChange={e=>setNote(e.target.value)}/></Fld>
      </div>
      <button className="btn" onClick={save} style={{background:"linear-gradient(135deg,"+P.sage+",#5a8a5e)"}}>Сохранить доход</button>
    </Sheet>
  );
}

function ExpenseSheet({onSave, onClose, defaultCat, defaultAmt, prefill}) {
  const [c,setC]=useState((prefill&&prefill.category)||defaultCat||CATS[0].id);
  const [amount,setAmount]=useState(String((prefill&&prefill.amount)||defaultAmt||""));
  const [comment,setComment]=useState((prefill&&prefill.comment)||"");
  const [date,setDate]=useState(today()); const [photo,setPhoto]=useState(null);
  const ref=useRef();
  const handlePhoto=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(f);};
  const save=()=>{const n=Number(amount);if(!n||n<=0)return;onSave({id:Date.now(),category:c,amount:n,comment,date,photo});};
  return (
    <Sheet title={prefill?"Повторить расход":"Новый расход"} onClose={onClose}>
      <Fld label="Категория">
        <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:6,marginBottom:10}}>
          {CATS.slice(0,7).map(x=>(
            <button key={x.id} onClick={()=>setC(x.id)} style={{flexShrink:0,padding:"8px 12px",borderRadius:14,border:"1.5px solid "+(c===x.id?"rgba(196,149,106,0.5)":"rgba(184,168,152,0.22)"),background:c===x.id?"rgba(196,149,106,0.1)":"rgba(237,229,216,0.4)",cursor:"pointer",fontSize:13,color:c===x.id?P.cognac:P.driftwood,fontWeight:c===x.id?500:400,display:"flex",alignItems:"center",gap:5,fontFamily:"Inter"}}>
              <span>{x.i}</span><span>{x.l}</span>
            </button>
          ))}
        </div>
        <select className="inp" value={c} onChange={e=>setC(e.target.value)}>{CATS.map(x=><option key={x.id} value={x.id}>{x.i+" "+x.l}</option>)}</select>
      </Fld>
      <Fld label="Сумма"><input className="inp inp-xl" type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Fld label="Дата"><input className="inp" type="date" value={date} onChange={e=>setDate(e.target.value)}/></Fld>
        <Fld label="Комментарий"><input className="inp" type="text" placeholder="необязательно" value={comment} onChange={e=>setComment(e.target.value)}/></Fld>
      </div>
      <Fld label="Фото">
        <input type="file" accept="image/*" ref={ref} onChange={handlePhoto} style={{display:"none"}}/>
        <button className="btn-g" onClick={()=>ref.current.click()} style={{width:"100%",textAlign:"left"}}>{photo?"Фото добавлено":"Прикрепить фото"}</button>
        {photo&&<img src={photo} alt="" style={{marginTop:10,width:"100%",maxHeight:160,objectFit:"cover",borderRadius:16}}/>}
      </Fld>
      <button className="btn" onClick={save} style={{background:"linear-gradient(135deg,"+P.rosewood+"cc,"+P.rosewood+")"}}>Сохранить расход</button>
    </Sheet>
  );
}

function ExpDetailSheet({exp, onDelete, onClose, onRepeat}) {
  const c = getCat(exp.category);
  return (
    <Sheet title="Детали расхода" onClose={onClose}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{width:72,height:72,borderRadius:24,background:"rgba(237,229,216,0.8)",margin:"0 auto 12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>{c?c.i:""}</div>
        <p className="fr" style={{margin:0,fontSize:36,fontWeight:200,color:P.rosewood,letterSpacing:"-1px"}}>-{fmt(exp.amount)} ₽</p>
        <p style={{margin:"4px 0 0",fontSize:13,color:P.linen}}>{c?c.l:""} · {exp.date}</p>
      </div>
      {exp.comment && <div style={{background:"rgba(237,229,216,0.5)",borderRadius:16,padding:"14px 16px",marginBottom:16}}><p style={{margin:0,fontSize:14,color:P.espresso,lineHeight:1.6,fontStyle:"italic"}}>"{exp.comment}"</p></div>}
      {exp.photo && <img src={exp.photo} alt="" style={{width:"100%",borderRadius:20,marginBottom:16,maxHeight:220,objectFit:"cover"}}/>}
      <button onClick={()=>onRepeat(exp)} style={{width:"100%",background:"rgba(196,149,106,0.1)",border:"1.5px solid rgba(196,149,106,0.25)",color:P.cognac,borderRadius:16,padding:"13px",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"Inter",marginBottom:10}}>Повторить расход</button>
      <button className="btn-d" onClick={()=>onDelete(exp.id)}>Удалить расход</button>
    </Sheet>
  );
}

function GoalSheet({onSave, onClose, current}) {
  const [name,setName]=useState(current.name||"Семейная цель");
  const [amount,setAmount]=useState(String(current.amount||500000));
  const [deadline,setDeadline]=useState(current.deadline||"2026-12-31");
  const [preset,setPreset]=useState(null);
  const pickPreset=p=>{setPreset(p.label);if(p.amount>0){setAmount(String(p.amount));setName(p.label);}};
  const save=()=>{const n=Number(amount);if(!n||n<=0)return;onSave({amount:n,name:name||"Семейная цель",deadline});};
  return (
    <Sheet title="Настроить цель" onClose={onClose}>
      <div style={{background:"rgba(196,149,106,0.07)",borderRadius:18,padding:"14px 16px",marginBottom:20,border:"1px solid rgba(196,149,106,0.18)"}}>
        <p style={{margin:0,fontSize:13,color:P.cognac,lineHeight:1.6,fontStyle:"italic"}}>✦ Смена цели сбрасывает milestone-экраны</p>
      </div>
      <p className="fl">Быстрый выбор</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {GOAL_PRESETS.map(p=>(
          <button key={p.label} onClick={()=>pickPreset(p)} style={{padding:"12px 10px",borderRadius:16,border:"1.5px solid "+(preset===p.label?"rgba(196,149,106,0.55)":"rgba(184,168,152,0.22)"),background:preset===p.label?"rgba(196,149,106,0.1)":"rgba(237,229,216,0.4)",cursor:"pointer",textAlign:"left",fontFamily:"Inter",transition:"all 0.18s"}}>
            <div style={{fontSize:20,marginBottom:4}}>{p.emoji}</div>
            <p style={{margin:"0 0 2px",fontSize:12,fontWeight:500,color:preset===p.label?P.cognac:P.espresso}}>{p.label}</p>
            {p.amount>0&&<p style={{margin:0,fontSize:11,color:P.linen}}>{fmt(p.amount)} ₽</p>}
          </button>
        ))}
      </div>
      <Fld label="Название цели"><input className="inp" type="text" placeholder="Квартира у моря" value={name} onChange={e=>setName(e.target.value)}/></Fld>
      <Fld label="Сумма (₽)"><input className="inp inp-xl" type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></Fld>
      <Fld label="Дедлайн"><input className="inp" type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></Fld>
      <div style={{background:"rgba(237,229,216,0.5)",borderRadius:16,padding:"13px 16px",marginBottom:20}}>
        <p style={{margin:0,fontSize:13,color:P.driftwood}}><b>{name||"Цель"}</b> — {fmt(Number(amount)||0)} ₽ до {deadline}</p>
      </div>
      <button className="btn" onClick={save}>Сохранить цель ✦</button>
    </Sheet>
  );
}

function FAQSheet({onClose, onEditGoal}) {
  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet">
        <div className="handle"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 className="fr" style={{margin:0,fontSize:24,fontWeight:200,color:P.espresso,fontStyle:"italic"}}>Справка</h2>
          <button onClick={onClose} style={{background:"rgba(237,229,216,0.7)",border:"none",width:32,height:32,borderRadius:10,cursor:"pointer",fontSize:15,color:P.driftwood,fontFamily:"Inter"}}>x</button>
        </div>
        <button onClick={()=>{onClose();onEditGoal();}} style={{width:"100%",background:"linear-gradient(135deg,"+P.honey+","+P.amber+")",border:"none",borderRadius:18,padding:"16px 18px",marginBottom:18,cursor:"pointer",textAlign:"left",fontFamily:"Inter",boxShadow:"0 8px 24px rgba(196,149,106,0.28)"}}>
          <p style={{margin:"0 0 2px",fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)"}}>Главная настройка</p>
          <p style={{margin:0,fontSize:16,fontWeight:600,color:"#FAF7F2"}}>Настроить свою цель ✦</p>
        </button>
        <p className="st">Что умеет приложение</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
          {FEATURES.map(f=>(
            <div key={f.t} style={{borderRadius:16,background:"rgba(237,229,216,0.5)",border:"1px solid rgba(255,255,255,0.55)",padding:"12px 10px"}}>
              <div style={{fontSize:20,marginBottom:4}}>{f.i}</div>
              <p style={{margin:"0 0 2px",fontSize:12,fontWeight:600,color:P.espresso}}>{f.t}</p>
              <p style={{margin:0,fontSize:10,color:P.linen,lineHeight:1.5}}>{f.d}</p>
            </div>
          ))}
        </div>
        <p className="st">Частые вопросы</p>
        {FAQ_DATA.map((item,i) => <FAQItem key={i} q={item.q} a={item.a}/>)}
        <div style={{height:8}}/>
      </div>
    </div>
  );
}

function FAQItem({q, a}) {
  const [open,setOpen]=useState(false);
  return (
    <div className="faq-i">
      <button className="faq-q" onClick={()=>setOpen(v=>!v)}>
        <span>{q}</span>
        <span style={{fontSize:18,color:P.amber,transition:"transform 0.2s",transform:open?"rotate(45deg)":"none",flexShrink:0,marginLeft:8}}>+</span>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

function QuickExpense({onSave, onClose, onFull, defaultCat, defaultAmt}) {
  const [amount,setAmount]=useState(String(defaultAmt||""));
  const [c,setC]=useState(defaultCat||"food");
  const save=()=>{const n=Number(amount);if(!n||n<=0)return;onSave({id:Date.now(),category:c,amount:n,comment:"",date:today(),photo:null});};
  return (
    <div className="qs">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,fontWeight:600,color:P.driftwood,letterSpacing:"0.05em",textTransform:"uppercase"}}>Быстрый расход</span>
        <button onClick={onFull} style={{background:"none",border:"none",fontSize:12,color:P.amber,cursor:"pointer",fontFamily:"Inter",fontWeight:500}}>Подробнее</button>
      </div>
      <input className="inp inp-xl" type="number" placeholder="0" autoFocus value={amount}
        onChange={e=>setAmount(e.target.value)} style={{marginBottom:14,fontSize:34}}
        onKeyDown={e=>e.key==="Enter"&&save()}/>
      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:6,marginBottom:14}}>
        {CATS.slice(0,7).map(x=>(
          <button key={x.id} onClick={()=>setC(x.id)} style={{flexShrink:0,padding:"7px 11px",borderRadius:12,border:"1.5px solid "+(c===x.id?"rgba(196,149,106,0.5)":"rgba(184,168,152,0.22)"),background:c===x.id?"rgba(196,149,106,0.1)":"rgba(237,229,216,0.4)",cursor:"pointer",fontSize:12,color:c===x.id?P.cognac:P.driftwood,fontWeight:c===x.id?500:400,display:"flex",alignItems:"center",gap:4,fontFamily:"Inter"}}>
            <span>{x.i}</span><span>{x.l}</span>
          </button>
        ))}
      </div>
      <button className="btn" onClick={save} style={{borderRadius:16,padding:"13px"}}>Записать</button>
    </div>
  );
}