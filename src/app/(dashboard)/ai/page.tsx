'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const AIChat = dynamic(() => import('@/components/ai/AIChat'), { ssr: false });
const AIForecast = dynamic(() => import('@/components/ai/AIForecast'), { ssr: false });
const AIMaintenance = dynamic(() => import('@/components/ai/AIMaintenance'), { ssr: false });
const AIAnomalies = dynamic(() => import('@/components/ai/AIAnomalies'), { ssr: false });

const tabs = ['Chat', 'Demand Forecast', 'Maintenance', 'Anomalies'];

export default function AIPage() {
  const [activeTab, setActiveTab] = useState('Chat');

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-900">AI Insights</h1>

      <div className="flex gap-1 border-b border-neutral-200 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2.5 text-[15px] font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Chat' && <AIChat />}
      {activeTab === 'Demand Forecast' && <AIForecast />}
      {activeTab === 'Maintenance' && <AIMaintenance />}
      {activeTab === 'Anomalies' && <AIAnomalies />}
    </div>
  );
}
