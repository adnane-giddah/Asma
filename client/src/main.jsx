import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource/amiri-quran/400.css';
import '@fontsource/aref-ruqaa/700.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource-variable/inter';
import '@fontsource/tajawal/400.css';
import '@fontsource/tajawal/500.css';
import '@fontsource/tajawal/700.css';
import './styles.css';
import { NamesProvider, SaveProvider, PrefsProvider } from './state.jsx';
import { WaitForNames, CrashGuard, Shell } from './ui.jsx';
import { DailyView, FrontPage, LessonList, LessonView, NameGrid, LostPage, PlayHub, ProgressView, QuizView, ReciteView } from './pages.jsx';
import { HifzPage, NameView, SurahList, SurahView } from './quran.jsx';
import { Adventure99, BuildName, KidsHub, MemoryCards, NameRush } from './kids.jsx';

function App() {
  return (
    <PrefsProvider>
      <SaveProvider>
        <NamesProvider>
          <Shell>
            <CrashGuard>
              <WaitForNames>
                <Routes>
                  <Route path="/" element={<FrontPage />} />
                  <Route path="/learn" element={<LessonList />} />
                  <Route path="/learn/recite" element={<ReciteView />} />
                  <Route path="/learn/:lessonId" element={<LessonView />} />
                  <Route path="/names" element={<NameGrid />} />
                  <Route path="/names/:id" element={<NameView />} />
                  <Route path="/quran" element={<SurahList />} />
                  <Route path="/quran/:surah" element={<SurahView />} />
                  <Route path="/memorize" element={<HifzPage />} />
                  <Route path="/kids" element={<KidsHub />} />
                  <Route path="/kids/memory" element={<MemoryCards />} />
                  <Route path="/kids/rush" element={<NameRush />} />
                  <Route path="/kids/build" element={<BuildName />} />
                  <Route path="/kids/adventure" element={<Adventure99 />} />
                  <Route path="/practice" element={<PlayHub />} />
                  <Route path="/practice/:mode" element={<QuizView />} />
                  <Route path="/daily" element={<DailyView />} />
                  <Route path="/progress" element={<ProgressView />} />
                  <Route path="*" element={<LostPage />} />
                </Routes>
              </WaitForNames>
            </CrashGuard>
          </Shell>
        </NamesProvider>
      </SaveProvider>
    </PrefsProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
