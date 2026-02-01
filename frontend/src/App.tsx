import { VoiceAgent } from '@/components/voice-agent';
import { NotesEditor } from '@/components/NotesEditor';

function App() {
  return (
    <div className="flex min-h-screen flex-col gap-4 p-4">
      <VoiceAgent />
      <NotesEditor />
    </div>
  );
}

export default App;
