import * as React from 'react';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppState, ActiveStudySession, ThemeType, Paper, JournalEntry, SleepRecord, FocusRecord, StudySession, ResearchPlan, FitnessRecord, Achievement } from './types';
import { useAuth } from './lib/AuthContext';
import { format } from 'date-fns';
import { db } from './lib/tcb';

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
    // TCB watch syntax
    const userWatcher = db.collection('users').doc(user.uid).watch({
      onChange: (snapshot) => {
        const userData = snapshot.docs[0];
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

    // 2. Listen to data collections
    // In TCB, we usually use separate collections or sub-documents. 
    // The user's blueprint suggested /users/{userId}/papers/{paperId}.
    // In TCB Database, nested paths are not as standard as Firestore.
    // We will use root collections with _openid or userId field.
    
    const collections = [
      { key: 'papers', path: 'papers', order: 'title' },
      { key: 'journals', path: 'journals', order: 'timestamp' },
      { key: 'sleepRecords', path: 'sleepRecords', order: 'timestamp' },
      { key: 'focusRecords', path: 'focusRecords', order: 'timestamp' },
      { key: 'studySessions', path: 'studySessions', order: 'startTime' },
      { key: 'researchPlans', path: 'researchPlans', order: 'timestamp' },
      { key: 'fitnessRecords', path: 'fitnessRecords', order: 'timestamp' },
      { key: 'achievements', path: 'achievements', order: 'timestamp' }
    ];

    const watchers = collections.map(cfg => {
      return db.collection(cfg.path)
        .where({ userId: user.uid })
        .orderBy(cfg.order, 'desc')
        .watch({
          onChange: (snapshot) => {
             setState(prev => ({ ...prev, [cfg.key]: snapshot.docs }));
          },
          onError: (err) => console.error(`${cfg.key} watcher error`, err)
        });
    });

    return () => {
      userWatcher.close();
      watchers.forEach(w => w.close());
    };
  }, [user]);

  const updateRootField = async (updates: Partial<{ theme: ThemeType, visibleTabs: string[], activeSession: ActiveStudySession | null }>) => {
    if (!user) return;
    await db.collection('users').doc(user.uid).update(updates);
  };

  const updateVisibleTabs = (tabs: string[]) => updateRootField({ visibleTabs: tabs });
  
  const updateTheme = (theme: ThemeType) => {
    document.documentElement.setAttribute('data-theme', theme);
    updateRootField({ theme });
  };

  const setActiveSession = (session: ActiveStudySession | null) => updateRootField({ activeSession: session });

  const addDocInCol = async (path: string, item: any) => {
    if (!user) return;
    await db.collection(path).add({ ...item, userId: user.uid });
  };
  
  const updateDocInCol = async (path: string, id: string, updates: any) => {
    if (!user) return;
    // TCB update requires looking up the document internal id if we used .add().
    // If we used custom ids, we can use .doc(id).
    // Let's assume we use the 'id' field for our internal logic but TCB has its own _id.
    // To match our 'id' field:
    const res = await db.collection(path).where({ id, userId: user.uid }).get();
    if (res.data.length > 0) {
      const internalId = res.data[0]._id;
      await db.collection(path).doc(internalId).update(updates);
    }
  };
  
  const delDocInCol = async (path: string, id: string) => {
    if (!user) return;
    const res = await db.collection(path).where({ id, userId: user.uid }).get();
    if (res.data.length > 0) {
      const internalId = res.data[0]._id;
      await db.collection(path).doc(internalId).remove();
    }
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
