import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreVertical } from "lucide-react";
import type { Student, AttendanceItem } from "@shared/schema";
import { StudentDetailsModal } from './student-details-modal';
import { InstructorsSection } from './instructors-section';
import { ExpelStudentModal } from './expel-student-modal';
import { useAuth } from "@/hooks/useAuth";

interface AttendanceTableProps {
  students: Student[];
  allStudents: Student[];
  attendance: Map<string, AttendanceItem>;
  onAttendanceChange: (studentId: string, status: 'obecny' | 'nieobecny' | 'wypisani') => void;
  selectedDate: string;
  selectedGroup: string;
  selectedGroupName: string;
  onNotesUpdate: (studentId: string, notes: string) => void;
}

export function AttendanceTable({
  students,
  allStudents,
  attendance,
  onAttendanceChange,
  selectedDate,
  selectedGroup,
  selectedGroupName,
  onNotesUpdate
}: AttendanceTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToExpel, setStudentToExpel] = useState<Student | null>(null);
  const [isExpelModalOpen, setIsExpelModalOpen] = useState(false);
  const { user } = useAuth();

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleExpelClick = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setStudentToExpel(student);
    setIsExpelModalOpen(true);
  };

  const handleCloseExpelModal = () => {
    setIsExpelModalOpen(false);
    setStudentToExpel(null);
  };
  // Liczenie wszystkich kategorii - używaj allStudents dla statystyk
  const activeStudents = students.filter(s => s.active);
  const allInactiveStudents = (allStudents || []).filter(s => !s.active);
  const attendanceValues = Array.from(attendance.values());
  const presentCount = attendanceValues.filter(a => a.status === 'obecny').length;
  const absentCount = attendanceValues.filter(a => a.status === 'nieobecny').length;
  const expelledCount = allInactiveStudents.length; // Wypisani to nieaktywni uczniowie ze wszystkich

  if (students.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
        <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h3 className="text-sm font-medium text-foreground mb-1">Brak studentów</h3>
        <p className="text-sm text-muted-foreground">
          Wybierz grupę z listy powyżej, aby wyświetlić listę uczniów.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/50">
        <h2 className="text-lg font-medium text-foreground">Lista uczniów</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Frekwencja na dzień <span className="font-medium">{formatDate(selectedDate)}</span>
        </p>
      </div>

      {/* Table Container - Responsive */}
      <div className="overflow-x-auto">
        <Table>
          {/* Sticky Header - Hidden on mobile, full on desktop */}
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              {/* Mobile: combine name columns */}
              <TableHead className="text-left w-auto">
                <span className="hidden md:inline">Imię</span>
                <span className="md:hidden">Uczeń</span>
              </TableHead>
              <TableHead className="text-left hidden md:table-cell w-auto">Nazwisko</TableHead>
              <TableHead className="text-center hidden md:table-cell w-24">Klasa</TableHead>
              <TableHead className="text-center w-32 md:w-40">Status</TableHead>
              <TableHead className="text-center w-12 md:w-16">
                <span className="hidden md:inline">Akcje</span>
                <span className="md:hidden">•••</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {students.map((student) => {
              const studentAttendance = attendance.get(student.id);
              const isPresent = studentAttendance?.status === 'obecny';
              const isInactive = !student.active;
              const isPending = student.status === 'pending';

              // Debug logging for pending detection
              if (student.status) {
                console.log(`Student ${student.first_name} ${student.last_name}: status="${student.status}", isPending=${isPending}, active=${student.active}`);
              }

              // Date filtering logic
              const selectedDateObj = new Date(selectedDate);
              const isBeforeStartDate = student.start_date && new Date(student.start_date) > selectedDateObj;
              const isAfterEndDate = student.end_date && new Date(student.end_date) < selectedDateObj;
              const shouldBeHidden = isBeforeStartDate || isAfterEndDate;

              // Don't render if outside date range
              if (shouldBeHidden && !isPending && student.active) {
                return null;
              }

              return (
                <TableRow
                  key={student.id}
                  className={`transition-colors duration-150 ${
                    isPending
                      ? 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 border-l-4 border-yellow-400 dark:border-yellow-600'
                      : isInactive
                        ? 'opacity-50 bg-gray-100 dark:bg-gray-800'
                        : isPresent
                          ? 'bg-green-50 dark:bg-green-950/20 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  data-testid={`row-student-${student.id}`}
                >
                  {/* Name column - combines first+last name on mobile, shows class badge */}
                  <TableCell className="font-medium" data-testid={`text-firstname-${student.id}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <div className="flex items-center gap-2">
                        {isPresent && !isInactive && !isPending && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                        {isPending && <span className="text-yellow-600 dark:text-yellow-500">⏳</span>}
                        <span className={isPresent && !isInactive && !isPending ? 'text-green-700 dark:text-green-400 font-semibold' : isPending ? 'text-yellow-800 dark:text-yellow-300' : ''}>
                          <span className="md:hidden">{student.first_name} {student.last_name}</span>
                          <span className="hidden md:inline">{student.first_name}</span>
                        </span>
                      </div>
                      {/* Class badge on mobile - inline with name */}
                      <span className={`md:hidden inline-block text-xs font-medium px-1.5 py-0.5 rounded ${
                        isInactive ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {student.class || '--'}
                      </span>
                    </div>
                  </TableCell>
                  {/* Desktop: Separate last name column */}
                  <TableCell className="hidden md:table-cell" data-testid={`text-lastname-${student.id}`}>
                    <span className={isPresent && !isInactive && !isPending ? 'text-green-700 dark:text-green-400 font-semibold' : isPending ? 'text-yellow-800 dark:text-yellow-300' : ''}>
                      {student.last_name}
                    </span>
                  </TableCell>
                  {/* Desktop: Separate class column */}
                  <TableCell className="text-center hidden md:table-cell w-24" data-testid={`text-class-${student.id}`}>
                    <span className={`text-sm font-medium px-2 py-1 rounded-md ${
                      isInactive
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    }`}>
                      {student.class || '--'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center w-32 md:w-40">
                    {isPending ? (
                      <div className="flex flex-col items-center space-y-1 md:space-y-2">
                        <Badge variant="secondary" className="bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 font-medium border border-yellow-400 dark:border-yellow-700 text-xs md:text-sm">
                          ⏳ OCZEKUJE
                        </Badge>
                        <span className="text-xs text-yellow-700 dark:text-yellow-300 hidden md:inline">
                          Wymaga zatwierdzenia
                        </span>
                      </div>
                    ) : isInactive ? (
                      <div className="flex flex-col items-center space-y-1 md:space-y-2">
                        <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-xs md:text-sm">
                          WYPISANY
                        </Badge>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Switch
                            checked={studentAttendance?.status === 'obecny'}
                            onCheckedChange={(checked) =>
                              onAttendanceChange(student.id, checked ? 'obecny' : 'nieobecny')
                            }
                            className={`transition-colors duration-200 scale-90 md:scale-100 ${
                              studentAttendance?.status === 'obecny'
                                ? 'data-[state=checked]:bg-green-600 bg-green-600'
                                : 'data-[state=unchecked]:bg-red-500 dark:data-[state=unchecked]:bg-red-600 border border-border dark:border-border'
                            } data-[state=checked]:bg-red-500 hover:data-[state=checked]:bg-red-600 dark:hover:data-[state=checked]:bg-red-700`}
                            data-testid={`switch-inactive-attendance-${student.id}`}
                            aria-label={`Oznacz ${student.first_name} ${student.last_name} jako ${studentAttendance?.status === 'obecny' ? 'nieobecną' : 'obecną'}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400" data-testid={`status-text-${student.id}`}>
                          {studentAttendance?.status === 'obecny' ? 'Był(a) obecny/a' : 'Był(a) nieobecny/a'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-1 md:space-y-2">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Switch
                            checked={studentAttendance?.status === 'obecny'}
                            onCheckedChange={(checked) =>
                              onAttendanceChange(student.id, checked ? 'obecny' : 'nieobecny')
                            }
                            disabled={isPending}
                            className={`transition-colors duration-200 scale-90 md:scale-100 ${
                              studentAttendance?.status === 'obecny'
                                ? 'data-[state=checked]:bg-green-600 bg-green-600'
                                : 'data-[state=unchecked]:bg-red-500 bg-red-500'
                            }`}
                            data-testid={`switch-attendance-${student.id}`}
                            aria-label={`Oznacz ${student.first_name} ${student.last_name} jako ${studentAttendance?.status === 'obecny' ? 'nieobecną' : 'obecną'}`}
                          />
                          {(user?.role === 'owner' || user?.role === 'reception') && !isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-1.5 py-0.5 md:px-2 md:py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700"
                              onClick={(e) => handleExpelClick(student, e)}
                              data-testid={`button-expel-${student.id}`}
                              title="Wypisz ucznia (tylko właściciel i recepcja)"
                            >
                              ⊘
                            </Button>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            studentAttendance?.status === 'obecny' ? 'text-green-700 dark:text-green-400' :
                            studentAttendance?.status === 'nieobecny' ? 'text-red-600 dark:text-red-400' :
                            studentAttendance?.status === 'wypisani' ? 'text-gray-600 dark:text-gray-400' :
                            'text-red-600 dark:text-red-400'
                          }`}
                          data-testid={`status-text-${student.id}`}
                        >
                          {studentAttendance?.status === 'obecny' ? 'Obecny/a' :
                           studentAttendance?.status === 'nieobecny' ? 'Nieobecny/a' :
                           studentAttendance?.status === 'wypisani' ? 'Wypisani' :
                           'Nieobecny/a'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center w-12 md:w-16">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`p-1 md:p-2 ${isInactive ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                      onClick={() => handleStudentClick(student)}
                      aria-label={`Więcej opcji dla ${student.first_name} ${student.last_name}`}
                      data-testid={`button-options-${student.id}`}
                      disabled={isInactive}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Table Footer with Summary and Instructors */}
      <div className="bg-muted/50 px-6 py-4 border-t border-border">
        <div className="flex flex-col space-y-3">
          {/* Statistics Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center" data-testid="summary-present">
                <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                <span>Obecni: <span className="font-medium text-green-700">{presentCount}</span></span>
              </div>
              <div className="flex items-center" data-testid="summary-absent">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>Nieobecni: <span className="font-medium text-red-600">{absentCount}</span></span>
              </div>
              <div className="flex items-center" data-testid="summary-expelled">
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                <span>Wypisani: <span className="font-medium text-gray-700">{expelledCount}</span></span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-last-saved">
              Ostatnio zapisano: <span className="font-medium">--</span>
            </div>
          </div>

          {/* Instructors Section */}
          {selectedGroup && (user?.role === 'owner' || user?.role === 'reception') && (
            <InstructorsSection groupId={selectedGroup} />
          )}
        </div>
      </div>

      <StudentDetailsModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        groupId={selectedGroup}
        groupName={selectedGroupName}
        currentAttendance={selectedStudent ? attendance.get(selectedStudent.id) : undefined}
        onNotesUpdate={onNotesUpdate}
      />

      <ExpelStudentModal
        isOpen={isExpelModalOpen}
        onClose={handleCloseExpelModal}
        student={studentToExpel}
      />
    </div>
  );
}
