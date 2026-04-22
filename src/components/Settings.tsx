import React from 'react';
import { useAppContext } from '../store';
import { ALL_TABS_CONFIG } from './Sidebar';
import { CheckSquare, Square, ArrowUp, ArrowDown } from 'lucide-react';
import { DEFAULT_TAB_ORDER } from '../store';

export default function SettingsPanel() {
  const { state, updateVisibleTabs } = useAppContext();
  const visibleTabs = state.visibleTabs || DEFAULT_TAB_ORDER;

  // Render tabs in the order of ALL_TABS_CONFIG but placed according to visibleTabs
  const orderedVisible = visibleTabs.map(id => ALL_TABS_CONFIG.find(t => t.id === id)).filter(Boolean) as typeof ALL_TABS_CONFIG;
  const hiddenTabs = ALL_TABS_CONFIG.filter(t => !visibleTabs.includes(t.id));

  const allOrderedTabs = [...orderedVisible, ...hiddenTabs];

  const handleToggle = (tabId: string) => {
    if (visibleTabs.includes(tabId)) {
      updateVisibleTabs(visibleTabs.filter(id => id !== tabId));
    } else {
      updateVisibleTabs([...visibleTabs, tabId]);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newTabs = [...visibleTabs];
    const temp = newTabs[index - 1];
    newTabs[index - 1] = newTabs[index];
    newTabs[index] = temp;
    updateVisibleTabs(newTabs);
  };

  const moveDown = (index: number) => {
    if (index === visibleTabs.length - 1) return;
    const newTabs = [...visibleTabs];
    const temp = newTabs[index + 1];
    newTabs[index + 1] = newTabs[index];
    newTabs[index] = temp;
    updateVisibleTabs(newTabs);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
      <div className="bg-card p-6 md:p-8 rounded-card shadow-theme border border-line">
        <h3 className="text-[18px] font-bold font-serif text-text-main mb-6">模块管理</h3>
        
        <div className="space-y-4">
          {allOrderedTabs.map(tab => {
            const isVisible = visibleTabs.includes(tab.id);
            const visibleIndex = visibleTabs.indexOf(tab.id);
            const Icon = tab.icon;
            
            return (
              <div 
                key={tab.id} 
                className={`flex items-center justify-between p-3 md:p-4 rounded-[16px] border transition-all ${isVisible ? 'border-sage bg-sage/5' : 'border-line bg-[#FAF8F6] opacity-70 hover:opacity-100'}`}
              >
                <div className="flex items-center gap-3 md:gap-4 cursor-pointer flex-1 min-w-0" onClick={() => handleToggle(tab.id)}>
                  <div className={`p-1.5 md:p-2 rounded-[12px] flex-shrink-0 ${isVisible ? 'bg-white shadow-sm' : 'bg-transparent text-text-muted'}`}>
                    <Icon size={18} className={isVisible ? 'text-sage' : ''} />
                  </div>
                  <span className={`text-[13px] md:text-[15px] font-bold truncate leading-none ${isVisible ? 'text-text-main' : 'text-text-muted'}`}>
                    {tab.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-2">
                  {isVisible && (
                    <div className="flex items-center gap-1 border-r border-line pr-2 md:pr-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveUp(visibleIndex); }} 
                        disabled={visibleIndex === 0}
                        className="p-1 text-text-muted hover:text-sage disabled:opacity-30 transition-colors"
                      >
                         <ArrowUp size={16} md:size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveDown(visibleIndex); }} 
                        disabled={visibleIndex === visibleTabs.length - 1}
                        className="p-1 text-text-muted hover:text-sage disabled:opacity-30 transition-colors"
                      >
                         <ArrowDown size={16} md:size={18} />
                      </button>
                    </div>
                  )}

                  <div className="text-sage cursor-pointer flex items-center justify-center w-6 md:w-8 h-6 md:h-8" onClick={(e) => { e.stopPropagation(); handleToggle(tab.id); }}>
                    {isVisible ? <CheckSquare size={20} className="md:w-[24px] md:h-[24px]" /> : <Square size={20} className="text-text-muted md:w-[24px] md:h-[24px]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[13px] text-text-muted mt-8 italic border-t border-line border-dashed pt-6 text-center">
          这些设置会自动保存在您的本地浏览器缓存中。
        </p>
      </div>
    </div>
  );
}
