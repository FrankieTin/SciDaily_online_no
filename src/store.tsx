import * as React from 'react';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppState, ActiveStudySession, ThemeType, Paper, JournalEntry, SleepRecord, FocusRecord, StudySession, ResearchPlan, FitnessRecord, Achievement } from './types';
import { useAuth } from './lib/AuthContext';
import { format } from 'date-fns';
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './lib/firebase';

interface AppContextType {
  state: AppState;
  updateVisibleTabs: (tabs: string[]) => void;
  updateTheme: (theme: ThemeType) => void;
  setActiveSession: (session: ActiveStudySession | null) => void;
  addStudySession: (s: Omit<StudySession, 'id'>) => void;
  updateStudySession: (id: string, updates: Partial<StudySession>) => void;
  deleteStudySession: (id: string) => void;
  addPaper: (p: Omit<Paper, 'id' | 'submissions'>) => void;
  updatePaper: (id: string, updates: Partial<Paper>) => void;
  deletePaper: (id: string) => void;
  addJournal: (j: Omit<JournalEntry, 'id' | 'timestamp' | 'date'>) => void;
  updateJournal: (id: string, updates: Partial<JournalEntry>) => void;
  addSleepRecord: (s: Omit<SleepRecord, 'id' | 'timestamp'>) => void;
  updateSleepRecord: (id: string, updates: Partial<SleepRecord>) => void;
  deleteSleepRecord: (id: string) => void;
  addFocusRecord: (f: Omit<FocusRecord, 'id' | 'timestamp'>) => void;
  updateFocusRecord: (id: string, updates: Partial<FocusRecord>) => void;
  deleteFocusRecord: (id: string) => void;
  addResearchPlan: (r: Omit<ResearchPlan, 'id' | 'timestamp' | 'completed'>) => void;
  toggleResearchPlan: (id: string) => void;
  deleteResearchPlan: (id: string) => void;
  addFitnessRecord: (f: Omit<FitnessRecord, 'id' | 'timestamp'>) => void;
  deleteFitnessRecord: (id: string) => void;
  addAchievement: (a: Omit<Achievement, 'id' | 'timestamp'>) => void;
  updateAchievement: (id: string, updates: Partial<Achievement>) => void;
  deleteAchievement: (id: string) => void;
}

export const DEFAULT_TAB_ORDER = ['time', 'plan', 'fitness', 'papers', 'journal', 'achievements'];

