import * as React from 'react';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppState, ActiveStudySession, ThemeType, Paper, JournalEntry, SleepRecord, FocusRecord, StudySession, ResearchPlan, FitnessRecord, Achievement } from './types';
import { useAuth } from './lib/AuthContext';
import { format } from 'date-fns';
import { db } from './lib/tcb';
import { useLocalStorage } from './lib/useLocalStorage';

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
  const [localState, setLocalState] = useLocalStorage<AppState>('research_daily_state', defaultState);
  const [state, setState] = useState<AppState>(localState);

  // Sync state to localState for guests or as backup
  useEffect(() => {
    if (!user) {
      setLocalState(state);
    }
  }, [state, user]);

  useEffect(() => {
    if (!user) {
      setState(localState || defaultState);
      const currentTheme = (localState?.theme || 'dustblue') as ThemeType;
      document.documentElement.setAttribute('data-theme', currentTheme);
      return;
    }

    // 1. Listen to user profile (settings)
    let userWatcher: any;
    try {
      userWatcher = db.collection('users').doc(user.uid).watch({
        onChange: (snapshot) => {
          const userData = snapshot.docs && snapshot.docs[0];
          if (userData) {
            setState(prev => ({
              ...prev,
              theme: userData.theme || 'dustblue',
              visibleTabs: userData.visibleTabs || DEFAULT_TAB_ORDER,
              activeSession: userData.activeSession || null
            }));
            if (userData.theme) document.documentElement.setAttribute('data-theme', userData.theme);
          }
        },
        onError: (err) => console.error('userWatcher error', err)
      });
    } catch (e) {
      console.error('Failed to start userWatcher', e);
    }

    const collections = [
      { key: 'papers', path: 'papers' },
      { key: 'journals', path: 'journals' },
      { key: 'sleepRecords', path: 'sleepRecords' },
      { key: 'focusRecords', path: 'focusRecords' },
      { key: 'studySessions', path: 'studySessions' },
      { key: 'researchPlans', path: 'researchPlans' },
      { key: 'fitnessRecords', path: 'fitnessRecords' },
      { key: 'achievements', path: 'achievements' }
    ];

    const watchers = collections.map(cfg => {
      try {
        return db.collection(cfg.path)
          .where({ userId: user.uid })
          .watch({
            onChange: (snapshot) => {
              if (snapshot.docs) {
                setState(prev => ({ ...prev, [cfg.key]: snapshot.docs }));
              }
            },
            onError: (err) => console.error(`${cfg.key} watcher error`, err)
          });
      } catch (e) {
        console.error(`Failed to start ${cfg.key} watcher`, e);
        return null;
      }
    }).filter(Boolean);

    return () => {
      if (userWatcher) userWatcher.close();
      watchers.forEach((w: any) => w && w.close());
    };
  }, [user, localState]);

  const updateRootField = async (updates: Partial<{ theme: ThemeType, visibleTabs: string[], activeSession: ActiveStudySession | null }>) => {
    if (!user) {
      setState(prev => ({ ...prev, ...updates }));
      return;
    }
    try {
      await db.collection('users').doc(user.uid).update(updates);
    } catch (e) {
      console.error('Update cloud profile failed, falling back to local', e);
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  const updateVisibleTabs = (tabs: string[]) => updateRootField({ visibleTabs: tabs });
  
  const updateTheme = (theme: ThemeType) => {
    document.documentElement.setAttribute('data-theme', theme);
    updateRootField({ theme });
  };

  const setActiveSession = (session: ActiveStudySession | null) => updateRootField({ activeSession: session });

  const addDocInCol = async (path: string, item: any, key: keyof AppState) => {
    if (!user) {
      setState(prev => ({ ...prev, [key]: [item, ...(prev[key] as any[])] }));
      return;
    }
    try {
      await db.collection(path).add({ ...item, userId: user.uid });
    } catch (e) {
      console.error(`Add doc to ${path} failed`, e);
      setState(prev => ({ ...prev, [key]: [item, ...(prev[key] as any[])] }));
    }
  };
  
  const updateDocInCol = async (path: string, id: string, updates: any, key: keyof AppState) => {
    if (!user) {
      setState(prev => ({
        ...prev,
        [key]: (prev[key] as any[]).map(x => x.id === id ? { ...x, ...updates } : x)
      }));
      return;
    }
    try {
      const res = await db.collection(path).where({ id, userId: user.uid }).get();
      if (res.data.length > 0) {
        const internalId = res.data[0]._id;
        await db.collection(path).doc(internalId).update(updates);
      }
    } catch (e) {
      console.error(`Update doc in ${path} failed`, e);
    }
  };
  
  const delDocInCol = async (path: string, id: string, key: keyof AppState) => {
    if (!user) {
      setState(prev => ({
        ...prev,
        [key]: (prev[key] as any[]).filter(x => x.id !== id)
      }));
      return;
    }
    try {
      const res = await db.collection(path).where({ id, userId: user.uid }).get();
      if (res.data.length > 0) {
        const internalId = res.data[0]._id;
        await db.collection(path).doc(internalId).remove();
      }
    } catch (e) {
      console.error(`Delete doc from ${path} failed`, e);
    }
  };

  return (
    <AppContext.Provider value={{
      state, updateVisibleTabs, updateTheme,
      setActiveSession,
      addStudySession: (s) => addDocInCol('studySessions', { ...s, id: uuidv4() }, 'studySessions'),
      updateStudySession: (id, updates) => updateDocInCol('studySessions', id, updates, 'studySessions'),
      deleteStudySession: (id) => delDocInCol('studySessions', id, 'studySessions'),
      addPaper: (p) => addDocInCol('papers', { ...p, id: uuidv4(), submissions: [] }, 'papers'),
      updatePaper: (id, updates) => updateDocInCol('papers', id, updates, 'papers'),
      deletePaper: (id) => delDocInCol('papers', id, 'papers'),
      addJournal: (j) => {
        const now = new Date();
        addDocInCol('journals', { ...j, id: uuidv4(), timestamp: now.getTime(), date: format(now, 'yyyy-MM-dd') }, 'journals');
      },
      updateJournal: (id, updates) => updateDocInCol('journals', id, updates, 'journals'),
      addSleepRecord: (s) => addDocInCol('sleepRecords', { ...s, id: uuidv4(), timestamp: Date.now() }, 'sleepRecords'),
      updateSleepRecord: (id, updates) => updateDocInCol('sleepRecords', id, updates, 'sleepRecords'),
      deleteSleepRecord: (id) => delDocInCol('sleepRecords', id, 'sleepRecords'),
      addFocusRecord: (f) => addDocInCol('focusRecords', { ...f, id: uuidv4(), timestamp: Date.now() }, 'focusRecords'),
      updateFocusRecord: (id, updates) => updateDocInCol('focusRecords', id, updates, 'focusRecords'),
      deleteFocusRecord: (id) => delDocInCol('focusRecords', id, 'focusRecords'),
      addResearchPlan: (r) => addDocInCol('researchPlans', { ...r, id: uuidv4(), timestamp: Date.now(), completed: false }, 'researchPlans'),
      toggleResearchPlan: (id) => {
        const p = state.researchPlans.find(x => x.id === id);
        if (p) updateDocInCol('researchPlans', id, { completed: !p.completed }, 'researchPlans');
      },
      deleteResearchPlan: (id) => delDocInCol('researchPlans', id, 'researchPlans'),
      addFitnessRecord: (f) => addDocInCol('fitnessRecords', { ...f, id: uuidv4(), timestamp: Date.now() }, 'fitnessRecords'),
      deleteFitnessRecord: (id) => delDocInCol('fitnessRecords', id, 'fitnessRecords'),
      addAchievement: (a) => addDocInCol('achievements', { ...a, id: uuidv4(), timestamp: Date.now() }, 'achievements'),
      updateAchievement: (id, updates) => updateDocInCol('achievements', id, updates, 'achievements'),
      deleteAchievement: (id) => delDocInCol('achievements', id, 'achievements')
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
