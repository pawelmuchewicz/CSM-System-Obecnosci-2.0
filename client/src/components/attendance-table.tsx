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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">Brak studentów</h3>
        <p className="text-sm text-gray-500">
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-medium text-gray-900">Lista uczniów</h2>
        <p className="text-sm text-gray-600 mt-1">
          Frekwencja na dzień <span className="font-medium">{formatDate(selectedDate)}</span>
        </p>
      </div>

      {/* Table Container - Responsive */}
      <div className="overflow-x-auto">
        <Table>
          {/* Sticky Header - Hidden on mobile, full on desktop */}
          <TableHeader className="bg-gray-50 sticky top-0 z-10">
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
                      ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400'
                      : isInactive
                        ? 'opacity-50 bg-gray-100'
                        : isPresent
                          ? 'bg-green-50 hover:bg-gray-50'
                          : 'hover:bg-gray-50'
                  }`}
                  data-testid={`row-student-${student.id}`}
                >
                  {/* Name column - combines first+last name on mobile, shows class badge */}
                  <TableCell className="font-medium" data-testid={`text-firstname-${student.id}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <div className="flex items-center gap-2">
                        {isPresent && !isInactive && !isPending && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                        {isPending && <span className="text-yellow-600">⏳</span>}
                        <span className={isPresent && !isInactive && !isPending ? 'text-green-700 font-semibold' : isPending ? 'text-yellow-800' : ''}>
                          <span className="md:hidden">{student.first_name} {student.last_name}</span>
                          <span className="hidden md:inline">{student.first_name}</span>
                        </span>
                      </div>
                      {/* Class badge on mobile - inline with name */}
                      <span className={`md:hidden inline-block text-xs font-medium px-1.5 py-0.5 rounded ${
                        isInactive ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {student.class || '--'}
                      </span>
                    </div>
                  </TableCell>
                  {/* Desktop: Separate last name column */}
                  <TableCell className="hidden md:table-cell" data-testid={`text-lastname-${student.id}`}>
                    <span className={isPresent && !isInactive && !isPending ? 'text-green-700 font-semibold' : isPending ? 'text-yellow-800' : ''}>
                      {student.last_name}
                    </span>
                  </TableCell>
                  {/* Desktop: Separate class column */}
                  <TableCell className="text-center hidden md:table-cell w-24" data-testid={`text-class-${student.id}`}>
                    <span className={`text-sm font-medium px-2 py-1 rounded-md ${
                      isInactive
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {student.class || '--'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center w-32 md:w-40">
                    {isPending ? (
                      <div className="flex flex-col items-center space-y-1 md:space-y-2">
                        <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 font-medium border border-yellow-400 text-xs md:text-sm">
                          ⏳ OCZEKUJE
                        </Badge>
                        <span className="text-xs text-yellow-700 hidden md:inline">
                          Wymaga zatwierdzenia
                        </span>
                      </div>
                    ) : isInactive ? (
                      <div className="flex flex-col items-center space-y-1 md:space-y-2">
                        <Badge variant="secondary" className="bg-gray-200 text-gray-600 font-medium text-xs md:text-sm">
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
                                : 'data-[state=unchecked]:bg-white border border-gray-300'
                            } data-[state=checked]:bg-red-500 hover:data-[state=checked]:bg-red-600`}
                            data-testid={`switch-inactive-attendance-${student.id}`}
                            aria-label={`Oznacz ${student.first_name} ${student.last_name} jako ${studentAttendance?.status === 'obecny' ? 'nieobecną' : 'obecną'}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500" data-testid={`status-text-${student.id}`}>
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
                              className="px-1.5 py-0.5 md:px-2 md:py-1 text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-300"
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
                            studentAttendance?.status === 'obecny' ? 'text-green-700' :
                            studentAttendance?.status === 'nieobecny' ? 'text-red-600' :
                            studentAttendance?.status === 'wypisani' ? 'text-gray-600' :
                            'text-red-600'
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
                      className={`p-1 md:p-2 ${isInactive ? 'text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
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
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex flex-col space-y-3">
          {/* Statistics Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
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
            <div className="text-sm text-gray-500" data-testid="text-last-saved">
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
