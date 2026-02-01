import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout";
import { searchCourses, type Course } from "@/lib/api";

const POPULAR_DEPARTMENTS = [
  "CMPT",
  "MATH",
  "STAT",
  "PHYS",
  "CHEM",
  "BISC",
  "ECON",
  "BUS",
  "PSYC",
  "ENGL",
  "PHIL",
  "HIST",
];

export function BrowseCoursesPage() {
  const navigate = useNavigate();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (selectedDept) {
      loadCourses(selectedDept);
    }
  }, [selectedDept]);

  const loadCourses = async (dept: string) => {
    setLoading(true);
    try {
      const results = await searchCourses({ dept, limit: 20 });
      setCourses(results);
    } catch (error) {
      console.error("Failed to load courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSelectedDept(null);
    try {
      const results = await searchCourses({ title: searchQuery, limit: 20 });
      setCourses(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    navigate("/customize", {
      state: {
        topic: `${course.dept} ${course.number}: ${course.title}`,
        courseId: `${course.dept}-${course.number}`,
        courseName: course.title,
        course,
      },
    });
  };

  // Filter courses by undergraduate level
  const filteredCourses = courses.filter((c) => c.degreeLevel === "UGRD");

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Browse SFU Courses
          </h1>
          <p className="text-muted-foreground">
            Search for a course or pick a department to explore
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8 animate-fade-in-up">
          <input
            type="text"
            placeholder="Search by course name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-3 bg-card border border-border focus:outline-none focus:border-foreground transition-colors"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Department Pills */}
        <div className="mb-8">
          <div className="text-sm text-muted-foreground mb-3">
            Popular departments:
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => {
                  setSelectedDept(dept);
                  setSearchQuery("");
                }}
                className={`px-4 py-2 text-sm font-medium border transition-all ${
                  selectedDept === dept
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border hover:border-foreground"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Course List */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-muted-foreground">Loading courses...</div>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-4">
                {filteredCourses.length} courses found
              </div>
              {filteredCourses.map((course) => (
                <button
                  key={`${course.dept}-${course.number}`}
                  onClick={() => handleCourseSelect(course)}
                  className="w-full p-5 text-left border border-border bg-card hover:border-foreground hover:bg-accent/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg mb-1">
                        {course.dept} {course.number}
                      </div>
                      <div className="text-foreground/80 mb-2">
                        {course.title}
                      </div>
                      {course.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground shrink-0">
                      {course.units} units
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : selectedDept || searchQuery ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-4">🔍</div>
              <div>No undergraduate courses found</div>
              <div className="text-sm mt-2">Try a different search or department</div>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-4">📚</div>
              <div>Select a department or search to see courses</div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
