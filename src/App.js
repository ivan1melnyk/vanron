import VoiceRecorder from "./components/VoiceRecorder";
import WaveSurface from "./components/WaveSurface";

import logo from "./microphone-round.svg";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <WaveSurface />
      </header>
    </div>
  );
}

export default App;
