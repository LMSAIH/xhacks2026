import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { VoiceAgent } from '@/components/voice-agent';
import { HomePage } from '@/pages/HomePage';
import { SelectTopicPage } from '@/pages/SelectTopicPage';
import { BrowseCoursesPage } from '@/pages/BrowseCoursesPage';
import { CustomTopicPage } from '@/pages/CustomTopicPage';
import { NotesEditorPage } from '@/pages/NotesEditorPage';
import CustomizePage from '@/pages/CustomizePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/select-topic" element={<SelectTopicPage />} />
        <Route path="/browse-courses" element={<BrowseCoursesPage />} />
        <Route path="/custom-topic" element={<CustomTopicPage />} />
        <Route path="/customize" element={<CustomizePage />} />
        <Route path="/voice" element={<VoiceAgent />} />
        <Route path="/notes" element={<NotesEditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
