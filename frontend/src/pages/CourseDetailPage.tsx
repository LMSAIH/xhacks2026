import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Course } from '@/lib/api';

export function CourseDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const course = location.state?.course as Course | undefined;

  if (!course) {
    navigate('/browse-courses');
    return null;
  }

  const handleStartLearning = () => {
    navigate('/customize', { 
      state: { 
        topic: `${course.name}: ${course.title}`,
        context: course.description,
        course,
      } 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm animate-fade-in-down">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 hover:opacity-70 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-foreground">Voxify</span>
        </button>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1 rounded-full bg-primary" />
          <div className="w-8 h-1 rounded-full bg-primary" />
          <div className="w-8 h-1 rounded-full bg-primary" />
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 px-6 py-10 overflow-auto">
        <div className="w-full max-w-3xl mx-auto">
          {/* Back button */}
          <button 
            onClick={() => navigate('/browse-courses')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 animate-fade-in"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to courses
          </button>

          {/* Course Header */}
          <div className="mb-10 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1.5 rounded-lg bg-accent text-primary font-semibold">
                {course.name}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-sm">
                {course.units} units
              </span>
              {course.designation && course.designation !== 'N/A' && (
                <span className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-sm">
                  {course.designation}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground">
              {course.title}
            </h1>
            
            <p className="text-muted-foreground text-lg leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Course Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 stagger-children">
            {course.prerequisites && (
              <div className="p-5 rounded-xl border-2 border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Prerequisites</h3>
                    <p className="text-sm text-muted-foreground">{course.prerequisites}</p>
                  </div>
                </div>
              </div>
            )}
            
            {course.corequisites && (
              <div className="p-5 rounded-xl border-2 border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Corequisites</h3>
                    <p className="text-sm text-muted-foreground">{course.corequisites}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 rounded-xl border-2 border-border bg-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-foreground">Delivery Method</h3>
                  <p className="text-sm text-muted-foreground">{course.delivery_method}</p>
                </div>
              </div>
            </div>

            {course.notes && (
              <div className="p-5 rounded-xl border-2 border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Notes</h3>
                    <p className="text-sm text-muted-foreground">{course.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Term & Instructors */}
          {(course.term || course.instructors) && (
            <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Current Offering</h2>
              <div className="flex flex-wrap gap-2">
                <div className="px-4 py-2 rounded-lg bg-secondary border border-border text-sm">
                  {course.term && <span className="font-medium text-foreground">{course.term}</span>}
                  {course.instructors && (
                    <span className="text-muted-foreground ml-2">
                      — {course.instructors}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Start Learning Button */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button 
              size="lg" 
              className="w-full py-6 text-base font-medium shadow-sm"
              onClick={handleStartLearning}
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Choose your tutor
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
