import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * Real-Time Status Indicator Component
 * Shows connection status and last update time for real-time monitoring
 * Requirements: 1.4
 */
const RealTimeStatusIndicator = ({ lastUpdate, isConnected = true, onRefresh }) => {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      if (!lastUpdate) {
        setTimeSinceUpdate('Never');
        return;
      }

      const now = new Date();
      const updateTime = new Date(lastUpdate);
      const diffMs = now - updateTime;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);

      if (diffSec < 60) {
        setTimeSinceUpdate(`${diffSec}s ago`);
      } else if (diffMin < 60) {
        setTimeSinceUpdate(`${diffMin}m ago`);
      } else {
        setTimeSinceUpdate(`${diffHour}h ago`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="flex items-center gap-2 text-xs">
      {isConnected ? (
        <div className="flex items-center gap-1 text-green-600">
          <Wifi className="w-4 h-4" />
          <span className="hidden sm:inline">Live</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-600">
          <WifiOff className="w-4 h-4" />
          <span className="hidden sm:inline">Offline</span>
        </div>
      )}
      <span className="text-slate-600">Updated: {timeSinceUpdate}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-slate-100 rounded transition"
          title="Refresh data"
        >
          <RefreshCw className="w-3 h-3 text-slate-600" />
        </button>
      )}
    </div>
  );
};

export default RealTimeStatusIndicator;
