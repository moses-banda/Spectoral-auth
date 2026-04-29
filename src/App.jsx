// ═══════════════════════════════════════════════════════════════════
// App.jsx — Lumen: Spectral Memory Aid
//
// Multi-page app with shared BLE state.
// Routes: / (home), /enroll, /identify, /library, /capture
// ═══════════════════════════════════════════════════════════════════

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useBLE } from './ble/useBLE';

import HomePage      from './pages/HomePage';
import EnrollPage    from './pages/EnrollPage';
import IdentifyPage  from './pages/IdentifyPage';
import LibraryPage   from './pages/LibraryPage';
import CapturePage   from './components/CapturePage';

export default function App() {
  const ble = useBLE();

  // Common BLE props to pass to pages
  const bleProps = {
    connected:    ble.connected,
    connecting:   ble.connecting,
    isSupported:  ble.isSupported,
    error:        ble.error,
    lastScan:     ble.lastScan,
    liveSpectrum: ble.liveSpectrum,
    onConnect:    ble.connect,
    onDisconnect: ble.disconnect,
    pushProfile:  ble.pushProfile,
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage {...bleProps} />} />
        <Route path="/enroll" element={<EnrollPage {...bleProps} />} />
        <Route path="/identify" element={<IdentifyPage {...bleProps} />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/capture" element={
          <CapturePage onBack={() => window.history.back()} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