const defaultState: AppState = {
  visibleTabs: DEFAULT_TAB_ORDER,
  theme: 'dustblue',
  papers: [],
  journals: [],
  sleepRecords: [],
  focusRecords: [],
  studySessions: [],
  activeSession: null,
  researchPlans: [],
  fitnessRecords: [],
  achievements: []
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(defaultState);

  useEffect(() => {
    if (!user) {
      setState(defaultState);
      document.documentElement.setAttribute('data-theme', 'dustblue');
      return;
    }

    // 1. Listen to user profile (settings)
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setState(prev => ({
          ...prev,
          theme: data.theme || 'dustblue',
          visibleTabs: data.visibleTabs || DEFAULT_TAB_ORDER,
          activeSession: data.activeSession || null
        }));
        if (data.theme) document.documentElement.setAttribute('data-theme', data.theme);
      }
    });

    // 2. Listen to subcollections
    const subColConfigs = [
      { key: 'papers', path: 'papers', order: 'title' },
      { key: 'journals', path: 'journals', order: 'timestamp' },
      { key: 'sleepRecords', path: 'sleepRecords', order: 'timestamp' },
      { key: 'focusRecords', path: 'focusRecords', order: 'timestamp' },
      { key: 'studySessions', path: 'studySessions', order: 'startTime' },
      { key: 'researchPlans', path: 'researchPlans', order: 'timestamp' },
      { key: 'fitnessRecords', path: 'fitnessRecords', order: 'timestamp' },
      { key: 'achievements', path: 'achievements', order: 'timestamp' }
    ];

    const unsubscribes = subColConfigs.map(cfg => {
      const colRef = collection(db, 'users', user.uid, cfg.path);
      const q = query(colRef, orderBy(cfg.order, 'desc'));
      return onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ ...d.data() }));
        setState(prev => ({ ...prev, [cfg.key]: items }));
      });
    });

    return () => {
      unsubUser();
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  const updateRootField = async (updates: Partial<{ theme: ThemeType, visibleTabs: string[], activeSession: ActiveStudySession | null }>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, updates);
  };

  const updateVisibleTabs = (tabs: string[]) => updateRootField({ visibleTabs: tabs });
  
  const updateTheme = (theme: ThemeType) => {
    document.documentElement.setAttribute('data-theme', theme);
    updateRootField({ theme });
  };

  const setActiveSession = (session: ActiveStudySession | null) => updateRootField({ activeSession: session });

  const addDocInCol = async (path: string, item: any) => {
    if (!user) return;
    const itemRef = doc(db, 'users', user.uid, path, item.id);
    await setDoc(itemRef, item);
  };
  
  const updateDocInCol = async (path: string, id: string, updates: any) => {
    if (!user) return;
    const itemRef = doc(db, 'users', user.uid, path, id);
    await updateDoc(itemRef, updates);
  };
  
  const delDocInCol = async (path: string, id: string) => {
    if (!user) return;
    const itemRef = doc(db, 'users', user.uid, path, id);
    await deleteDoc(itemRef);
  };

  return (
    <AppContext.Provider value={{
      state, updateVisibleTabs, updateTheme,
      setActiveSession,
      addStudySession: (s) => addDocInCol('studySessions', { ...s, id: uuidv4() }),
      updateStudySession: (id, updates) => updateDocInCol('studySessions', id, updates),
      deleteStudySession: (id) => delDocInCol('studySessions', id),
      addPaper: (p) => addDocInCol('papers', { ...p, id: uuidv4(), submissions: [] }),
      updatePaper: (id, updates) => updateDocInCol('papers', id, updates),
      deletePaper: (id) => delDocInCol('papers', id),
      addJournal: (j) => {
        const now = new Date();
        addDocInCol('journals', { ...j, id: uuidv4(), timestamp: now.getTime(), date: format(now, 'yyyy-MM-dd') });
      },
      updateJournal: (id, updates) => updateDocInCol('journals', id, updates),
      addSleepRecord: (s) => addDocInCol('sleepRecords', { ...s, id: uuidv4(), timestamp: Date.now() }),
      updateSleepRecord: (id, updates) => updateDocInCol('sleepRecords', id, updates),
      deleteSleepRecord: (id) => delDocInCol('sleepRecords', id),
      addFocusRecord: (f) => addDocInCol('focusRecords', { ...f, id: uuidv4(), timestamp: Date.now() }),
      updateFocusRecord: (id, updates) => updateDocInCol('focusRecords', id, updates),
      deleteFocusRecord: (id) => delDocInCol('focusRecords', id),
      addResearchPlan: (r) => addDocInCol('researchPlans', { ...r, id: uuidv4(), timestamp: Date.now(), completed: false }),
      toggleResearchPlan: (id) => {
        const p = state.researchPlans.find(x => x.id === id);
        if (p) updateDocInCol('researchPlans', id, { completed: !p.completed });
      },
      deleteResearchPlan: (id) => delDocInCol('researchPlans', id),
      addFitnessRecord: (f) => addDocInCol('fitnessRecords', { ...f, id: uuidv4(), timestamp: Date.now() }),
      deleteFitnessRecord: (id) => delDocInCol('fitnessRecords', id),
      addAchievement: (a) => addDocInCol('achievements', { ...a, id: uuidv4(), timestamp: Date.now() }),
      updateAchievement: (id, updates) => updateDocInCol('achievements', id, updates),
      deleteAchievement: (id) => delDocInCol('achievements', id)
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext error');
  return context;
}
