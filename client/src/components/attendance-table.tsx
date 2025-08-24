import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import type { Student, AttendanceItem } from "@shared/schema";
import { StudentDetailsModal } from './student-details-modal';

interface AttendanceTableProps {
  students: Student[];
  attendance: Map<string, AttendanceItem>;
  onAttendanceChange: (studentId: string, status: 'obecny' | 'nieobecny') => void;
  selectedDate: string;
  selectedGroup: string;
  selectedGroupName: string;
  onNotesUpdate: (studentId: string, notes: string) => void;
}

export function AttendanceTable({
  students,
  attendance,
  onAttendanceChange,
  selectedDate,
  selectedGroup,
  selectedGroupName,
  onNotesUpdate
}: AttendanceTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };
  // Liczenie tylko dla aktywnych uczniów
  const activeStudents = students.filter(s => s.active);
  const presentCount = Array.from(attendance.values()).filter(a => a.status === 'obecny').length;
  const absentCount = activeStudents.length - presentCount;

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

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto">
        <Table>
          {/* Sticky Header */}
          <TableHeader className="bg-gray-50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-left">Imię</TableHead>
              <TableHead className="text-left">Nazwisko</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Akcje</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {students.map((student) => {
              const studentAttendance = attendance.get(student.id);
              const isPresent = studentAttendance?.status === 'obecny';
              const isInactive = !student.active;

              return (
                <TableRow 
                  key={student.id} 
                  className={`transition-colors duration-150 ${
                    isInactive 
                      ? 'opacity-50 bg-gray-100' 
                      : isPresent 
                        ? 'bg-green-50 hover:bg-gray-50' 
                        : 'hover:bg-gray-50'
                  }`}
                  data-testid={`row-student-${student.id}`}
                >
                  <TableCell className="font-medium" data-testid={`text-firstname-${student.id}`}>
                    <div className="flex items-center">
                      {isPresent && !isInactive && <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>}
                      <span className={isPresent && !isInactive ? 'text-green-700 font-semibold' : ''}>
                        {student.first_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-lastname-${student.id}`}>
                    <span className={isPresent && !isInactive ? 'text-green-700 font-semibold' : ''}>
                      {student.last_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {isInactive ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Badge variant="secondary" className="bg-gray-200 text-gray-600 font-medium">
                          WYPISANY
                        </Badge>
                        <span className="text-xs text-gray-500" data-testid={`status-text-${student.id}`}>
                          Nieaktywny
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <Switch
                          checked={isPresent}
                          onCheckedChange={(checked) => 
                            onAttendanceChange(student.id, checked ? 'obecny' : 'nieobecny')
                          }
                          className={`transition-colors duration-200 ${
                            isPresent 
                              ? 'data-[state=checked]:bg-green-600 bg-green-600' 
                              : 'data-[state=unchecked]:bg-red-500 bg-red-500'
                          }`}
                          data-testid={`switch-attendance-${student.id}`}
                          aria-label={`Oznacz ${student.first_name} ${student.last_name} jako ${isPresent ? 'nieobecną' : 'obecną'}`}
                        />
                        <span 
                          className={`text-xs font-medium ${
                            isPresent ? 'text-green-700' : 'text-red-600'
                          }`}
                          data-testid={`status-text-${student.id}`}
                        >
                          {isPresent ? 'Obecny/a' : 'Nieobecny/a'}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${isInactive ? 'text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
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

      {/* Table Footer with Summary */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
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
          </div>
          <div className="text-sm text-gray-500" data-testid="text-last-saved">
            Ostatnio zapisano: <span className="font-medium">--</span>
          </div>
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
    </div>
  );
}
